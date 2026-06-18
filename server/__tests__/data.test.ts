import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpDir: string;
let dataFile: string;

describe('data layer', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'im-test-'));
    dataFile = path.join(tmpDir, 'interviews.json');
    process.env.DATA_DIR = tmpDir;
    process.env.DATA_FILE = dataFile;
    vi.resetModules(); // 清除模块缓存，确保重新读取环境变量
  });

  afterEach(async () => {
    delete process.env.DATA_DIR;
    delete process.env.DATA_FILE;
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('readData 在文件不存在时返回空数组', async () => {
    const { readData } = await import('../data');
    const data = await readData();
    expect(data).toEqual([]);
  });

  it('writeData 写入后 readData 能读回相同数据', async () => {
    const { readData, writeData } = await import('../data');
    const now = new Date().toISOString();
    const mockData = [
      {
        id: 'test-1',
        company: '测试公司',
        position: '测试职位',
        stages: Array.from({ length: 10 }, (_, i) => ({
          name: ['投递', '测评', '笔试', '简历评估', '一面', '二面', '三面', 'HR面', 'Offer评估', '正式offer'][i],
          status: i === 0 ? 'current' : 'pending'
        })),
        createdAt: now,
        updatedAt: now
      }
    ];

    await writeData(mockData);
    const read = await readData();
    expect(read).toHaveLength(1);
    expect(read[0].id).toBe('test-1');
    expect(read[0].company).toBe('测试公司');
    expect(read[0].stages).toHaveLength(10);
  });

  it('writeData 会自动创建 data 目录', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'deep');
    process.env.DATA_DIR = nestedDir;
    process.env.DATA_FILE = path.join(nestedDir, 'interviews.json');
    vi.resetModules();

    const { writeData } = await import('../data');
    await writeData([]);

    const content = await fs.readFile(path.join(nestedDir, 'interviews.json'), 'utf-8');
    expect(JSON.parse(content)).toEqual([]);
  });

  it('readData 在 JSON 格式错误时返回空数组', async () => {
    await fs.writeFile(dataFile, 'invalid json{{{', 'utf-8');
    const { readData } = await import('../data');
    const data = await readData();
    expect(data).toEqual([]);
  });

  it('多次写入读取应保持一致', async () => {
    const { readData, writeData } = await import('../data');

    await writeData([{ id: '1', company: 'A', position: 'P', stages: [], createdAt: '', updatedAt: '' }]);
    await writeData([{ id: '2', company: 'B', position: 'Q', stages: [], createdAt: '', updatedAt: '' }]);

    const data = await readData();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('2');
  });
});
