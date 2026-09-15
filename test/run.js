/*
 * run.js — corre todos los *.test.js de esta carpeta. `npm test`.
 *
 * Cada test es un proceso aparte: uno que se cuelgue o se caiga no se lleva
 * puestos a los demás, y el código de salida sigue siendo el de la suite.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(function (f) {
  return f.endsWith('.test.js');
}).sort();

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
  console.log('');
}

console.log(failed ? failed + ' de ' + files.length + ' archivos con fallas'
                   : files.length + ' archivos, todo bien');
process.exit(failed ? 1 : 0);
