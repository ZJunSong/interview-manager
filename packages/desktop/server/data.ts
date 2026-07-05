import fs from 'fs/promises';
import path from 'path';
import type { Interview } from './types';

// 生产环境: __dirname = dist/server/，需要 ../../ 才能到达项目根目录
// 开发环境: __dirname = server/，需要 ../ 到达项目根目录
const isProd = process.env.NODE_ENV === 'production';
const rootDir = isProd ? path.join(__dirname, '..', '..') : path.join(__dirname, '..');

const DEFAULT_DATA_DIR = path.join(rootDir, 'data');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'interviews.json');

function getDataPaths() {
  return {
    dir: process.env.DATA_DIR || DEFAULT_DATA_DIR,
    file: process.env.DATA_FILE || DEFAULT_DATA_FILE
  };
}

// 写入串行化，避免并发请求读-改-写时互相覆盖
let writeChain: Promise<void> = Promise.resolve();
function serializeWrite(task: () => Promise<void>): Promise<void> {
  const next = writeChain.then(task, task);
  // 错误不应阻塞后续写入任务
  writeChain = next.catch(() => {});
  return next;
}

export async function readData(): Promise<Interview[]> {
  try {
    const { file } = getDataPaths();
    const content = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as Interview[]) : [];
  } catch (err) {
    // 文件不存在是正常情况（首次运行），静默处理；其他错误记录日志
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[data] 读取数据失败:', err);
    }
    return [];
  }
}

export async function writeData(interviews: Interview[]): Promise<void> {
  return serializeWrite(async () => {
    const { dir, file } = getDataPaths();
    await fs.mkdir(dir, { recursive: true });
    // 先写入临时文件再原子替换，防止写入中途崩溃导致数据损坏
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(interviews, null, 2), 'utf-8');
    await fs.rename(tmp, file);
  });
}
