const { registerOpenEditionLicenseHandlers } = require("./open-edition.cjs");
const ALLOWED_TABLES = ["members", "tithes", "users", "config"];
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const { createLocalAuth } = require('./auth.cjs');
const fs = require('fs');
const {
  getMachineFingerprint,
  verifyLicenseToken,
} = require('./license.cjs');
const {
  normalizeSqlitePayload,
} = require('./sqlite-payload.cjs');

let db;
const dbPath = path.join(app.getPath('userData'), 'database.sqlite');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    birthDate TEXT DEFAULT '',
    baptismDate TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativo',
    isTither INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tithes (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    memberName TEXT NOT NULL,
    amount REAL NOT NULL,
    paymentMethod TEXT NOT NULL,
    contributionDate TEXT NOT NULL,
    status TEXT DEFAULT 'Confirmado',
    notes TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT,
    role TEXT DEFAULT 'member'
  );
`;

function tableExists(tableName) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  return !!row;
}

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!columnExists(tableName, columnName)) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
  }
}

function inferMemberStatus(rawType) {
  const value = String(rawType || '').toLowerCase();
  if (value.includes('afast')) {
    return 'Inativo';
  }
  if (value.includes('visit')) {
    return 'Visitante';
  }
  return 'Ativo';
}

function padDateValue(value) {
  return String(value).padStart(2, '0');
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function normalizeDateString(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const isoWithTime = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoWithTime) {
    return isoWithTime[1];
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, dayText, monthText, yearText] = slashDate;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${padDateValue(month)}-${padDateValue(day)}`;
    }
    return '';
  }

  const dashedDate = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashedDate) {
    const [, dayText, monthText, yearText] = dashedDate;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${padDateValue(month)}-${padDateValue(day)}`;
    }
    return '';
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${parsed.getFullYear()}-${padDateValue(parsed.getMonth() + 1)}-${padDateValue(parsed.getDate())}`;
}

function normalizeDateColumns(tableName, columns) {
  if (!tableExists(tableName)) {
    return;
  }

  const rows = db.prepare(`SELECT id, ${columns.join(', ')} FROM ${tableName}`).all();
  const assignmentSql = columns.map((column) => `${column} = ?`).join(', ');
  const updateStatement = db.prepare(`UPDATE ${tableName} SET ${assignmentSql} WHERE id = ?`);

  for (const row of rows) {
    const normalizedValues = [];
    let changed = false;

    for (const column of columns) {
      const currentValue = row[column] == null ? '' : String(row[column]);
      const normalizedValue = normalizeDateString(currentValue);
      normalizedValues.push(normalizedValue);
      if (normalizedValue !== currentValue) {
        changed = true;
      }
    }

    if (changed) {
      updateStatement.run(...normalizedValues, row.id);
    }
  }
}

function migrateLegacyData() {
  if (tableExists('members') && !columnExists('members', 'fullName')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS members_v1 (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        birthDate TEXT DEFAULT '',
        baptismDate TEXT DEFAULT '',
        status TEXT DEFAULT 'Ativo',
        isTither INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      )
    `);

    db.prepare(`
      INSERT INTO members_v1 (
        id,
        fullName,
        email,
        phone,
        address,
        birthDate,
        baptismDate,
        status,
        isTither,
        notes,
        createdAt
      )
      SELECT
        id,
        COALESCE(NULLIF(name, ''), 'Sem nome'),
        '',
        '',
        '',
        '',
        COALESCE(NULLIF(date, ''), ''),
        CASE
          WHEN LOWER(COALESCE(type, '')) LIKE '%afast%' THEN 'Inativo'
          WHEN LOWER(COALESCE(type, '')) LIKE '%visit%' THEN 'Visitante'
          ELSE 'Ativo'
        END,
        0,
        '',
        DATE('now')
      FROM members
    `).run();

    db.exec('DROP TABLE members');
    db.exec('ALTER TABLE members_v1 RENAME TO members');
  }

  if (tableExists('members')) {
    ensureColumn('members', 'email', "TEXT DEFAULT ''");
    ensureColumn('members', 'phone', "TEXT DEFAULT ''");
    ensureColumn('members', 'address', "TEXT DEFAULT ''");
    ensureColumn('members', 'birthDate', "TEXT DEFAULT ''");
    ensureColumn('members', 'baptismDate', "TEXT DEFAULT ''");
    ensureColumn('members', 'status', "TEXT DEFAULT 'Ativo'");
    ensureColumn('members', 'isTither', 'INTEGER DEFAULT 0');
    ensureColumn('members', 'notes', "TEXT DEFAULT ''");
    ensureColumn('members', 'createdAt', "TEXT DEFAULT ''");

    db.prepare(`
      UPDATE members
      SET fullName = COALESCE(NULLIF(fullName, ''), 'Sem nome')
    `).run();

    db.prepare(`
      UPDATE members
      SET status = COALESCE(NULLIF(status, ''), 'Ativo'),
          createdAt = COALESCE(NULLIF(createdAt, ''), DATE('now'))
    `).run();
  }

  if (tableExists('finances') && tableExists('tithes')) {
    const titheCount = db.prepare('SELECT COUNT(*) AS count FROM tithes').get();
    if (titheCount.count === 0) {
      db.prepare(`
        INSERT INTO tithes (
          id,
          memberId,
          memberName,
          amount,
          paymentMethod,
          contributionDate,
          status,
          notes,
          createdAt
        )
        SELECT
          id,
          '',
          name,
          amount,
          COALESCE(method, 'PIX'),
          date,
          'Confirmado',
          COALESCE(type, ''),
          date
        FROM finances
      `).run();
    }
  }

  normalizeDateColumns('members', ['birthDate', 'baptismDate', 'createdAt']);
  normalizeDateColumns('tithes', ['contributionDate', 'createdAt']);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: '#f8f9fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:3000').catch(() => {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  }
}

function initDb() {
  console.log('Using database path:', dbPath);
  db = new Database(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)');
  db.exec(SCHEMA_SQL);
  migrateLegacyData();

  // First account is created explicitly by the user; no seeded credentials.

}

ipcMain.handle('backup-database', (event, destinationPath) => {
  try {
    // 1. Snapshot do WAL para garantir integridade
    db.prepare('PRAGMA wal_checkpoint(FULL)').run();
    
    // 2. Copiar o arquivo principal
    fs.copyFileSync(dbPath, destinationPath);
    
    // 3. Copiar WAL/SHM se existirem
    if (fs.existsSync(dbPath + '-wal')) fs.copyFileSync(dbPath + '-wal', destinationPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.copyFileSync(dbPath + '-shm', destinationPath + '-shm');
    
    return true;
  } catch (e) {
    console.error('Backup failed:', e);
    return false;
  }
});

ipcMain.handle('restore-database', (event, sourcePath) => {
  try {
    // 1. Fechar o banco atual
    if (db) {
      db.close();
      db = null;
    }
    
    // 2. Copiar o arquivo de backup
    fs.copyFileSync(sourcePath, dbPath);
    
    // 3. Copiar WAL/SHM se existirem
    if (fs.existsSync(sourcePath + '-wal')) fs.copyFileSync(sourcePath + '-wal', dbPath + '-wal');
    if (fs.existsSync(sourcePath + '-shm')) fs.copyFileSync(sourcePath + '-shm', dbPath + '-shm');
    
    // 4. Abrir o novo banco e verificar integridade
    db = new Database(dbPath);
    const integrity = db.prepare('PRAGMA integrity_check').get();
    
    if (integrity.integrity_check !== 'ok') {
      console.error('Integrity check failed:', integrity);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Restore failed:', e);
    // Tenta re-inicializar em caso de falha grave
    initDb();
    return false;
  }
});

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-config', (event, key) => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
});

ipcMain.handle('set-config', (event, key, value) => {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
  return true;
});

// Media Handlers
const uploadsDir = path.join(app.getPath('userData'), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

ipcMain.handle('save-file', (event, fileName, base64Data) => {
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);
  return filePath;
});

ipcMain.handle('read-file', (event, fileName) => {
  const filePath = path.join(uploadsDir, fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'base64');
  }
  return null;
});

ipcMain.handle('delete-file', (event, fileName) => {
  const filePath = path.join(uploadsDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});

function validateTable(tableName) {
  if (!ALLOWED_TABLES.includes(tableName) || tableName === 'users' || tableName === 'config') {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}

// Generic SQLite CRUD
ipcMain.handle('sqlite-get-all', (event, tableName) => {
  validateTable(tableName);
  return db.prepare(`SELECT * FROM ${tableName}`).all();
});

ipcMain.handle('sqlite-add', (event, tableName, item) => {
  validateTable(tableName);
  
  if (!item.id) {
    throw new Error('Item must have an id provided by the client');
  }

  const normalizedItem = normalizeSqlitePayload(item);
  
  const keys = Object.keys(normalizedItem);
  const values = Object.values(normalizedItem);
  
  const placeholders = keys.map(() => '?').join(', ');
  const columns = keys.join(', ');

  db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`)
    .run(...values);

  return item.id;
});

ipcMain.handle('sqlite-update', (event, tableName, id, item) => {
  validateTable(tableName);
  const normalizedItem = normalizeSqlitePayload(item);
  const keys = Object.keys(normalizedItem);
  const values = Object.values(normalizedItem);
  const sets = keys.map(k => `${k} = ?`).join(', ');

  db.prepare(`UPDATE ${tableName} SET ${sets} WHERE id = ?`)
    .run(...values, id);
  return true;
});

ipcMain.handle('sqlite-delete', (event, tableName, id) => {
  validateTable(tableName);
  db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
  return true;
});

ipcMain.handle('sqlite-clear', (event, tableName) => {
  validateTable(tableName);
  db.prepare(`DELETE FROM ${tableName}`).run();
  return true;
});

// Auth handlers never return stored password derivatives.
ipcMain.handle('auth-has-users', () => createLocalAuth(db).hasUsers());
ipcMain.handle('auth-login', (event, email, password) => createLocalAuth(db).login(email, password));
ipcMain.handle('auth-register', (event, email, password, displayName) =>
  createLocalAuth(db).register(email, password, displayName));

// Open source edition: commercial activation is not required.
registerOpenEditionLicenseHandlers(ipcMain);

ipcMain.handle('get-machine-fingerprint', () => getMachineFingerprint());
