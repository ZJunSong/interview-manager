import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase, closeDatabase } from './database';
import authRoutes from './auth';
import interviewRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Public health check (no auth required, for Docker/k8s)
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Interview routes (auth required)
app.use('/api/interviews', interviewRoutes);

// Unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  });
}

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
    // Graceful shutdown
    function shutdown(signal: string) {
      console.log(`\n收到 ${signal}，正在关闭服务器…`);
      closeDatabase();
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000).unref();
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
