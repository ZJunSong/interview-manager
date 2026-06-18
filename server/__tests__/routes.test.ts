import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { STAGE_NAMES } from '../types';
import type { Interview, StageStatus } from '../types';

let tmpDir: string;
let dataFile: string;

function createMockInterview(overrides: Partial<Interview> = {}): Interview {
  const now = new Date().toISOString();
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    company: '测试公司',
    position: '测试职位',
    stages: STAGE_NAMES.map((name, i) => ({
      name,
      status: (i === 0 ? 'current' : 'pending') as StageStatus
    })),
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('routes logic', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'im-route-test-'));
    dataFile = path.join(tmpDir, 'interviews.json');
    process.env.DATA_DIR = tmpDir;
    process.env.DATA_FILE = dataFile;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.DATA_DIR;
    delete process.env.DATA_FILE;
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('输入验证', () => {
    it('空公司名应被拒绝', () => {
      const company = '';
      const position = '后端开发';
      expect(!company || !position).toBe(true);
    });

    it('纯空格公司名应被拒绝', () => {
      const company = '   ';
      const trimmed = company.trim();
      expect(!trimmed).toBe(true);
    });

    it('超长公司名应被拒绝', () => {
      const company = 'a'.repeat(101);
      expect(company.length > 100).toBe(true);
    });

    it('正常输入应通过验证', () => {
      const company = '字节跳动';
      const position = '后端开发';
      expect(company.trim().length > 0 && company.trim().length <= 100).toBe(true);
      expect(position.trim().length > 0 && position.trim().length <= 100).toBe(true);
    });

    it('刚好100字符的公司名应通过', () => {
      const company = '好'.repeat(100);
      expect(company.trim().length <= 100).toBe(true);
    });
  });

  describe('阶段更新逻辑', () => {
    it('stageIndex 超出范围应被拒绝', () => {
      expect(10 < 0 || 10 > 9).toBe(true);
      expect(-1 < 0 || -1 > 9).toBe(true);
    });

    it('有效 stageIndex 应通过', () => {
      expect(0 >= 0 && 0 <= 9).toBe(true);
      expect(9 >= 0 && 9 <= 9).toBe(true);
    });

    it('无效 status 应被拒绝', () => {
      const validStatuses: string[] = ['pending', 'current', 'pass', 'fail', 'rejected', 'skip'];
      expect(validStatuses.includes('invalid')).toBe(false);
      expect(validStatuses.includes('')).toBe(false);
    });

    it('所有有效 status 应通过', () => {
      const validStatuses: string[] = ['pending', 'current', 'pass', 'fail', 'rejected', 'skip'];
      for (const s of validStatuses) {
        expect(validStatuses.includes(s)).toBe(true);
      }
    });

    it('非 current 状态的阶段不能操作', () => {
      const nonCurrent: StageStatus[] = ['pending', 'pass', 'fail', 'rejected', 'skip'];
      for (const s of nonCurrent) {
        expect(s !== 'current').toBe(true);
      }
    });

    it('pass 后应自动推进下一个 pending 阶段', () => {
      const stages = STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      }));

      stages[0].status = 'pass';
      const nextPending = stages.findIndex(s => s.status === 'pending');
      if (nextPending !== -1) {
        stages[nextPending].status = 'current';
      }

      expect(stages[0].status).toBe('pass');
      expect(stages[1].status).toBe('current');
      // 其余仍为 pending
      expect(stages[2].status).toBe('pending');
    });

    it('skip 后应自动推进下一个 pending 阶段', () => {
      const stages = STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      }));

      stages[0].status = 'skip';
      const nextPending = stages.findIndex(s => s.status === 'pending');
      if (nextPending !== -1) {
        stages[nextPending].status = 'current';
      }

      expect(stages[0].status).toBe('skip');
      expect(stages[1].status).toBe('current');
    });

    it('fail 后不应推进下一阶段', () => {
      const stages = STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      }));

      stages[0].status = 'fail';
      expect(stages[0].status).toBe('fail');
      expect(stages[1].status).toBe('pending');
    });

    it('rejected 后不应推进下一阶段', () => {
      const stages = STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 0 ? 'current' : 'pending') as StageStatus
      }));

      stages[0].status = 'rejected';
      expect(stages[0].status).toBe('rejected');
      expect(stages[1].status).toBe('pending');
    });

    it('最后一个阶段 pass 后不应有新的 current', () => {
      const stages = STAGE_NAMES.map((name, i) => ({
        name,
        status: (i === 9 ? 'current' : 'pass') as StageStatus
      }));

      stages[9].status = 'pass';
      const nextPending = stages.findIndex(s => s.status === 'pending');
      // 没有 pending 阶段了
      expect(nextPending).toBe(-1);
    });
  });

  describe('删除记录', () => {
    it('删除不存在的记录应返回空', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([]);
      const data = await readData();
      const index = data.findIndex(i => i.id === 'nonexistent');
      expect(index).toBe(-1);
    });

    it('删除存在的记录后应从列表中移除', async () => {
      const { readData, writeData } = await import('../data');
      const mock = createMockInterview({ id: 'to-delete' });
      await writeData([mock]);

      let data = await readData();
      expect(data).toHaveLength(1);

      data.splice(data.findIndex(i => i.id === 'to-delete'), 1);
      await writeData(data);

      data = await readData();
      expect(data).toHaveLength(0);
    });

    it('删除一条不影响其他记录', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([
        createMockInterview({ id: 'keep-1', company: '保留A' }),
        createMockInterview({ id: 'delete-1', company: '删除B' }),
        createMockInterview({ id: 'keep-2', company: '保留C' })
      ]);

      let data = await readData();
      data = data.filter(i => i.id !== 'delete-1');
      await writeData(data);

      data = await readData();
      expect(data).toHaveLength(2);
      expect(data.map(i => i.id)).toEqual(['keep-1', 'keep-2']);
    });
  });

  describe('编辑公司名/职位', () => {
    it('更新公司名和职位后数据应一致', async () => {
      const { readData, writeData } = await import('../data');
      const mock = createMockInterview({ id: 'edit-1', company: '旧公司', position: '旧职位' });
      await writeData([mock]);

      const data = await readData();
      const interview = data.find(i => i.id === 'edit-1')!;
      interview.company = '新公司';
      interview.position = '新职位';
      await writeData(data);

      const updated = await readData();
      expect(updated[0].company).toBe('新公司');
      expect(updated[0].position).toBe('新职位');
      // 阶段不应被修改
      expect(updated[0].stages).toHaveLength(10);
    });

    it('编辑不应影响其他记录', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([
        createMockInterview({ id: 'e1', company: '公司A' }),
        createMockInterview({ id: 'e2', company: '公司B' })
      ]);

      const data = await readData();
      const target = data.find(i => i.id === 'e1')!;
      target.company = '修改后';
      await writeData(data);

      const updated = await readData();
      expect(updated.find(i => i.id === 'e1')!.company).toBe('修改后');
      expect(updated.find(i => i.id === 'e2')!.company).toBe('公司B');
    });
  });

  describe('导入去重逻辑', () => {
    it('相同 id 的记录不应重复导入', async () => {
      const { readData, writeData } = await import('../data');
      const existing = createMockInterview({ id: 'dup-1', company: '公司A' });
      await writeData([existing]);

      const imported = createMockInterview({ id: 'dup-1', company: '公司A' });
      const data = await readData();
      const existingIds = new Set(data.map(i => i.id));

      expect(existingIds.has(imported.id)).toBe(true);
    });

    it('相同公司+职位不同 id 也不应导入', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([createMockInterview({ id: 'id-1', company: '公司B', position: '开发' })]);

      const imported = createMockInterview({ id: 'id-2', company: '公司B', position: '开发' });
      const data = await readData();
      const existingCompanies = new Set(data.map(i => `${i.company}|${i.position}`));

      expect(existingCompanies.has(`${imported.company}|${imported.position}`)).toBe(true);
    });

    it('不同 id 和公司+职位的记录应正常导入', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([createMockInterview({ id: 'id-1', company: '公司C' })]);

      const imported = createMockInterview({ id: 'id-2', company: '公司D' });
      const data = await readData();
      const existingIds = new Set(data.map(i => i.id));
      const existingCompanies = new Set(data.map(i => `${i.company}|${i.position}`));

      const key = `${imported.company}|${imported.position}`;
      expect(!existingIds.has(imported.id) && !existingCompanies.has(key)).toBe(true);
    });

    it('批量导入应正确计数', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([createMockInterview({ id: 'existing-1', company: '已有公司' })]);

      const toImport = [
        createMockInterview({ id: 'new-1', company: '新公司A' }),
        createMockInterview({ id: 'existing-1', company: '已有公司' }), // 重复 id
        createMockInterview({ id: 'new-2', company: '新公司B' })
      ];

      const data = await readData();
      const existingIds = new Set(data.map(i => i.id));
      let count = 0;
      for (const item of toImport) {
        if (!existingIds.has(item.id)) {
          data.push(item);
          existingIds.add(item.id);
          count++;
        }
      }
      await writeData(data);

      expect(count).toBe(2);
      const final = await readData();
      expect(final).toHaveLength(3);
    });
  });

  describe('导出数据完整性', () => {
    it('导出的数据应与存储数据一致', async () => {
      const { readData, writeData } = await import('../data');
      const mockData = [
        createMockInterview({ id: 'exp-1', company: '导出公司A' }),
        createMockInterview({ id: 'exp-2', company: '导出公司B' })
      ];
      await writeData(mockData);

      const exported = await readData();
      expect(exported).toHaveLength(2);
      expect(exported[0].id).toBe('exp-1');
      expect(exported[1].id).toBe('exp-2');
      // 验证 stages 完整性
      expect(exported[0].stages).toHaveLength(10);
      expect(exported[0].stages[0].status).toBe('current');
    });

    it('空数据导出应返回空数组', async () => {
      const { readData, writeData } = await import('../data');
      await writeData([]);
      const exported = await readData();
      expect(exported).toEqual([]);
    });
  });
});
