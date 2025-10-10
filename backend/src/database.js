import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;
const useSQLite = !process.env.DATABASE_URL;

let pool, sqliteDb;

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

  sqliteDb = new Database(DB_FILE);
  sqliteDb.pragma('journal_mode = WAL');
}

// Database abstraction layer
export class DatabaseWrapper {
  constructor() {
    this.isPostgres = !useSQLite;
  }

  prepare(query) {
    if (this.isPostgres) {
      // PostgreSQL wrapper - convert SQLite ? parameters to PostgreSQL $1, $2, $3 format
      const queryString = query; // Capture the query parameter
      
      if (!queryString || queryString.trim() === '') {
        console.error('Empty or undefined query passed to prepare:', query);
        throw new Error('Empty query string');
      }
      
      return {
        run: async (...params) => {
          try {
            // Convert SQLite ? parameters to PostgreSQL $1, $2, $3 format
            const needsReturning = /^\s*insert\b/i.test(queryString) && !/returning\s+/i.test(queryString);
            const queryWithReturning = needsReturning ? `${queryString} RETURNING id` : queryString;
            const pgQuery = queryWithReturning.replace(/\?/g, (match, offset) => {
              const paramIndex = queryString.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            
            const result = await pool.query(pgQuery, params);
            return { lastInsertRowid: result.rows[0]?.id || null };
          } catch (error) {
            console.error('Query error:', error.message);
            throw error;
          }
        },
        get: async (...params) => {
          try {
            // Convert SQLite ? parameters to PostgreSQL $1, $2, $3 format
            const pgQuery = queryString.replace(/\?/g, (match, offset) => {
              const paramIndex = queryString.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            
            const result = await pool.query(pgQuery, params);
            return result.rows[0] || null;
          } catch (error) {
            console.error('Query error:', error.message);
            throw error;
          }
        },
        all: async (...params) => {
          try {
            // Convert SQLite ? parameters to PostgreSQL $1, $2, $3 format
            const pgQuery = queryString.replace(/\?/g, (match, offset) => {
              const paramIndex = queryString.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            
            const result = await pool.query(pgQuery, params);
            return result.rows;
          } catch (error) {
            console.error('Query error:', error.message);
            throw error;
          }
        }
      };
    } else {
      // SQLite wrapper
      return sqliteDb.prepare(query);
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
      sqliteDb.exec(query);
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
      const stmt = sqliteDb.prepare(sql);
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
    const hasPlan = await dbWrapper.checkColumnExists('users', 'plan');
    
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

    if (!hasPlan) {
      console.log('Migrating users table to add billing fields...');
      if (dbWrapper.isPostgres) {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP NULL;
        `);
      } else {
        await dbWrapper.exec(`
          ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
          ALTER TABLE users ADD COLUMN trial_end TEXT;
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

  // Check if dreams table needs user_dream_number column
  try {
    const hasUserDreamNumber = await dbWrapper.checkColumnExists('dreams', 'user_dream_number');
    
    if (!hasUserDreamNumber) {
      console.log('Migrating dreams table to add user_dream_number field...');
      if (dbWrapper.isPostgres) {
        await dbWrapper.exec(`ALTER TABLE dreams ADD COLUMN IF NOT EXISTS user_dream_number INTEGER;`);
      } else {
        await dbWrapper.exec(`ALTER TABLE dreams ADD COLUMN user_dream_number INTEGER;`);
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
      plan TEXT DEFAULT 'free',
      trial_end TIMESTAMP NULL,
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
      plan TEXT DEFAULT 'free',
      trial_end TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createDreamsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS dreams (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      user_dream_number INTEGER,
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
      user_dream_number INTEGER,
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

  const createPasswordResetsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `;

  const createEmailVerificationsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `;

  const createRefreshTokensTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      revoked BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `;

  const createUsageCountersTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS usage_counters (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      metric TEXT NOT NULL,
      period TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, metric, period)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS usage_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      metric TEXT NOT NULL,
      period TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, metric, period)
    );
  `;

  const createUserSubscriptionsTable = dbWrapper.isPostgres ? `
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      apple_expires_at TIMESTAMP,
      status TEXT NOT NULL,
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(user_id)
    );
  ` : `
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      apple_expires_at TEXT,
      status TEXT NOT NULL,
      current_period_end TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(user_id)
    );
  `;

  await dbWrapper.exec(createUsersTable);
  await dbWrapper.exec(createDreamsTable);
  await dbWrapper.exec(createAnalysesTable);
  await dbWrapper.exec(createDreamTagsTable);
  await dbWrapper.exec(createUserMoodsTable);
  await dbWrapper.exec(createDreamPromptsTable);
  await dbWrapper.exec(createEmailVerificationsTable);
  await dbWrapper.exec(createRefreshTokensTable);
  await dbWrapper.exec(createPasswordResetsTable);
  await dbWrapper.exec(createUsageCountersTable);
  await dbWrapper.exec(createUserSubscriptionsTable);

  // Add missing apple_expires_at column to existing user_subscriptions tables
  try {
    if (dbWrapper.isPostgres) {
      await dbWrapper.exec(`ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS apple_expires_at TIMESTAMP;`);
    } else {
      await dbWrapper.exec(`ALTER TABLE user_subscriptions ADD COLUMN apple_expires_at TEXT;`);
    }
    console.log('Added apple_expires_at column to user_subscriptions table');
  } catch (error) {
    // Column might already exist, ignore error
    console.log('apple_expires_at column may already exist:', error.message);
  }
}

// Create database instance but export immediately with rename to eliminate shadows
if (process.argv.includes('--init')) {
  initSchema().then(() => {
    console.log('Database initialized');
    process.exit(0);
  });
}

export const db = (() => new DatabaseWrapper())();

// Export pool for debugging
export { pool };
