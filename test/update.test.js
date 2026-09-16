/*
 * update.test.js — el chequeo de versión nueva.
 *
 * Dos cosas que probar, y la segunda importa más que la primera:
 *
 *   1. Que compare bien. El caso que mata es 1.10.0 contra 1.9.0: como texto,
 *      la 1.10.0 es menor, y el pet dejaría de avisar para siempre a partir de
 *      la décima versión menor. Es un bug que aparece dentro de un año y nadie
 *      relaciona con esto.
 *   2. Que apagado sea CERO llamados. Que "desactivado" signifique que no se
 *      pide nada y no que se pide y se descarta. Se verifica contando cuántas
 *      veces se invocó al que trae los datos.
 *
 * Ni una conexión en todo el archivo: `check` recibe su propio `get`.
 */
'use strict';

const update = require('../app/update.js');
const { check, done } = require('./check.js');

console.log('update.js — versión nueva, y el interruptor');

/* ---------- comparar ---------- */

check('1.2.0 < 1.3.0', update.compare('1.2.0', '1.3.0'), -1);
check('1.3.0 = 1.3.0', update.compare('1.3.0', '1.3.0'), 0);
check('1.3.1 > 1.3.0', update.compare('1.3.1', '1.3.0'), 1);
check('2.0.0 > 1.99.99', update.compare('2.0.0', '1.99.99'), 1);

// El de arriba. Como texto '1.10.0' < '1.9.0' y el pet se quedaría mudo.
check('1.10.0 > 1.9.0 (no es texto)', update.compare('1.10.0', '1.9.0'), 1);
check('1.3.10 > 1.3.9', update.compare('1.3.10', '1.3.9'), 1);
check('1.20.0 > 1.3.0', update.compare('1.20.0', '1.3.0'), 1);

check('la v de los tags no cuenta', update.compare('v1.3.0', '1.3.0'), 0);
check('ni en mayúscula', update.compare('V1.3.0', 'v1.3.0'), 0);
check('espacios alrededor tampoco', update.compare('  1.3.0 ', '1.3.0'), 0);
check('1.3 es 1.3.0', update.compare('1.3', '1.3.0'), 0);
check('1 es 1.0.0', update.compare('1', '1.0.0'), 0);
check('un cuarto número se ignora', update.compare('1.3.0.4', '1.3.0'), 0);

check('un prelanzamiento es anterior', update.compare('1.3.0-beta', '1.3.0'), -1);
check('y el final es posterior', update.compare('1.3.0', '1.3.0-rc.1'), 1);
check('1.4.0-beta sigue siendo mayor que 1.3.0', update.compare('1.4.0-beta', '1.3.0'), 1);

check('basura no rompe', update.compare('qué', 'cosa'), 0);
check('vacío contra algo', update.compare('', '1.0.0'), -1);
check('null no explota', update.compare(null, undefined), 0);

/* ---------- decidir si hay novedad ---------- */

const rel = function (extra) {
  return Object.assign({
    tag_name: 'v1.4.0',
    name: 'Claude Pet 1.4.0',
    html_url: 'https://github.com/DecoudJuan/Claude-pet/releases/tag/v1.4.0'
  }, extra || {});
};

check('una versión nueva se avisa', update.pick('1.3.0', rel()).version, '1.4.0');
check('con su link', /releases\/tag\/v1\.4\.0$/.test(update.pick('1.3.0', rel()).url), true);
check('la misma versión, nada', update.pick('1.4.0', rel()), null);
check('una más vieja que la tuya, nada', update.pick('1.5.0', rel()), null);
check('un borrador no cuenta', update.pick('1.3.0', rel({ draft: true })), null);
check('un prelanzamiento tampoco', update.pick('1.3.0', rel({ prerelease: true })), null);
check('sin tag_name, nada', update.pick('1.3.0', rel({ tag_name: undefined })), null);
check('con tag_name vacío, nada', update.pick('1.3.0', rel({ tag_name: '   ' })), null);
check('un tag que no es texto, nada', update.pick('1.3.0', rel({ tag_name: 42 })), null);
check('una respuesta que no es objeto, nada', update.pick('1.3.0', 'error'), null);
check('null, nada', update.pick('1.3.0', null), null);
check('sin html_url cae en la página de releases', update.pick('1.3.0', rel({ html_url: null })).url, update.PAGE);

/* ---------- el interruptor ---------- */

check('por defecto está prendido', update.enabled({}, {}), true);
check('sin conf también', update.enabled(null, {}), true);
check('updates:false lo apaga', update.enabled({ updates: false }, {}), false);
check('updates:true lo deja prendido', update.enabled({ updates: true }, {}), true);
check('la variable de ambiente lo apaga', update.enabled({}, { CLAUDE_PET_NO_UPDATE_CHECK: '1' }), false);
check('y le gana a la conf', update.enabled({ updates: true }, { CLAUDE_PET_NO_UPDATE_CHECK: '1' }), false);

/* ---------- una vez por día ---------- */

const NOW = 1770000000000;
check('la primera vez toca', update.due(null, NOW), true);
check('recién preguntado, no', update.due(NOW - 1000, NOW), false);
check('hace 23 h, todavía no', update.due(NOW - 23 * 3600e3, NOW), false);
check('hace 25 h, sí', update.due(NOW - 25 * 3600e3, NOW), true);
check('un lastCheck basura se ignora', update.due('ayer', NOW), true);
// Un reloj que se corrió para atrás dejaría el chequeo esperando meses.
check('un lastCheck en el futuro no lo congela', update.due(NOW + 99 * 24 * 3600e3, NOW), true);

/* ---------- cuántas veces se pide, que es el punto ---------- */

let calls = 0;
const spy = function (_url, cb) { calls++; cb(rel()); };

const run = function (opts, cb) {
  update.check(Object.assign({ current: '1.3.0', now: NOW, get: spy, env: {} }, opts), cb);
};

run({ conf: { updates: false } }, function (found, asked) {
  check('apagado: no avisa nada', found, null);
  check('apagado: no dice que preguntó', asked, false);
});
check('apagado: CERO llamados a la red', calls, 0);

run({ env: { CLAUDE_PET_NO_UPDATE_CHECK: '1' } }, function () {});
check('con la variable de ambiente: sigue en cero', calls, 0);

run({ lastCheck: NOW - 1000 }, function (found, asked) {
  check('preguntado hace un rato: no avisa', found, null);
  check('y no dice que preguntó', asked, false);
});
check('preguntado hace un rato: sigue en cero', calls, 0);

run({}, function (found, asked) {
  check('prendido y al día: avisa', found && found.version, '1.4.0');
  check('y dice que preguntó', asked, true);
});
check('prendido: un llamado, uno solo', calls, 1);

// Sin novedad igual hay que guardar la fecha: si no, se pregunta en cada
// arranque hasta que salga una versión nueva.
update.check({ current: '9.0.0', now: NOW, env: {}, get: spy }, function (found, asked) {
  check('sin novedad no avisa', found, null);
  check('pero sí dice que preguntó', asked, true);
});

// force salta el día de espera: es el botón "buscar ahora" del panel.
update.check({ current: '1.3.0', now: NOW, lastCheck: NOW, force: true, env: {}, get: spy }, function (found) {
  check('force ignora la espera de un día', found && found.version, '1.4.0');
});

/* ---------- cuando la red falla ---------- */

const dead = function (_url, cb) { cb(null); };
update.check({ current: '1.3.0', now: NOW, env: {}, get: dead }, function (found, asked) {
  check('sin respuesta no avisa nada', found, null);
  check('pero cuenta como preguntado', asked, true);
});

const garbage = function (_url, cb) { cb({ tag_name: { raro: true } }); };
update.check({ current: '1.3.0', now: NOW, env: {}, get: garbage }, function (found) {
  check('una respuesta rara no rompe', found, null);
});

done('update.js');
