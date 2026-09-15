/*
 * turn.test.js — quién está esperándote y quién está laburando.
 *
 * La regla que fija todo esto: un pedido de permiso deja de estar pendiente
 * cuando lo contestás, y contestarlo se ve en el transcript, porque contestar
 * hace trabajo y el trabajo se escribe. El tiempo no prueba nada — que pasen
 * 40 s no quiere decir que hayas contestado.
 *
 * De ahí salen las dos mitades: mientras no aparezca esa prueba el turno sigue
 * frenado y el aviso se queda; cuando aparece, la sesión pasa a trabajar en el
 * acto y sin esperar ningún vencimiento.
 *
 * Replica los selectores de project() en app/main.js, que vive dentro del
 * proceso principal de Electron y no se puede importar suelto. Si allá cambia
 * la regla, este espejo tiene que cambiar con ella.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const turn = require(path.join(__dirname, '..', 'app', 'turn.js'));
const { check, done } = require('./check.js');

const WAITING_TTL_MS = 40000;
const WORKING_TTL_MS = 15 * 60 * 1000;

function answered(s) { return turn.movedSince(s, s.updatedAt); }

function waits(s, now) {
  if (s.state !== 'waiting') return false;
  if (!s.transcript) return now - (s.updatedAt || 0) < WAITING_TTL_MS;
  return !answered(s);
}

function claims(s, now) {
  if (now - (s.updatedAt || 0) >= WORKING_TTL_MS) return false;
  return (s.state === 'working' ||
          (s.state === 'waiting' && answered(s))) && turn.isActive(s, now);
}

function insists(s, now) { return now - (s.updatedAt || 0) < WAITING_TTL_MS; }

const tmp = path.join(os.tmpdir(), 'pet-transcript-' + Date.now() + '.jsonl');
fs.writeFileSync(tmp, JSON.stringify({ type: 'user' }) + '\n');

const now = Date.now();

function touch(msAgo) {
  const t = new Date(now - msAgo);
  fs.utimesSync(tmp, t, t);
}

function aviso(msAgo, transcript) {
  return {
    state: 'waiting',
    updatedAt: now - msAgo,
    transcript: transcript === undefined ? tmp : transcript
  };
}

console.log('turn.js — esperando y laburando');

/* ---------- el aviso se queda mientras el turno esté trabado ---------- */

// «Sin contestar» es que el transcript quedó ANTES del aviso, así que el toque
// tiene que ser más viejo que el aviso de cada caso, no más viejo que el reloj.
touch(90000);
check('permiso sin contestar hace 1 min -> sigue avisando', waits(aviso(60000), now), true);

touch(660000);
check('permiso sin contestar hace 10 min -> sigue avisando', waits(aviso(600000), now), true);
check('y mientras tanto no labura', claims(aviso(600000), now), false);

check('cabecea al principio', insists(aviso(5000), now), true);
check('a los 40 s deja de cabecear, pero el globo queda', insists(aviso(60000), now), false);

/* ---------- contestarlo lo apaga, y en el acto ---------- */

touch(5000);                                   // contestaste: el turno siguió
check('permiso contestado -> deja de avisar', waits(aviso(60000), now), false);
check('permiso contestado -> labura', claims(aviso(60000), now), true);
// Antes esto pedía además que pasaran 40 s, y en el hueco la sesión no era ni
// una cosa ni la otra: el pet cantaba un «Terminó» falso en medio del turno.
check('contestado rapido -> labura ya, sin esperar los 40 s',
      claims(aviso(10000), now), true);

/* ---------- sin transcript no hay con qué desmentir el aviso ---------- */

check('sin transcript, aviso fresco -> avisa', waits(aviso(5000, ''), now), true);
check('sin transcript, aviso viejo -> se apaga igual', waits(aviso(600000, ''), now), false);
check('sin transcript no se inventa trabajo', claims(aviso(600000, ''), now), false);

/* ---------- trabajo de verdad ---------- */

check('working de verdad sigue laburando',
      claims({ state: 'working', updatedAt: now - 5000, transcript: tmp }, now), true);
check('un turno mas viejo que el techo se descarta',
      claims({ state: 'working', updatedAt: now - WORKING_TTL_MS - 1, transcript: tmp }, now), false);

// El corte con Ctrl+C no dispara ningún hook: la marca en el transcript es lo
// único que lo delata.
fs.appendFileSync(tmp, JSON.stringify({
  message: { content: [{ type: 'text', text: '[Request interrupted by user]' }] }
}) + '\n');
touch(1000);
check('turno cortado con Ctrl+C -> no labura',
      claims({ state: 'working', updatedAt: now - 5000, transcript: tmp }, now), false);

fs.unlinkSync(tmp);
done('turn.js');
