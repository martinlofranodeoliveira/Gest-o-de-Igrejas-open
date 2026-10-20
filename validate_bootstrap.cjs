const fs = require('fs');
const assert = require('assert');

const electronBuilder = JSON.parse(fs.readFileSync('./electron-builder.json', 'utf8'));
const mainProcess = fs.readFileSync('./electron/main.cjs', 'utf8');

assert(
  !JSON.stringify(electronBuilder).includes('database.sqlite'),
  'database.sqlite não deve ser empacotado no instalador',
);

assert(
  mainProcess.includes("app.getPath('userData')"),
  'electron/main.cjs deve criar o banco no diretório userData da aplicação',
);

assert(
  mainProcess.includes("path.join(app.getPath('userData'), 'database.sqlite')"),
  'electron/main.cjs deve usar database.sqlite dentro de userData',
);

console.log('Bootstrap validation passed: banco local configurado em userData sem bundle estático.');
