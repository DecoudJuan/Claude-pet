/*
 * sessions.test.js — varias sesiones de Claude Code a la vez.
 *
 * Con una sesión todo esto es trivial y por eso estuvo mal mucho tiempo: el
 * pet resumía N sesiones en una fase y el resumen se comía los hechos. Las dos
 * reglas que fijan lo de acá:
 *
 *   la pose es del conjunto  — si alguna espera, el pet espera
 *   el aviso es de UNA       — "terminó" sin decir cuál no dice nada
 *
 * Y una tercera que es la que más se nota: nada se elige por el orden del
 * directorio. Ese orden es el id de sesión, que no tiene nada que ver con
 * quién se trabó primero.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const sessions = require(path.join(__dirname, '..', 'app', 'sessions.js'));
const { check, done } = require('./check.js');

const now = Date.now();

// Sin transcript la sesión no se puede desmentir: turn.js no inventa nada y
// los selectores quedan a merced del estado y del reloj, que es justo lo que
// se quiere probar acá. El transcript ya tiene sus tests en turn.test.js.
function ses(id, o) {
  return Object.assign({
    sessionId: id, cwd: '/tmp/' + id, transcript: '',
    state: 'idle', updatedAt: now, startedAt: now, finishedAt: null
  }, o);
}

// El primer vistazo del proyector no es noticia (ver abajo): esto lo gasta.
function boot(list) {
  const p = sessions.create();
  p.project(list || [], now, null);
  return p;
}

console.log('sessions.js — varias sesiones a la vez');

/* ---------- a quién mira cuando hay dos trabadas ---------- */

// Los ids están al revés a propósito: si el orden saliera del directorio —
// como salía — ganaría 'aaa', que se trabó recién.
const vieja = ses('zzz', { state: 'waiting', updatedAt: now - 30000, message: 'permiso Bash' });
const nueva = ses('aaa', { state: 'waiting', updatedAt: now - 2000, message: 'permiso Write' });

var s = boot().project([nueva, vieja], now, null);
check('manda la que espera hace mas rato', s.message, 'permiso Bash');
check('y avisa que hay otra trabada', s.others, 1);
check('una sola no avisa de mas', boot().project([vieja], now, null).others, 0);

/* ---------- laburando ---------- */

const lenta = ses('lenta', { state: 'working', updatedAt: now - 9000 });
const viva  = ses('viva',  { state: 'working', updatedAt: now - 1000 });

s = boot().project([lenta, viva], now, null);
check('la pose es laburar', s.phase, 'working');
check('muestra la que se movio recien', s.project, 'viva');
check('y las cuenta', s.count, 2);

// Una trabada tapa a las que laburan: es el caso caro, el que no puede avanzar
// solo. Lo que no se pierde es que las otras siguen.
s = boot().project([viva, vieja], now, null);
check('esperar le gana a laburar', s.phase, 'waiting');

/* ---------- el aviso de fin es de una sesion, no del conjunto ---------- */

const termino = ses('termino', { state: 'idle', startedAt: now - 60000, finishedAt: now - 500 });

// Esto es lo que antes no pasaba: con otra laburando, la fase seguía siendo
// 'working' para siempre y el final de la que terminó no se anunciaba nunca.
s = boot([viva]).project([viva, termino], now, null);
check('avisa aunque otra siga laburando', !!s.notice, true);
check('el avatar igual sigue tecleando', s.phase, 'working');
check('dice cual termino', s.notice.project, 'termino');
check('cuanto tardo', s.notice.took, 59500);
check('y que queda una laburando', s.notice.rest, 1);

// Sola, no hay resto que aclarar: "terminó" ahí sí quiere decir terminó todo.
s = boot().project([termino], now, null);
check('sin nadie mas, no hay resto', s.notice.rest, 0);

/* ---------- un final se cuenta una vez ---------- */

var p = boot([viva]);
p.project([viva, termino], now, null);
s = p.project([viva, termino], now + 1000, null);
check('el aviso se sostiene mientras dura', !!s.notice, true);
s = p.project([viva, termino], now + sessions.NOTICE_MS + 1000, null);
check('y despues se apaga', s.notice, null);
s = p.project([viva, termino], now + sessions.NOTICE_MS + 2000, null);
check('sin repetirse', s.notice, null);

/* ---------- lo que no es noticia ---------- */

// Al arrancar, el directorio ya está lleno de sesiones con su último final
// escrito. Nada de eso pasó recién.
p = sessions.create();
check('el primer vistazo no anuncia finales viejos', p.project([termino], now, null).notice, null);

const rancio = ses('rancio', {
  startedAt: now - 600000, finishedAt: now - sessions.NOTICE_FRESH_MS - 5000
});
check('un final de hace rato tampoco es noticia',
      boot([viva]).project([viva, rancio], now, null).notice, null);

// Un turno cortado con Ctrl+C no escribe finishedAt. Antes el pet decía
// "Terminó" igual — la única frase que se lee como un hecho, mintiendo.
const cortada = ses('cortada', { state: 'working', updatedAt: now - 20 * 60 * 1000 });
check('un turno cortado no anuncia nada',
      boot([cortada]).project([cortada], now, null).notice, null);
check('y no se queda tecleando', boot([cortada]).project([cortada], now, null).phase, 'idle');

/* ---------- sin tokens ---------- */

const seca = ses('seca', { limited: true, state: 'idle' });

check('una sesion sin tokens y nadie mas -> duerme',
      boot().project([seca], now, null).phase, 'sleeping');
// Con dos cuentas abiertas lo normal es que se agote una y la otra siga. Antes
// alcanzaba con que UNA estuviera marcada para dormir al pet entero.
check('pero si otra labura, no duerme',
      boot().project([seca, viva], now, null).phase, 'working');
// La statusline habla de la cuenta, no de una sesión: esa pesa por sí sola.
const out = { window: 'five_hour', resetsAt: now + 3600000, account: 'personal' };
check('la statusline manda igual', boot().project([viva], now, out).phase, 'sleeping');

/* ---------- ponerle nombre a cada una ---------- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-labels-'));
function repo(name, branch) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/' + branch + '\n');
  return dir;
}

var solo = sessions.labels([ses('a', { cwd: repo('claude-pets', 'main') })]);
check('una sola se llama por su carpeta', solo.a, 'claude-pets');

// Dos worktrees del mismo repo: la carpeta se llama igual en los dos lados y
// con basename(cwd) las dos sesiones se llamaban igual.
const wt = sessions.labels([
  ses('a', { cwd: repo(path.join('wt-1', 'claude-pets'), 'main') }),
  ses('b', { cwd: repo(path.join('wt-2', 'claude-pets'), 'fix/globo') })
]);
check('dos ramas distintas se separan por rama', wt.a, 'claude-pets · main');
check('cada una con la suya', wt.b, 'claude-pets · fix/globo');

// Misma carpeta y misma rama: no queda nada del proyecto que las distinga.
const misma = repo('claude-pets', 'main');
const dos = sessions.labels([
  ses('nueva', { cwd: misma, startedAt: now - 1000 }),
  ses('vieja', { cwd: misma, startedAt: now - 90000 })
]);
check('mismo repo y misma rama -> se numeran por antiguedad', dos.vieja, 'claude-pets #1');
check('y la de despues va segunda', dos.nueva, 'claude-pets #2');

// El desempate por rama no puede ensuciar al que no lo necesita.
const mixto = sessions.labels([
  ses('a', { cwd: repo(path.join('m-1', 'claude-pets'), 'main') }),
  ses('b', { cwd: repo(path.join('m-2', 'claude-pets'), 'fix/globo') }),
  ses('c', { cwd: repo('otra-cosa', 'main') })
]);
check('el que no colisiona queda limpio', mixto.c, 'otra-cosa');

fs.rmSync(tmp, { recursive: true, force: true });

done('sessions.js');
