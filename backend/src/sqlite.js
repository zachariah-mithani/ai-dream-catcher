import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'dreams.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

export function initSchema() {
  // Check if we need to migrate the users table
  try {
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasFirstName = userColumns.some(col => col.name === 'first_name');
    const hasBedtimeHour = userColumns.some(col => col.name === 'bedtime_hour');
    
    if (!hasFirstName) {
      console.log('Migrating users table to add profile fields...');
      db.exec(`
        ALTER TABLE users ADD COLUMN first_name TEXT;
        ALTER TABLE users ADD COLUMN last_name TEXT;
        ALTER TABLE users ADD COLUMN username TEXT;
        ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'dark';
        ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      // Add unique constraint after column is added
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL;`);
    }
    
    if (!hasBedtimeHour) {
      console.log('Migrating users table to add sleep schedule fields...');
      db.exec(`
        ALTER TABLE users ADD COLUMN bedtime_hour INTEGER DEFAULT 22;
        ALTER TABLE users ADD COLUMN bedtime_minute INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN wakeup_hour INTEGER DEFAULT 7;
        ALTER TABLE users ADD COLUMN wakeup_minute INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1;
      `);
    }
  } catch (e) {
    console.log('Users table does not exist yet, will be created with new schema');
  }

  // Check if we need to migrate the dreams table
  try {
    const dreamColumns = db.prepare("PRAGMA table_info(dreams)").all();
    const hasMoods = dreamColumns.some(col => col.name === 'moods');
    
    if (!hasMoods) {
      console.log('Migrating dreams table to add moods field...');
      db.exec(`ALTER TABLE dreams ADD COLUMN moods TEXT;`);
    }
  } catch (e) {
    console.log('Dreams table does not exist yet, will be created with new schema');
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    theme_preference TEXT DEFAULT 'dark',
    bedtime_hour INTEGER DEFAULT 22,
    bedtime_minute INTEGER DEFAULT 0,
    wakeup_hour INTEGER DEFAULT 7,
    wakeup_minute INTEGER DEFAULT 0,
    notifications_enabled BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dreams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    voice_uri TEXT,
    mood TEXT,
    moods TEXT,
    tags TEXT,
    ai_tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dream_id INTEGER,
    type TEXT NOT NULL, -- immediate | pattern | chat
    prompt TEXT,
    response TEXT NOT NULL,
    model TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(dream_id) REFERENCES dreams(id)
  );

  CREATE TABLE IF NOT EXISTS dream_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mood TEXT NOT NULL,
    dream_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(dream_id) REFERENCES dreams(id)
  );

  CREATE TABLE IF NOT EXISTS dream_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    category TEXT NOT NULL,
    active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `);
}

if (process.argv.includes('--init')) {
  initSchema();
  console.log('Database initialized at', DB_FILE);
}


