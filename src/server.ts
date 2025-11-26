import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import employeeRoutes from './routes/employeeRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

app.use(express.json());

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error: Error) => {
    console.error('❌ Error de conexión a MongoDB:', error.message);
  });

app.get('/', (_req: Request, res: Response) => {
  res.send('API para Flutter activa.');
});

app.use('/api/employees', employeeRoutes);
