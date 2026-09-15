/*
 * turn.test.js — cuándo una sesión cuenta como que está laburando.
 *
 * Fija la regla que separa contestar un pedido de permiso de dejarlo ahí: un
 * aviso que vence NO prueba que hayas contestado, prueba que pasaron 40 s. Lo
 * que sí lo prueba es el transcript, porque contestar hace trabajo y el
 * trabajo se escribe.
 *
 * Replica el filtro de project() en app/main.js, que vive dentro del proceso
 * principal de Electron y no se puede importar suelto. Si allá cambia la
 * regla, este espejo tiene que cambiar con ella.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const turn = require(path.join(__dirname, '..', 'app', 'turn.js'));
const { check, done } = require('./check.js');

const WAITING_TTL_MS = 40000;
const WORKING_TTL_MS = 15 * 60 * 1000;

function claims(s, now) {
  if (now - (s.updatedAt || 0) >= WORKING_TTL_MS) return false;
  const answered = s.state === 'waiting' &&
                   now - (s.updatedAt || 0) >= WAITING_TTL_MS &&
                   turn.movedSince(s, s.updatedAt);
  return (s.state === 'working' || answered) && turn.isActive(s, now);
}

const tmp = path.join(os.tmpdir(), 'pet-transcript-' + Date.now() + '.jsonl');
fs.writeFileSync(tmp, JSON.stringify({ type: 'user' }) + '\n');

const now = Date.now();
const notifiedAt = now - 60000;        // el aviso llegó hace 60 s

function touch(msAgo) {
  const t = new Date(now - msAgo);
  fs.utimesSync(tmp, t, t);
}

console.log('turn.js — quién está laburando');

touch(90000);                          // nada se escribió después del aviso
check('aviso sin contestar -> no labura',
      claims({ state: 'waiting', updatedAt: notifiedAt, transcript: tmp }, now), false);

touch(5000);                           // contestaste: el turno siguió
check('aviso contestado -> labura',
      claims({ state: 'waiting', updatedAt: notifiedAt, transcript: tmp }, now), true);

check('aviso fresco todavia no se promueve',
      claims({ state: 'waiting', updatedAt: now - 5000, transcript: tmp }, now), false);

check('working de verdad sigue laburando',
      claims({ state: 'working', updatedAt: now - 5000, transcript: tmp }, now), true);

check('sin transcript no se inventa trabajo',
      claims({ state: 'waiting', updatedAt: notifiedAt, transcript: '' }, now), false);

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
