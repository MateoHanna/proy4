require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();

const PORT = process.env.PORT || 3000;

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
  .catch((error) => {
    console.error('❌ Error de conexión a MongoDB:', error.message);
  });

app.get('/', (req, res) => {
  res.send('API para Flutter activa.');
});

const employeeRoutes = require('./routes/employeeRoutes');
app.use('/api/employees', employeeRoutes);
