import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// 限制请求体大小，避免超大 payload 造成内存压力
app.use(express.json({ limit: '1mb' }));
app.use('/api/interviews', routes);

// 未知 API 路由统一返回 404 JSON，避免被静态文件兜底吞掉
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

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 优雅关闭：收到信号后停止接收新连接，等待进行中的请求结束
function shutdown(signal: string) {
  console.log(`\n收到 ${signal}，正在关闭服务器…`);
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
  // 兜底：5 秒后强制退出，防止连接未关闭导致进程挂起
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
