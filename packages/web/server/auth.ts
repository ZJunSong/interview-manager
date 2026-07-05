import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './database';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'interview-manager-secret-key-change-in-production';
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
    
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername);
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(trimmedUsername, passwordHash);
    
    // Generate token
    const token = jwt.sign(
      { userId: result.lastInsertRowid, username: trimmedUsername },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.lastInsertRowid,
        username: trimmedUsername
      }
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
    
    // Find user
    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(trimmedUsername) as {
      id: number;
      username: string;
      password_hash: string;
    } | undefined;
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error('[POST /login] 登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    res.json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username
      }
    });
  } catch (err) {
    res.status(401).json({ error: '登录已过期' });
  }
});

export default router;
export { JWT_SECRET };
