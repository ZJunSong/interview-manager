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

export async function readData(): Promise<Interview[]> {
  try {
    const { file } = getDataPaths();
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content) as Interview[];
  } catch {
    return [];
  }
}

export async function writeData(interviews: Interview[]): Promise<void> {
  const { dir, file } = getDataPaths();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(interviews, null, 2), 'utf-8');
}
