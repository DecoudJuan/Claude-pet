/*
 * quota.test.js — cuándo el pet se va a dormir.
 *
 * Este módulo decide el único estado que le gana a todos los demás: sin tokens
 * no estás trabajando ni terminaste, estás dormido. Equivocarse tiene dos
 * formas, las dos malas y ninguna evidente:
 *
 *   - de menos: seguís sin tokens y el avatar teclea, que es exactamente la
 *     mentira que el proyecto entero trata de no decir
 *   - de más: tenés cuota de sobra y el pet duerme, y no hay nada en la ventana
 *     que explique por qué
 *
 * El dato entra de un archivo que escribe OTRO proceso —el statusline— así que
 * puede estar viejo, a medio escribir o con formas que nunca previmos. Todo lo
 * de abajo es eso.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// El módulo resuelve la ruta al cargarse, así que la variable va antes.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-quota-'));
const FILE = path.join(dir, 'current.json');
process.env.CLAUDE_PET_QUOTA_FILE = FILE;

const quota = require('../app/quota.js');
const { check, done } = require('./check.js');

const NOW = 1770000000000;              // en milisegundos
const SEC = Math.floor(NOW / 1000);     // el archivo guarda epoch en segundos

function write(doc) { fs.writeFileSync(FILE, JSON.stringify(doc)); }

// Una cuenta con una ventana de 5 h en el porcentaje y el reset que le pasemos.
function acct(pct, resetsInSec, extra) {
  return Object.assign({
    account: 'juan@ejemplo.com',
    five_hour: { pct: pct, resets_at: SEC + resetsInSec }
  }, extra || {});
}

function res(now) { return quota.exhausted(now || NOW); }

console.log('quota.js — cuándo dormir');

/* ---------- nada que decir ---------- */

try { fs.unlinkSync(FILE); } catch (e) { /* no estaba */ }
check('sin archivo no se duerme', res(), null);

write({});
check('sin accounts tampoco', res(), null);

write({ accounts: {} });
check('con accounts vacío tampoco', res(), null);

fs.writeFileSync(FILE, '{ a medio escribir');
check('un archivo a medio escribir no rompe', res(), null);

/* ---------- el umbral ---------- */

write({ accounts: { a: acct(99, 3600) } });
check('al 99 % todavía se labura', res(), null);

write({ accounts: { a: acct(100, 3600) } });
check('al 100 % se duerme', res() !== null, true);
check('y dice cuál ventana', res().window, '5h');
check('con el porcentaje', res().pct, 100);
check('y a qué hora vuelve, en milisegundos', res().resetsAt, (SEC + 3600) * 1000);
check('y de qué cuenta', res().account, 'juan@ejemplo.com');

write({ accounts: { a: acct(147, 3600) } });
check('por encima de 100 también', res() !== null, true);

/* ---------- el reset que ya pasó ---------- */

// El statusline corre cuando corre: entre que la ventana se renovó y él lo
// publica, el archivo describe un pasado. Dormir por eso es dormir de gratis.
write({ accounts: { a: acct(100, -60) } });
check('una ventana cuyo reset ya pasó no duerme', res(), null);

write({ accounts: { a: acct(100, 0) } });
check('justo en el segundo del reset tampoco', res(), null);

write({ accounts: { a: { five_hour: { pct: 100 } } } });
check('sin resets_at no duerme', res(), null);

write({ accounts: { a: { five_hour: { pct: 100, resets_at: 'a las tres' } } } });
check('con un resets_at que no es número tampoco', res(), null);

/* ---------- la que vuelve antes ---------- */

// Si las dos ventanas están agotadas, lo que querés saber es cuándo podés
// volver a trabajar: manda la más cercana, no la primera de la lista.
write({ accounts: { a: {
  five_hour: { pct: 100, resets_at: SEC + 7200 },
  seven_day: { pct: 100, resets_at: SEC + 600 }
} } });
check('con las dos agotadas manda la que vuelve antes', res().window, '7d');
check('y su hora', res().resetsAt, (SEC + 600) * 1000);

// La de 7 días agotada y la de 5 h con margen: se duerme igual, no hay tokens.
write({ accounts: { a: {
  five_hour: { pct: 10, resets_at: SEC + 600 },
  seven_day: { pct: 100, resets_at: SEC + 86400 }
} } });
check('con la semanal agotada se duerme aunque sobre la de 5 h', res().window, '7d');

/* ---------- varias cuentas ---------- */

// El pet no puede saber en cuál estás trabajando. Avisar de más es preferible
// a tecleármelo sin tokens.
write({ accounts: { a: acct(10, 600), b: acct(100, 900) } });
check('con una cuenta de dos agotada, se duerme', res() !== null, true);
check('y es la agotada la que manda', res().resetsAt, (SEC + 900) * 1000);

write({ accounts: { a: acct(100, 7200), b: acct(100, 900) } });
check('con dos agotadas, la que vuelve antes', res().resetsAt, (SEC + 900) * 1000);

// Una cuenta que el statusline marcó como no disponible no opina.
write({ accounts: { a: Object.assign(acct(100, 900), { available: false }) } });
check('una cuenta no disponible se saltea', res(), null);

write({ accounts: { a: Object.assign(acct(100, 900), { available: true }) } });
check('available:true sí cuenta', res() !== null, true);

/* ---------- formas que nunca previmos ---------- */

write({ accounts: { a: null } });
check('una cuenta null no rompe', res(), null);

write({ accounts: { a: 'texto' } });
check('una cuenta que es texto tampoco', res(), null);

write({ accounts: { a: { five_hour: null, seven_day: null } } });
check('ventanas en null tampoco', res(), null);

write({ accounts: { a: { five_hour: { pct: 'mucho', resets_at: SEC + 600 } } } });
check('un pct que no es número se saltea', res(), null);

write({ accounts: [acct(100, 900)] });
check('accounts como array se recorre igual', res() !== null, true);

write({ accounts: { a: acct(10, 600), b: null, c: acct(100, 900) } });
check('una cuenta rota no tapa a las demás', res() !== null, true);

/* ---------- el paso del tiempo ---------- */

write({ accounts: { a: acct(100, 3600) } });
check('ahora duerme', res() !== null, true);
check('dentro de dos horas, esa misma ventana ya no', res(NOW + 2 * 3600e3), null);

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* da igual */ }

done('quota.js');
