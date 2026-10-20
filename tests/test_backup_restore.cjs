const fs = require('fs');
const path = require('path');
const assert = require('assert');

// This script needs to be adapted to be run properly in the electron environment or as a standalone test
console.log('Testing backup/restore logic...');

// Simulate environment
const userData = '/tmp/test_db_dir';
if (!fs.existsSync(userData)) fs.mkdirSync(userData);
const dbPath = path.join(userData, 'database.sqlite');

// Write dummy db
fs.writeFileSync(dbPath, 'dummy_data');
fs.writeFileSync(dbPath + '-wal', 'dummy_wal');
fs.writeFileSync(dbPath + '-shm', 'dummy_shm');

const destPath = path.join(userData, 'backup.sqlite');

// Simulate backup function
function backup(source, dest) {
    fs.copyFileSync(source, dest);
    if (fs.existsSync(source + '-wal')) fs.copyFileSync(source + '-wal', dest + '-wal');
    if (fs.existsSync(source + '-shm')) fs.copyFileSync(source + '-shm', dest + '-shm');
}

// Simulate restore function
function restore(source, dest) {
    fs.copyFileSync(source, dest);
    if (fs.existsSync(source + '-wal')) fs.copyFileSync(source + '-wal', dest + '-wal');
    if (fs.existsSync(source + '-shm')) fs.copyFileSync(source + '-shm', dest + '-shm');
}

// Execute
backup(dbPath, destPath);
assert(fs.existsSync(destPath));
assert(fs.existsSync(destPath + '-wal'));
assert(fs.existsSync(destPath + '-shm'));

const restorePath = path.join(userData, 'restored.sqlite');
restore(destPath, restorePath);
assert(fs.existsSync(restorePath));
assert(fs.readFileSync(restorePath).toString() === 'dummy_data');

console.log('Backup/restore test passed successfully.');
