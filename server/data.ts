import fs from 'fs/promises';
import path from 'path';
import type { Interview } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'interviews.json');

export async function readData(): Promise<Interview[]> {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content) as Interview[];
  } catch {
    return [];
  }
}

export async function writeData(interviews: Interview[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(interviews, null, 2), 'utf-8');
}
