import crypto from 'crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = (crypto as any).webcrypto || crypto;
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase } from './db/schema';

import authRoutes from './routes/authRoutes';
import workerRoutes from './routes/workerRoutes';
import insuranceRoutes from './routes/insuranceRoutes';
import bookingRoutes from './routes/bookingRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'TASK UNITY',
    tagline: 'A cooperative-owned digital ecosystem for verified local skilled workers',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(Number(PORT), () => {
      console.log(`====================================================`);
      console.log(`TASK UNITY API Server running at http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
      console.log(`Cooperative platform initialized.`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Fatal: Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
