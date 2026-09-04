import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { authMiddleware, adminMiddleware, AuthRequest } from './middleware';

const router = Router();
router.use(authMiddleware);

const MAX_COMPANY_LEN = 100;
const MAX_POSITION_LEN = 100;
const VALID_STATUSES = ['pending', 'current', 'pass', 'fail', 'rejected', 'skip'];
const VALID_STATUS_SET = new Set<string>(VALID_STATUSES);

const STAGE_NAMES = [
  '投递', '测评', '笔试', '简历评估', '一面',
  '二面', '三面', 'HR面', 'Offer评估', '正式offer'
];

function sanitize(str: unknown): string | null {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMPANY_LEN) return null;
  return trimmed;
}

// GET /api/interviews/health
router.get('/health', (req: AuthRequest, res) => {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM interviews WHERE user_id = ?').get(req.user!.userId) as { count: number };
  res.json({ 
    status: 'ok', 
    count: result.count, 
    timestamp: new Date().toISOString(),
    user: req.user!.username
  });
});

// GET /api/interviews
router.get('/', (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.userId) as any[];
    
    const interviews = rows.map(row => ({
      id: row.id,
      company: row.company,
      position: row.position,
      stages: JSON.parse(row.stages),
      status: row.status,
      url: row.url || undefined,
      lastVisitedAt: row.last_visited_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(interviews);
  } catch (err) {
    console.error('[GET /] 读取数据失败:', err);
    res.status(500).json({ error: '加载数据失败' });
  }
});

// GET /api/interviews/export
router.get('/export', (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM interviews WHERE user_id = ?').all(req.user!.userId) as any[];
    
    const interviews = rows.map(row => ({
      id: row.id,
      company: row.company,
      position: row.position,
      stages: JSON.parse(row.stages),
      status: row.status,
      url: row.url || undefined,
      lastVisitedAt: row.last_visited_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=interviews-export.json');
    res.json(interviews);
  } catch (err) {
    console.error('[GET /export] 导出数据失败:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// POST /api/interviews
router.post('/', (req: AuthRequest, res) => {
  try {
    const { company: rawCompany, position: rawPosition, url: rawUrl } = req.body;
    const company = sanitize(rawCompany);
    const position = typeof rawPosition === 'string' ? rawPosition.trim() : '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    
    if (!company) {
      return res.status(400).json({ error: '公司名称不能为空或超过100字符' });
    }
    if (!position || position.length > MAX_POSITION_LEN) {
      return res.status(400).json({ error: '职位名称不能为空或超过100字符' });
    }
    
    const now = new Date().toISOString();
    const id = uuidv4();
    const stages = STAGE_NAMES.map((name, i) => ({
      name,
      status: (i === 0 ? 'current' : 'pending')
    }));
    
    const db = getDatabase();
    db.prepare(`
      INSERT INTO interviews (id, user_id, company, position, stages, status, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.userId, company, position, JSON.stringify(stages), 'active', url || null, now, now);
    
    res.status(201).json({
      id,
      company,
      position,
      stages,
      status: 'active',
      url: url || undefined,
      createdAt: now,
      updatedAt: now
    });
  } catch (err) {
    console.error('[POST /] 添加面试记录失败:', err);
    res.status(500).json({ error: '添加失败' });
  }
});

// POST /api/interviews/import
router.post('/import', (req: AuthRequest, res) => {
  try {
    const { data: imported, mode = 'merge' } = req.body;
    
    if (!Array.isArray(imported)) {
      return res.status(400).json({ error: '导入数据格式无效，应为数组' });
    }
    
    for (const item of imported) {
      if (!item || typeof item !== 'object' ||
          typeof item.company !== 'string' || typeof item.position !== 'string' ||
          !Array.isArray(item.stages) || item.stages.length !== 10) {
        return res.status(400).json({ error: '导入数据结构不完整' });
      }
      for (const s of item.stages) {
        if (!s || typeof s.name !== 'string' || !VALID_STATUS_SET.has(s.status)) {
          return res.status(400).json({ error: '导入数据包含无效的阶段状态' });
        }
      }
    }
    
    const db = getDatabase();
    
    if (mode === 'overwrite') {
      db.prepare('DELETE FROM interviews WHERE user_id = ?').run(req.user!.userId);
    }
    
    const existingRows = db.prepare('SELECT id FROM interviews WHERE user_id = ?').all(req.user!.userId) as { id: string }[];
    const existingIds = new Set(existingRows.map(r => r.id));
    
    let importedCount = 0;
    const insertStmt = db.prepare(`
      INSERT INTO interviews (id, user_id, company, position, stages, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of imported) {
      const newId = item.id || uuidv4();
      if (existingIds.has(newId)) continue;
      
      const now = new Date().toISOString();
      insertStmt.run(
        newId,
        req.user!.userId,
        item.company.trim(),
        item.position.trim(),
        JSON.stringify(item.stages),
        item.status || 'active',
        item.createdAt || now,
        item.updatedAt || now
      );
      
      existingIds.add(newId);
      importedCount++;
    }
    
    res.json({ success: true, count: importedCount });
  } catch (err) {
    console.error('[POST /import] 导入数据失败:', err);
    res.status(500).json({ error: '导入失败' });
  }
});

// PATCH /api/interviews/:id
router.patch('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { company: rawCompany, position: rawPosition, url: rawUrl } = req.body;
    const company = sanitize(rawCompany);
    const position = typeof rawPosition === 'string' ? rawPosition.trim() : '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    
    if (!company) {
      return res.status(400).json({ error: '公司名称不能为空或超过100字符' });
    }
    if (!position || position.length > MAX_POSITION_LEN) {
      return res.status(400).json({ error: '职位名称不能为空或超过100字符' });
    }
    
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM interviews WHERE id = ? AND user_id = ?').get(id, req.user!.userId) as any;
    
    if (!row) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }
    
    const now = new Date().toISOString();
    db.prepare('UPDATE interviews SET company = ?, position = ?, url = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(company, position, url || null, now, id, req.user!.userId);
    
    res.json({
      id,
      company,
      position,
      stages: JSON.parse(row.stages),
      status: row.status,
      url: url || undefined,
      lastVisitedAt: row.last_visited_at || undefined,
      createdAt: row.created_at,
      updatedAt: now
    });
  } catch (err) {
    console.error(`[PATCH /:id] 更新面试记录失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '更新失败' });
  }
});

// PATCH /api/interviews/:id/stage
router.patch('/:id/stage', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { stageIndex, status } = req.body;
    
    if (typeof stageIndex !== 'number' || stageIndex < 0 || stageIndex > 9) {
      return res.status(400).json({ error: '阶段索引无效' });
    }
    
    if (!VALID_STATUS_SET.has(status)) {
      return res.status(400).json({ error: '状态值无效' });
    }
    
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM interviews WHERE id = ? AND user_id = ?').get(id, req.user!.userId) as any;
    
    if (!row) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }
    
    const stages = JSON.parse(row.stages);
    
    if (stages[stageIndex].status !== 'current') {
      return res.status(400).json({ error: '只能操作当前阶段' });
    }
    
    stages[stageIndex].status = status;
    
    if (status === 'pass' || status === 'skip') {
      const nextPending = stages.findIndex((s: any) => s.status === 'pending');
      if (nextPending !== -1) {
        stages[nextPending].status = 'current';
      }
    }
    
    const now = new Date().toISOString();
    db.prepare('UPDATE interviews SET stages = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(JSON.stringify(stages), now, id, req.user!.userId);
    
    res.json({
      id,
      company: row.company,
      position: row.position,
      stages,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: now
    });
  } catch (err) {
    console.error(`[PATCH /:id/stage] 更新阶段失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '更新失败' });
  }
});

// POST /api/interviews/:id/visit - 记录访问时间
router.post('/:id/visit', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM interviews WHERE id = ? AND user_id = ?').get(id, req.user!.userId) as any;
    
    if (!row) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }
    
    const now = new Date().toISOString();
    db.prepare('UPDATE interviews SET last_visited_at = ? WHERE id = ? AND user_id = ?')
      .run(now, id, req.user!.userId);
    
    res.json({
      id,
      lastVisitedAt: now
    });
  } catch (err) {
    console.error(`[POST /:id/visit] 记录访问时间失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '记录访问时间失败' });
  }
});

// DELETE /api/interviews/:id
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM interviews WHERE id = ? AND user_id = ?').run(id, req.user!.userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /:id] 删除面试记录失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ========== 管理员 API ==========

// GET /api/interviews/admin/all - 获取所有用户的面试记录
router.get('/admin/all', adminMiddleware, (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT i.*, u.username 
      FROM interviews i 
      JOIN users u ON i.user_id = u.id 
      ORDER BY i.created_at DESC
    `).all() as any[];
    
    const interviews = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      company: row.company,
      position: row.position,
      stages: JSON.parse(row.stages),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(interviews);
  } catch (err) {
    console.error('[GET /admin/all] 读取数据失败:', err);
    res.status(500).json({ error: '加载数据失败' });
  }
});

// GET /api/interviews/admin/stats - 获取统计数据
router.get('/admin/stats', adminMiddleware, (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalInterviews = db.prepare('SELECT COUNT(*) as count FROM interviews').get() as { count: number };
    const activeInterviews = db.prepare("SELECT COUNT(*) as count FROM interviews WHERE status = 'active'").get() as { count: number };
    const archivedInterviews = db.prepare("SELECT COUNT(*) as count FROM interviews WHERE status = 'archived'").get() as { count: number };
    
    const recentUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime("now", "-7 days", "localtime")').get() as { count: number };
    const recentInterviews = db.prepare('SELECT COUNT(*) as count FROM interviews WHERE created_at >= datetime("now", "-7 days", "localtime")').get() as { count: number };
    
    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.count,
        totalInterviews: totalInterviews.count,
        activeInterviews: activeInterviews.count,
        archivedInterviews: archivedInterviews.count,
        recentUsers: recentUsers.count,
        recentInterviews: recentInterviews.count
      }
    });
  } catch (err) {
    console.error('[GET /admin/stats] 获取统计数据失败:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;
