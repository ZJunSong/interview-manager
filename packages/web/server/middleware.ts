import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config';
import { getDatabase } from './database';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; role: string };

    // 校验用户仍然存在：用户被删除后，其签发的 JWT 在过期前依然合法，
    // 若不拦截会产生 user_id 悬空的孤儿数据
    const exists = getDatabase().prepare('SELECT 1 FROM users WHERE id = ?').get(decoded.userId);
    if (!exists) {
      res.status(401).json({ error: '用户不存在或已被删除' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    res.status(401).json({ error: '登录已过期' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}
