const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit'); 
const userRoutes = require('./routes/userRoutes.js');
const employeeRoutes = require('./routes/employeeRoutes.js');
const pointageRoutes = require('./routes/pointageRoutes.js');
const congeRoutes = require('./routes/congeRoutes.js');
const configRoutes = require('./routes/configRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const payslipRoutes = require('./routes/payslipRoutes.js'); 
const { errorHandler } = require('./middlewares/errorHandler.js'); 
const { upload, uploadImage } = require('./controllers/uploadController.js');

dotenv.config();

const app = express();

const corsOptions = {
  origin: ['http://adresse ipv4 de votre réseau:3000', 'http://localhost:3000'], 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: 'Votre adresse IP a effectué trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
});

app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/pointages', pointageRoutes);
app.use('/api/conges', congeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payslip', payslipRoutes); 

app.use('/payslips', express.static('payslips'));

app.post('/api/upload', upload.single('photo'), uploadImage);

app.get('/', (req, res) => {
  res.send('L\'API est lancé...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Le serveur est lancé sur le port ${PORT}`);
});