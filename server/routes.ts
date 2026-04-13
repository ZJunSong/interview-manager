import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './data';
import { STAGE_NAMES } from './types';
import type { StageStatus } from './types';

const router = Router();

// GET /api/interviews
router.get('/', async (_req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '加载数据失败' });
  }
});

// POST /api/interviews
router.post('/', async (req, res) => {
  try {
    const { company, position } = req.body;
    if (!company || !position) {
      return res.status(400).json({ error: '公司名称和职位不能为空' });
    }

    const interview = {
      id: uuidv4(),
      company,
      position,
      stages: STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      })),
      createdAt: new Date().toISOString()
    };

    const data = await readData();
    data.push(interview);
    await writeData(data);
    res.status(201).json(interview);
  } catch (err) {
    res.status(500).json({ error: '添加失败' });
  }
});

// PATCH /api/interviews/:id/stage
router.patch('/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stageIndex, status } = req.body as { stageIndex: number; status: StageStatus };

    if (typeof stageIndex !== 'number' || stageIndex < 0 || stageIndex > 9) {
      return res.status(400).json({ error: '阶段索引无效' });
    }

    const validStatuses: StageStatus[] = ['pending', 'current', 'pass', 'fail', 'rejected', 'skip'];
    if (!validStatuses.includes(status)) {
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
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /api/interviews/:id
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
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
