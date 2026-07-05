import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './data';
import { STAGE_NAMES } from './types';
import type { StageStatus, Interview } from './types';

const router = Router();

const MAX_COMPANY_LEN = 100;
const MAX_POSITION_LEN = 100;
const VALID_STATUSES: StageStatus[] = ['pending', 'current', 'pass', 'fail', 'rejected', 'skip'];
const VALID_STATUS_SET = new Set<string>(VALID_STATUSES);

function sanitize(str: unknown): string | null {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMPANY_LEN) return null;
  return trimmed;
}

// GET /api/interviews/health — 健康检查
router.get('/health', async (_req, res) => {
  try {
    const data = await readData();
    res.json({ status: 'ok', count: data.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[GET /health] 健康检查失败:', err);
    res.status(500).json({ status: 'error', error: '服务异常' });
  }
});

// GET /api/interviews — 获取所有记录
router.get('/', async (_req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    console.error('[GET /] 读取数据失败:', err);
    res.status(500).json({ error: '加载数据失败' });
  }
});

// GET /api/interviews/export — 导出所有数据为 JSON 文件
// 注意：此路由必须在 /:id 路由之前注册，否则 "export" 会被当作 id
router.get('/export', async (_req, res) => {
  try {
    const data = await readData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=interviews-export.json');
    res.json(data);
  } catch (err) {
    console.error('[GET /export] 导出数据失败:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// POST /api/interviews — 新增面试记录
router.post('/', async (req, res) => {
  try {
    const { company: rawCompany, position: rawPosition } = req.body;
    const company = sanitize(rawCompany);
    const position = typeof rawPosition === 'string' ? rawPosition.trim() : '';

    if (!company) {
      return res.status(400).json({ error: '公司名称不能为空或超过100字符' });
    }
    if (!position || position.length > MAX_POSITION_LEN) {
      return res.status(400).json({ error: '职位名称不能为空或超过100字符' });
    }

    const now = new Date().toISOString();
    const interview: Interview = {
      id: uuidv4(),
      company,
      position,
      stages: STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      })),
      createdAt: now,
      updatedAt: now
    };

    const data = await readData();
    data.push(interview);
    await writeData(data);
    res.status(201).json(interview);
  } catch (err) {
    console.error('[POST /] 添加面试记录失败:', err);
    res.status(500).json({ error: '添加失败' });
  }
});

// POST /api/interviews/import — 从 JSON 导入数据（合并去重，不覆盖已有）
// 注意：此路由必须在 /:id 路由之前注册
router.post('/import', async (req, res) => {
  try {
    const imported = req.body as unknown;
    if (!Array.isArray(imported)) {
      return res.status(400).json({ error: '导入数据格式无效，应为数组' });
    }

    // 验证每条记录的基本结构及阶段状态合法性
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
    // 验证通过后断言为 Interview[]
    const validated = imported as Interview[];

    const data = await readData();
    const existingIds = new Set(data.map(i => i.id));
    const existingCompanies = new Set(data.map(i => `${i.company}|${i.position}`));

    let importedCount = 0;
    for (const item of validated) {
      // 去重：按 id 或 company+position
      if (item.id && existingIds.has(item.id)) continue;
      const key = `${item.company}|${item.position}`;
      if (existingCompanies.has(key)) continue;

      const now = new Date().toISOString();
      // 确保新记录始终有可用 id，并正确登记到去重集合
      const newId = item.id || uuidv4();
      data.push({
        id: newId,
        company: item.company.trim(),
        position: item.position.trim(),
        stages: item.stages.map(s => ({ name: s.name, status: s.status })),
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now
      });
      existingIds.add(newId);
      existingCompanies.add(key);
      importedCount++;
    }

    await writeData(data);
    res.json({ success: true, count: importedCount });
  } catch (err) {
    console.error('[POST /import] 导入数据失败:', err);
    res.status(500).json({ error: '导入失败' });
  }
});

// PATCH /api/interviews/:id — 更新公司名和职位
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company: rawCompany, position: rawPosition } = req.body;
    const company = sanitize(rawCompany);
    const position = typeof rawPosition === 'string' ? rawPosition.trim() : '';

    if (!company) {
      return res.status(400).json({ error: '公司名称不能为空或超过100字符' });
    }
    if (!position || position.length > MAX_POSITION_LEN) {
      return res.status(400).json({ error: '职位名称不能为空或超过100字符' });
    }

    const data = await readData();
    const interview = data.find(i => i.id === id);
    if (!interview) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }

    interview.company = company;
    interview.position = position;
    interview.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(interview);
  } catch (err) {
    console.error(`[PATCH /:id] 更新面试记录失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '更新失败' });
  }
});

// PATCH /api/interviews/:id/stage — 更新阶段状态
router.patch('/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stageIndex, status } = req.body as { stageIndex: number; status: StageStatus };

    if (typeof stageIndex !== 'number' || stageIndex < 0 || stageIndex > 9) {
      return res.status(400).json({ error: '阶段索引无效' });
    }

    if (!VALID_STATUS_SET.has(status)) {
      return res.status(400).json({ error: '状态值无效' });
    }

    const data = await readData();
    const interview = data.find(i => i.id === id);
    if (!interview) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }

    if (interview.stages[stageIndex].status !== 'current') {
      return res.status(400).json({ error: '只能操作当前阶段' });
    }

    interview.stages[stageIndex].status = status;
    interview.updatedAt = new Date().toISOString();

    // pass 或 skip → 自动推进到下一个 pending 阶段
    if (status === 'pass' || status === 'skip') {
      const nextPending = interview.stages.findIndex(s => s.status === 'pending');
      if (nextPending !== -1) {
        interview.stages[nextPending].status = 'current';
      }
    }

    await writeData(data);
    res.json(interview);
  } catch (err) {
    console.error(`[PATCH /:id/stage] 更新阶段失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /api/interviews/:id — 删除面试记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const index = data.findIndex(i => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '未找到该面试记录' });
    }

    data.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /:id] 删除面试记录失败 (id=${req.params.id}):`, err);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
