# API de empleados para Flutter

API REST en Node.js/Express con MongoDB y TypeScript para gestionar empleados (alta, edición, baja, filtros, exportación CSV/PDF e historial de cambios).

## Configuración de base de datos

El servidor toma la cadena de conexión desde la variable de entorno `MONGODB_URI`. Si no está definida, se conectará automáticamente a la base local solicitada:

```
mongodb://localhost:27017
```

Si deseas usar otra base, crea un archivo `.env` en la raíz con tu propia URL:

```
MONGODB_URI=mongodb+srv://usuario:password@host/base?retryWrites=true&w=majority
```

## Scripts disponibles

- `npm install` para instalar dependencias (PDF es opcional mediante `pdfkit`).
- `npm run build` para compilar TypeScript a JavaScript en `dist/`.
- `npm run dev` para correr en modo desarrollo con recarga automática.
- `npm start` para producción (requiere haber ejecutado `npm run build`).

## Endpoints principales

- `POST /api/employees` registrar empleado.
- `GET /api/employees?area=...&status=...` listar y filtrar.
- `GET /api/employees/export?format=csv|pdf` exportar.
- `GET /api/employees/:id/history` historial de modificaciones.
- `PUT /api/employees/:id` actualizar.
- `PUT /api/employees/:id/deactivate` dar de baja.
