const assert = require('assert');
const fs = require('fs');

const mainProcess = fs.readFileSync('./electron/main.cjs', 'utf8');

const expectedSnippets = [
  'const ALLOWED_TABLES = ["members", "tithes", "users", "config"]',
  'CREATE TABLE IF NOT EXISTS members',
  'fullName TEXT NOT NULL',
  'birthDate TEXT DEFAULT',
  'baptismDate TEXT DEFAULT',
  'isTither INTEGER DEFAULT 0',
  'CREATE TABLE IF NOT EXISTS tithes',
  'memberId TEXT NOT NULL',
  'memberName TEXT NOT NULL',
  'paymentMethod TEXT NOT NULL',
  'contributionDate TEXT NOT NULL',
  'CREATE TABLE IF NOT EXISTS users',
  'CREATE TABLE IF NOT EXISTS config',
  "path.join(app.getPath('userData'), 'database.sqlite')",
];

for (const snippet of expectedSnippets) {
  assert(
    mainProcess.includes(snippet),
    `Trecho obrigatório não encontrado em electron/main.cjs: ${snippet}`,
  );
}

console.log('Main integration test (v1 schema verification) passed!');
