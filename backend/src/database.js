import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;
const useSQLite = !process.env.DATABASE_URL;

let pool, db;

// Initialize PostgreSQL or SQLite
if (isProduction) {
  // PostgreSQL for production (Render)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // SQLite for local development
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const DB_FILE = path.join(DATA_DIR, 'dreams.db');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
}

// Database abstraction layer
export class DatabaseWrapper {
  constructor() {
    this.isPostgres = !useSQLite;
  }

  prepare(query) {
    if (this.isPostgres) {
      // PostgreSQL wrapper
      return {
        run: async (...params) => {
          try {
            const result = await pool.query(query, params);
            return { lastInsertRowid: result.rows[0]?.id || null };
          } catch (error) {
            throw error;
          }
        },
        get: async (...params) => {
          try {
            const result = await pool.query(query, params);
            return result.rows[0] || null;
          } catch (error) {
            throw error;
          }
        },
        all: async (...params) => {
          try {
            const result = await pool.query(query, params);
            return result.rows;
          } catch (error) {
            throw error;
          }
        }
      };
    } else {
      // SQLite wrapper
      return db.prepare(query);
    }
  }

  async exec(query) {
    if (this.isPostgres) {
      try {
        await pool.query(query);
      } catch (error) {
        throw error;
      }
    } else {
      db.exec(query);
    }
  }

  async query(sql, params = []) {
    if (this.isPostgres) {
      try {
        const result = await pool.query(sql, params);
        return result.rows;
      } catch (error) {
        throw error;
      }
    } else {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    }
  }

  async checkColumnExists(tableName, columnName) {
    if (this.isPostgres) {
      const result = await this.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [tableName, columnName]);
      return result.length > 0;
    } else {
      const result = await this.query(`PRAGMA table_info(${tableName})`);
      return result.some(col => col.name === columnName);
    }
  }
}

export async function initSchema() {
  const dbWrapper = new DatabaseWrapper();
  
  // Check if we need to migrate the users table
  try {
    const hasFirstName = await dbWrapper.checkColumnExists('users', 'first_name');
    const hasBedtimeHour = await dbWrapper.checkColumnExists('users', 'bedtime_hour');
    
    if (!hasFirstName) {
      console.log('Migrating users table to add profile fields...');
      if (dbWrapper.isPostgres) {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
        await dbWrapper.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL;`);
      } else {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN first_name TEXT;
          ALTER TABLE users ADD COLUMN last_name TEXT;
          ALTER TABLE users ADD COLUMN username TEXT;
          ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'dark';
          ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
        `);
        await dbWrapper.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL;`);
      }
    }
    
    if (!hasBedtimeHour) {
      console.log('Migrating users table to add sleep schedule fields...');
      if (dbWrapper.isPostgres) {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS bedtime_hour INTEGER DEFAULT 22;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS bedtime_minute INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS wakeup_hour INTEGER DEFAULT 7;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS wakeup_minute INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
        `);
      } else {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN bedtime_hour INTEGER DEFAULT 22;
          ALTER TABLE users ADD COLUMN bedtime_minute INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN wakeup_hour INTEGER DEFAULT 7;
          ALTER TABLE users ADD COLUMN wakeup_minute INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1;
        `);
      }
    }
  } catch (e) {
    console.log('Users table does not exist yet, will be created with new schema');
  }

  // Check if dreams table exists and needs moods column
  try {
    const hasMoods = await dbWrapper.checkColumnExists('dreams', 'moods');
    
    if (!hasMoods) {
      console.log('Migrating dreams table to add moods field...');
      if (dbWrapper.isPostgres) {
        await dbWrapper.exec(`ALTER TABLE dreams ADD COLUMN IF NOT EXISTS moods TEXT;`);
      } else {
        await dbWrapper.exec(`ALTER TABLE dreams ADD COLUMN moods TEXT;`);
      }
    }
  } catch (e) {
    console.log('Dreams table does not exist yet, will be created with new schema');
  }

  // Create tables with PostgreSQL/SQLite compatible syntax
  const createUsersTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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
      notifications_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
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
  `;

  const createDreamsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS dreams (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      voice_uri TEXT,
      mood TEXT,
      moods TEXT,
      tags TEXT,
      ai_tags TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ` : `
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
  `;

  const createAnalysesTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      dream_id INTEGER,
      type TEXT NOT NULL,
      prompt TEXT,
      response TEXT NOT NULL,
      model TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(dream_id) REFERENCES dreams(id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dream_id INTEGER,
      type TEXT NOT NULL,
      prompt TEXT,
      response TEXT NOT NULL,
      model TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(dream_id) REFERENCES dreams(id)
    );
  `;

  const createDreamTagsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS dream_tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
    CREATE TABLE IF NOT EXISTS dream_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUserMoodsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS user_moods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      mood TEXT NOT NULL,
      dream_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(dream_id) REFERENCES dreams(id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS user_moods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mood TEXT NOT NULL,
      dream_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(dream_id) REFERENCES dreams(id)
    );
  `;

  const createDreamPromptsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS dream_prompts (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
    CREATE TABLE IF NOT EXISTS dream_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await dbWrapper.exec(createUsersTable);
  await dbWrapper.exec(createDreamsTable);
  await dbWrapper.exec(createAnalysesTable);
  await dbWrapper.exec(createDreamTagsTable);
  await dbWrapper.exec(createUserMoodsTable);
  await dbWrapper.exec(createDreamPromptsTable);
}

export const db = new DatabaseWrapper();

if (process.argv.includes('--init')) {
  initSchema().then(() => {
    console.log('Database initialized');
    process.exit(0);
  });
}
