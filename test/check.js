/*
 * check.js — el mínimo para escribir un test y que se lea el resultado.
 *
 * No hay framework a propósito: el pet no tiene dependencias de runtime y los
 * tests tampoco necesitan una. Cada archivo se corre solo con `node`.
 */
'use strict';

let fails = 0;

function check(name, got, want) {
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? '  ok   ' : '  FALLA') + '  ' + name +
              (ok ? '' : '  (esperado ' + want + ', dio ' + got + ')'));
}

// Se llama al final de cada archivo: el código de salida es lo que mira npm.
function done(title) {
  console.log(fails ? '\n' + title + ': ' + fails + ' fallas' : '\n' + title + ': todo bien');
  process.exit(fails ? 1 : 0);
}

module.exports = { check: check, done: done };
