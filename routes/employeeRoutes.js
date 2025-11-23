const express = require('express');
const Employee = require('../models/Employee');
const EmployeeHistory = require('../models/EmployeeHistory');

const router = express.Router();

const buildChanges = (currentDoc, updates) => {
  const changes = [];
  Object.keys(updates).forEach((key) => {
    if (['createdAt', 'updatedAt', '_id', '__v'].includes(key)) return;
    const currentValue = currentDoc[key];
    const newValue = updates[key];
    const bothDates = currentValue instanceof Date || newValue instanceof Date;

    const normalizedCurrent = bothDates && currentValue ? new Date(currentValue).toISOString() : currentValue;
    const normalizedNew = bothDates && newValue ? new Date(newValue).toISOString() : newValue;

    if (normalizedCurrent !== normalizedNew) {
      changes.push({ field: key, from: currentValue, to: newValue });
    }
  });
  return changes;
};

const logHistory = async ({ employeeId, action, changes, performedBy }) => {
  if (!changes.length && action === 'actualizar') return;
  await EmployeeHistory.create({
    employee: employeeId,
    action,
    changes,
    performedBy: performedBy || 'sistema'
  });
};

router.post('/', async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    await logHistory({
      employeeId: employee._id,
      action: 'crear',
      changes: Object.keys(req.body).map((key) => ({ field: key, from: null, to: req.body[key] })),
      performedBy: req.body.performedBy
    });
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  const { area, status } = req.query;
  const filter = {};
  if (area) filter.area = area;
  if (status) filter.status = status;

  try {
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/export', async (req, res) => {
  const { format = 'csv', area, status } = req.query;
  const filter = {};
  if (area) filter.area = area;
  if (status) filter.status = status;

  try {
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    if (!employees.length) {
      return res.status(404).json({ message: 'No hay empleados para exportar' });
    }

    if (format === 'pdf') {
      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (err) {
        return res.status(503).json({
          message: 'Exportación a PDF no disponible: instale la dependencia opcional pdfkit.',
          detail: err.message
        });
      }

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="empleados.pdf"');
      doc.pipe(res);

      doc.fontSize(18).text('Listado de empleados', { underline: true });
      doc.moveDown();

      employees.forEach((emp) => {
        doc
          .fontSize(12)
          .text(`Nombre: ${emp.firstName} ${emp.lastName}`)
          .text(`Email: ${emp.email}`)
          .text(`Área: ${emp.area}`)
          .text(`Puesto: ${emp.position}`)
          .text(`Estatus: ${emp.status}`)
          .text(`Ingreso: ${emp.hireDate.toISOString().slice(0, 10)}`)
          .moveDown();
      });

      doc.end();
    } else {
      const headers = ['Nombre', 'Apellido', 'Email', 'Area', 'Puesto', 'Estatus', 'Ingreso'];
      const csvLines = [headers.join(',')];
      employees.forEach((emp) => {
        csvLines.push(
          [
            emp.firstName,
            emp.lastName,
            emp.email,
            emp.area,
            emp.position,
            emp.status,
            emp.hireDate.toISOString()
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(',')
        );
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="empleados.csv"');
      res.send(csvLines.join('\n'));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const history = await EmployeeHistory.find({ employee: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
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
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id/deactivate', async (req, res) => {
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
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
