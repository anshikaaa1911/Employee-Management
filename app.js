const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const dbConnect = require('./config/db');
const ensureSeedData = require('./config/seedData');
const authRoutes = require('./routes/api/authRoutes');
const goalRoutes = require('./routes/api/goalRoutes');
const managerRoutes = require('./routes/api/managerRoutes');
const adminRoutes = require('./routes/api/adminRoutes');
const teamRoutes = require('./routes/api/teamRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || (isProduction ? 'https://employee-management-0cu9.onrender.com/' : `http://localhost:${PORT}`);
const clientDist = path.join(__dirname, 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const initializeApp = async () => {
  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  await dbConnect();

  if (!isProduction || process.env.ALLOW_DEMO_SEED === 'true') {
    await ensureSeedData();
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/manager', managerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/reports', require('./routes/api/reportRoutes'));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      frontend: fs.existsSync(clientIndex) ? 'ready' : 'missing',
    });
  });

  app.use('/api', (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  console.log(`Serving frontend from ${clientDist}`);
  app.use(express.static(clientDist));

  app.get('*', (req, res) => {
    if (!fs.existsSync(clientIndex)) {
      return res.status(404).send('Frontend build not found. Run npm run build before starting the server.');
    }

    return res.sendFile(clientIndex);
  });

  const server = app.listen(PORT, () => {
    console.log(`Server running on ${APP_URL}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to another value in .env.`);
      process.exit(1);
    }
    throw error;
  });
};

initializeApp().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
