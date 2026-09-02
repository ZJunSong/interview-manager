import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';

const DB_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

let db: Database.Database;

export async function initDatabase(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  
  db = new Database(DB_PATH);
  
  // 性能优化
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      stages TEXT NOT NULL DEFAULT '[]',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
  `);
  
  // 创建默认管理员账号（如果不存在）
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('[Database] 默认管理员账号已创建: admin / admin123');
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
