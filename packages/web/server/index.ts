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

// 公开健康检查
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth 路由（无需认证）
app.use('/api/auth', authRoutes);

// Interview 路由（需要认证）
app.use('/api/interviews', interviewRoutes);

// 未知 API 路由
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 生产环境：静态文件服务
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  });
}

async function start() {
  try {
    await initDatabase();
    console.log('[Server] 数据库已初始化');
    
    const server = app.listen(PORT, () => {
      console.log(`[Server] 运行在 http://localhost:${PORT}`);
    });
    
    function shutdown(signal: string) {
      console.log(`\n[Server] 收到 ${signal}，正在关闭...`);
      closeDatabase();
      server.close(() => {
        console.log('[Server] 已关闭');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000).unref();
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] 启动失败:', err);
    process.exit(1);
  }
}

start();
