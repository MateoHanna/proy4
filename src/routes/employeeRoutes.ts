import { Request, Response, Router } from 'express';
import { Types } from 'mongoose';
import Employee, {
  EmployeeDocument,
  EmployeeInput,
  EmployeeStatus
} from '../models/Employee';
import EmployeeHistory, {
  ChangeEntry,
  EmployeeHistoryAction
} from '../models/EmployeeHistory';

type UpdatePayload = Partial<EmployeeInput> & { performedBy?: string };

type ExportFormat = 'csv' | 'pdf';

type ExportQuery = {
  area?: string;
  status?: EmployeeStatus;
  format?: ExportFormat;
};

const router = Router();

const shouldSkipField = (key: string) => ['createdAt', 'updatedAt', '_id', '__v'].includes(key);

const buildChanges = (currentDoc: EmployeeDocument, updates: UpdatePayload): ChangeEntry[] => {
  const changes: ChangeEntry[] = [];
  Object.keys(updates).forEach((key) => {
    if (shouldSkipField(key)) return;
    const currentValue = currentDoc.get(key);
    const newValue = updates[key as keyof UpdatePayload];

    const involvesDate = currentValue instanceof Date || newValue instanceof Date;
    const normalizedCurrent = involvesDate && currentValue ? new Date(currentValue).toISOString() : currentValue;
    const normalizedNew = involvesDate && newValue ? new Date(newValue as Date).toISOString() : newValue;

    if (normalizedCurrent !== normalizedNew) {
      changes.push({ field: key, from: currentValue, to: newValue });
    }
  });
  return changes;
};

const logHistory = async ({
  employeeId,
  action,
  changes,
  performedBy
}: {
  employeeId: Types.ObjectId;
  action: EmployeeHistoryAction;
  changes: ChangeEntry[];
  performedBy?: string;
}) => {
  if (!changes.length && action === 'actualizar') return;
  await EmployeeHistory.create({
    employee: employeeId,
    action,
    changes,
    performedBy: performedBy || 'sistema'
  });
};

const sanitizeCsvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

router.post('/', async (req: Request<unknown, unknown, UpdatePayload>, res: Response) => {
  try {
    const employee = await Employee.create(req.body);
    await logHistory({
      employeeId: employee._id,
      action: 'crear',
      changes: Object.keys(req.body).map((key) => ({ field: key, from: null, to: req.body[key as keyof UpdatePayload] })),
      performedBy: req.body.performedBy
    });
    res.status(201).json(employee);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear empleado';
    res.status(400).json({ message });
  }
});

router.get('/', async (req: Request<unknown, unknown, unknown, ExportQuery>, res: Response) => {
  const { area, status } = req.query;
  const filter: Record<string, string> = {};
  if (area) filter.area = area;
  if (status) filter.status = status;

  try {
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener empleados';
    res.status(500).json({ message });
  }
});

router.get('/export', async (req: Request<unknown, unknown, unknown, ExportQuery>, res: Response) => {
  const { area, status } = req.query;
  const format: ExportFormat = req.query.format === 'pdf' ? 'pdf' : 'csv';
  const filter: Record<string, string> = {};
  if (area) filter.area = area;
  if (status) filter.status = status;

  try {
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    if (!employees.length) {
      return res.status(404).json({ message: 'No hay empleados para exportar' });
    }

    if (format === 'pdf') {
      const pdfModule = await import('pdfkit').catch((err: Error) => {
        res.status(503).json({
          message: 'Exportación a PDF no disponible: instale la dependencia opcional pdfkit.',
          detail: err.message
        });
        return null;
      });

      if (!pdfModule) return;

      const PDFDocument = (pdfModule as { default?: any }).default || pdfModule;
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="empleados.pdf"');
      doc.pipe(res);

      doc.fontSize(18).text('Listado de empleados', { underline: true });
      doc.moveDown();

      employees.forEach((emp) => {
        const hireDate = emp.hireDate instanceof Date ? emp.hireDate.toISOString().slice(0, 10) : '';
        doc
          .fontSize(12)
          .text(`Nombre: ${emp.firstName} ${emp.lastName}`)
          .text(`Email: ${emp.email}`)
          .text(`Área: ${emp.area}`)
          .text(`Puesto: ${emp.position}`)
          .text(`Estatus: ${emp.status}`)
          .text(`Ingreso: ${hireDate}`)
          .moveDown();
      });

      doc.end();
    } else {
      const headers = ['Nombre', 'Apellido', 'Email', 'Area', 'Puesto', 'Estatus', 'Ingreso'];
      const csvLines = [headers.join(',')];
      employees.forEach((emp) => {
        const hireDate = emp.hireDate instanceof Date ? emp.hireDate.toISOString() : '';
        csvLines.push(
          [emp.firstName, emp.lastName, emp.email, emp.area, emp.position, emp.status, hireDate]
            .map(sanitizeCsvValue)
            .join(',')
        );
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="empleados.csv"');
      res.send(csvLines.join('\n'));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al exportar empleados';
    res.status(500).json({ message });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await EmployeeHistory.find({ employee: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener historial';
    res.status(500).json({ message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(employee);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener empleado';
    res.status(500).json({ message });
  }
});

router.put('/:id', async (req: Request<{ id: string }, unknown, UpdatePayload>, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Empleado no encontrado' });

    const changes = buildChanges(employee, req.body);
    Object.assign(employee, req.body);
    await employee.save();

    await logHistory({
      employeeId: employee._id,
      action: 'actualizar',
      changes,
      performedBy: req.body.performedBy
    });

    res.json(employee);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar empleado';
    res.status(400).json({ message });
  }
});

router.put('/:id/deactivate', async (req: Request<{ id: string }, unknown, UpdatePayload>, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Empleado no encontrado' });
    if (employee.status === 'inactivo') return res.status(200).json(employee);

    employee.status = 'inactivo';
    employee.deactivatedAt = new Date();
    await employee.save();

    await logHistory({
      employeeId: employee._id,
      action: 'baja',
      changes: [{ field: 'status', from: 'activo', to: 'inactivo' }],
      performedBy: req.body.performedBy
    });

    res.json(employee);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al dar de baja empleado';
    res.status(400).json({ message });
  }
});

export default router;
