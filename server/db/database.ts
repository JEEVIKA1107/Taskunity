import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: SqlJsDatabase | null = null;
const dataDir = path.join(__dirname, '../data');
const dbFilePath = path.join(dataDir, 'taskunity.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run("PRAGMA foreign_keys = ON;");
  
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

// Helper query wrappers for SQL operations
export async function runQuery(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  const cleanParams = params.map(p => p === undefined ? null : p);
  db.run(sql, cleanParams);
  saveDb();
}

export async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDb();
  const cleanParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  stmt.bind(cleanParams);
  if (stmt.step()) {
    const row = stmt.getAsObject() as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const cleanParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  stmt.bind(cleanParams);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export async function execScript(sql: string): Promise<void> {
  const db = await getDb();
  db.exec(sql);
  saveDb();
}
