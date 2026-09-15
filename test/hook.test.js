/*
 * hook.test.js — qué deja escrito el hook para cada evento de Claude Code.
 *
 * Corre hook.js de verdad, como proceso, contra un LOCALAPPDATA descartable:
 * es la única forma de probar lo que importa, que es el archivo que queda.
 *
 * El caso central: Notification llega por dos motivos que no se parecen —
 * te piden permiso (el turno está frenado) o pasaron 60 s sin que escribas
 * (no hay nada frenado). Sólo el primero es una espera.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { check, done } = require('./check.js');

const HOOK = path.join(__dirname, '..', 'app', 'hook.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-hook-'));
const file = path.join(root, 'claude-pets', 'sessions', 'S1.json');

function fire(kind, payload) {
  execFileSync(process.execPath, [HOOK, kind], {
    input: JSON.stringify(Object.assign({ session_id: 'S1' }, payload)),
    // HOME además de LOCALAPPDATA: fuera de Windows el hook cae en ~/.local/share
    env: Object.assign({}, process.env, { LOCALAPPDATA: root, HOME: root }),
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function rec() {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; }
}

function state() { return rec().state || '(sin archivo)'; }

console.log('hook.js — el estado que queda escrito');

fire('working', { cwd: path.join('C:', 'tmp', 'proj') });
check('arranca laburando', state(), 'working');

fire('done', {});
check('termina el turno', state(), 'idle');

fire('waiting', { message: 'Claude is waiting for your input' });
check('el codazo de inactividad no lo pone a esperar', state(), 'idle');

fire('waiting', { message: 'Claude needs your permission to use Bash' });
check('el pedido de permiso si lo pone a esperar', state(), 'waiting');
check('y el globo repite qué está pidiendo',
      rec().message, 'Claude needs your permission to use Bash');

fire('waiting', { message: 'Some new blocking thing nobody predicted' });
check('un aviso desconocido se sigue viendo', state(), 'waiting');

// Un turno vivo no se toca: el codazo no escribe nada, ni siquiera updatedAt,
// que es lo que le extendería el techo de 15 minutos a la sesión.
fire('working', {});
const before = rec().updatedAt;
fire('waiting', { message: 'Claude is waiting for your input' });
check('el codazo no interrumpe un turno vivo', state(), 'working');
check('ni le corre el updatedAt', rec().updatedAt, before);

fire('end', {});
check('al cerrar la sesion no queda rastro', fs.existsSync(file), false);

fs.rmSync(root, { recursive: true, force: true });
done('hook.js');
