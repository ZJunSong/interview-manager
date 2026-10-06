import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './database';
import { authMiddleware, adminMiddleware, AuthRequest } from './middleware';
import { JWT_SECRET } from './config';

const router = Router();

const JWT_EXPIRES_IN = '7d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    
    const trimmedUsername = username.trim().toLowerCase();
    const db = getDatabase();
    
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername);
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(trimmedUsername, passwordHash, 'user');
    
    const token = jwt.sign(
      { userId: result.lastInsertRowid, username: trimmedUsername, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: { id: result.lastInsertRowid, username: trimmedUsername, role: 'user' }
    });
  } catch (err) {
    console.error('[POST /register] 注册失败:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const trimmedUsername = username.trim().toLowerCase();
    const db = getDatabase();
    
    const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(trimmedUsername) as {
      id: number;
      username: string;
      password_hash: string;
      role: string;
    } | undefined;
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('[POST /login] 登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user!.userId) as any;
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role, createdAt: user.created_at }
  });
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请提供旧密码和新密码' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少需要6个字符' });
    }
    
    const db = getDatabase();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string };
    
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(passwordHash, req.user!.userId);
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('[PUT /password] 修改密码失败:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// ========== 管理员 API ==========

// GET /api/auth/users - 获取所有用户
router.get('/users', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.created_at AS createdAt, u.updated_at AS updatedAt,
           (SELECT COUNT(*) FROM interviews WHERE user_id = u.id) AS interviewCount
    FROM users u
    ORDER BY u.created_at DESC
  `).all();
  
  res.json({ success: true, users });
});

// DELETE /api/auth/users/:id - 删除用户
router.delete('/users/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const db = getDatabase();
  
  if (parseInt(id) === req.user!.userId) {
    return res.status(400).json({ error: '不能删除自己' });
  }
  
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json({ success: true, message: '用户已删除' });
});

// PUT /api/auth/users/:id/role - 修改用户角色
router.put('/users/:id/role', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { role } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }
  
  const db = getDatabase();
  
  if (parseInt(id) === req.user!.userId) {
    return res.status(400).json({ error: '不能修改自己的角色' });
  }
  
  const result = db.prepare("UPDATE users SET role = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(role, id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json({ success: true, message: '角色已更新' });
});

export default router;
