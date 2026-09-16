/*
 * sessions.js — de N sesiones de Claude Code a una sola escena.
 *
 * El hook escribe un archivo por sesión. El pet tiene un avatar y un globo.
 * Este módulo es el que traduce de lo uno a lo otro, y toda la dificultad está
 * en que son dos preguntas distintas y no una:
 *
 *   la POSE   — qué está pasando, en conjunto. Es un máximo: si alguna espera,
 *               el pet espera; si alguna labura, el pet labura.
 *   el AVISO  — qué acaba de pasar, y en cuál. Es un hecho puntual, de una
 *               sesión, y no se deja resumir: "terminó" sin decir cuál, con
 *               tres sesiones abiertas, no dice nada.
 *
 * Antes eran lo mismo — una sola fase — y por eso la sesión que terminaba
 * mientras otra seguía laburando no lo anunciaba nunca: la pose ganaba y el
 * hecho se perdía. Ahora la pose sigue siendo el máximo y el aviso viaja
 * aparte, con nombre y apellido.
 *
 * Vive fuera de main.js para que se pueda importar sin Electron: las reglas de
 * quién espera y quién labura son lo que más se rompe y tienen que ser lo más
 * fácil de testear. (Antes el test las copiaba a mano y avisaba que era un
 * espejo. Ya no hay espejo.)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const turn = require('./turn.js');

// Un archivo más viejo que esto es basura de una sesión que se fue sin avisar.
const STALE_MS = 6 * 60 * 60 * 1000;
// Cuánto cabecea el aviso de «te espera». El aviso en sí no vence — dura lo
// que dure el turno frenado; esto es sólo hasta cuándo insiste.
const WAITING_TTL_MS = 40000;
// Si cancelás un turno con Ctrl+C puede no dispararse ningún hook, y la sesión
// se quedaría en "working" para siempre: el avatar tecleando solo. Este techo
// es la garantía de que eso no pasa. Generoso a propósito — un turno largo de
// verdad tiene que poder durar.
const WORKING_TTL_MS = 15 * 60 * 1000;

// Cuánto se queda el aviso de fin. Si hay otro haciendo cola dura menos: son
// noticias, y una noticia vieja tapando a la siguiente deja de ser noticia.
const NOTICE_MS = 20000;
const NOTICE_QUEUED_MS = 8000;
// Un fin de hace un rato no es novedad. Cubre el arranque del pet y cualquier
// hueco en el que nadie estuvo mirando.
const NOTICE_FRESH_MS = 30000;
// Con más que esto en la cola, lo viejo se tira: nadie quiere enterarse de
// seis finales seguidos.
const QUEUE_MAX = 3;

/* ---------- leer el directorio ---------- */

function read(dir, now) {
  let names;
  try { names = fs.readdirSync(dir); } catch (e) { return []; }
  now = now || Date.now();
  const out = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    let rec;
    try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { continue; }
    if (!rec || now - (rec.updatedAt || 0) > STALE_MS) {
      try { fs.unlinkSync(file); } catch (e) { /* ya no está */ }
      continue;
    }
    out.push(rec);
  }
  return out;
}

/* ---------- quién espera y quién labura ---------- */

// Cuando contestás un pedido de permiso no se dispara ningún hook hasta que
// termina el turno: el archivo sigue diciendo "waiting" mientras el trabajo ya
// se reanudó. Lo que separa haberlo contestado de haberlo dejado ahí es el
// transcript — contestar hace trabajo y el trabajo se escribe.
function answered(s) {
  return turn.movedSince(s, s.updatedAt);
}

// Mientras no aparezca esa prueba, el turno sigue frenado y el pet lo sigue
// diciendo. No vence: un turno trabado es el caso que más caro sale, y callarse
// a los 40 s es callarse justo cuando te fuiste a hacer otra cosa.
function waits(s, now) {
  if (s.state !== 'waiting') return false;
  // Sin transcript no hay con qué desmentirlo, y un aviso que no se puede dar
  // por contestado no se apagaría nunca. Ahí vale sólo la ventana corta.
  if (!s.transcript) return now - (s.updatedAt || 0) < WAITING_TTL_MS;
  return !answered(s);
}

function works(s, now) {
  if (now - (s.updatedAt || 0) >= WORKING_TTL_MS) return false;
  // Decir que trabaja no alcanza: si cortaste el turno con Ctrl+C ningún hook
  // lo avisa, así que se confirma contra el latido del transcript.
  return (s.state === 'working' ||
          (s.state === 'waiting' && answered(s))) && turn.isActive(s, now);
}

function insists(s, now) {
  return now - (s.updatedAt || 0) < WAITING_TTL_MS;
}

/* ---------- ponerle nombre a cada una ---------- */

// Dos terminales sobre el mismo repo es el caso más común que hay, y con
// basename(cwd) las dos se llaman igual: el globo dice "terminó claude-pets" y
// no sabés cuál de las dos. Se desempata con lo que el usuario pueda
// reconocer — primero la rama, que es lo que de verdad distingue dos ventanas,
// y recién si eso tampoco alcanza un ordinal por antigüedad.
function labels(sessions) {
  const out = Object.create(null);
  const groups = Object.create(null);

  for (const s of sessions) {
    const base = s.cwd ? path.basename(s.cwd) : '';
    out[s.sessionId] = base;
    (groups[base] = groups[base] || []).push(s);
  }

  for (const base of Object.keys(groups)) {
    const group = groups[base];
    if (!base || group.length < 2) continue;

    const branches = group.map(function (s) { return branchOf(s.cwd); });
    const distinct = branches.filter(function (b, i) {
      return b && branches.indexOf(b) === i;
    }).length;

    // La rama sólo sirve si de verdad separa: dos sesiones en la misma rama
    // con la rama escrita al lado siguen siendo indistinguibles, y encima más
    // largas.
    if (distinct === branches.length) {
      group.forEach(function (s, i) { out[s.sessionId] = base + ' · ' + branches[i]; });
      continue;
    }

    // Mismo repo y misma rama: no queda nada del proyecto que las separe, así
    // que se numeran por antigüedad. Es estable mientras las dos vivan, que es
    // todo lo que hace falta para saber cuál te habló.
    group.slice()
      .sort(function (a, b) { return started(a) - started(b); })
      .forEach(function (s, i) { out[s.sessionId] = base + ' #' + (i + 1); });
  }

  return out;
}

function started(s) { return s.startedAt || s.updatedAt || 0; }

// Parsear .git/HEAD cuesta poco, pero esto corre varias veces por segundo: se
// recuerda por mtime, igual que la cola del transcript.
const branches = new Map();

function branchOf(cwd) {
  if (!cwd) return '';
  const head = path.join(cwd, '.git', 'HEAD');
  let st;
  // Un worktree tiene .git como archivo, no como carpeta: ahí no hay HEAD que
  // leer y no vale la pena perseguirlo. Sin rama, se cae al ordinal.
  try { st = fs.statSync(head); } catch (e) { return ''; }

  const key = head + ':' + st.mtimeMs;
  if (branches.has(key)) return branches.get(key);

  let name = '';
  try {
    const raw = fs.readFileSync(head, 'utf8').trim();
    const m = /^ref:\s*refs\/heads\/(.+)$/.exec(raw);
    // En detached HEAD no hay nombre: el hash no le dice nada a nadie.
    name = m ? m[1] : '';
  } catch (e) { /* sin rama */ }

  if (branches.size > 32) branches.clear();
  branches.set(key, name);
  return name;
}

/* ---------- la escena ---------- */

// El proyector tiene memoria — qué finales ya contó y cuáles están haciendo
// cola —, así que es un objeto y no una función suelta. Uno por pet.
function create() {
  const announced = Object.create(null);   // sessionId -> finishedAt ya contado
  let seeded = false;                      // el primer vistazo no es noticia
  let queue = [];
  let notice = null;
  let noticeUntil = 0;

  /*
   * Los finales se detectan por sesión y contra su propio finishedAt, no
   * mirando si el conjunto se quedó quieto. Esa es la diferencia con lo de
   * antes: la sesión que termina mientras las otras siguen laburando también
   * tiene su aviso, porque su final es suyo y no del conjunto.
   */
  function collect(sessions, now, byId) {
    const live = Object.create(null);

    for (const s of sessions) {
      live[s.sessionId] = true;
      if (!s.finishedAt) continue;
      if (announced[s.sessionId] === s.finishedAt) continue;
      announced[s.sessionId] = s.finishedAt;

      // Al arrancar, el directorio ya está lleno de sesiones con su último
      // final escrito. Nada de eso pasó recién: se anota como contado y se
      // sigue, o el pet abre la boca con noticias de hace media hora.
      if (!seeded) continue;
      if (now - s.finishedAt > NOTICE_FRESH_MS) continue;

      queue.push({
        sessionId: s.sessionId,
        project: byId[s.sessionId] || '',
        took: Math.max(0, s.finishedAt - (s.startedAt || s.finishedAt))
      });
    }

    // Un turno cortado con Ctrl+C no escribe finishedAt, y acá eso es a
    // propósito: se apaga sin avisar. Decir "terminó" de algo que cortaste
    // sería la única frase del pet que se lee como un hecho, mintiendo.

    for (const id of Object.keys(announced)) {
      if (!live[id]) delete announced[id];
    }
    if (queue.length > QUEUE_MAX) queue = queue.slice(-QUEUE_MAX);
    seeded = true;
  }

  function pick(now, working) {
    if (notice && now >= noticeUntil) notice = null;
    if (!notice && queue.length) {
      notice = queue.shift();
      noticeUntil = now + (queue.length ? NOTICE_QUEUED_MS : NOTICE_MS);
    }
    if (!notice) return null;
    // Cuántas siguen después de ésta. Es la mitad que faltaba del aviso: sin
    // esto, "terminó" con dos sesiones abiertas se lee como "terminó todo".
    const rest = working.filter(function (s) { return s.sessionId !== notice.sessionId; }).length;
    return { project: notice.project, took: notice.took, rest: rest };
  }

  /*
   * `out` es lo que diga la statusline sobre la cuota (app/quota.js), que es
   * conocimiento de la cuenta y no de una sesión: por eso entra por parámetro
   * en vez de leerse acá.
   */
  function project(sessions, now, out) {
    now = now || Date.now();
    const byId = labels(sessions);

    collect(sessions, now, byId);

    const waiting = sessions.filter(function (s) { return waits(s, now); })
      .sort(byOldest);
    const working = sessions.filter(function (s) { return works(s, now); })
      .sort(byNewest);

    const scene = { notice: pick(now, working) };

    // Primero que todo: sin tokens no hay nada que hacer. Si no, el avatar se
    // queda tecleando delante de una terminal que no puede avanzar — que es
    // justo el caso en el que más molesta.
    //
    // `limited` sale del texto de un aviso y es de UNA sesión. Que una se haya
    // quedado sin tokens no dice nada de las demás — con dos cuentas abiertas,
    // lo normal es que la otra siga andando —, así que sólo duerme al pet si
    // no hay ninguna laburando que lo desmienta. La statusline sí es de la
    // cuenta y pesa por sí sola.
    const flagged = sessions.some(function (s) { return s.limited; });
    if (out || (flagged && !working.length)) {
      return Object.assign(scene, {
        phase: 'sleeping',
        window: out ? out.window : null,
        resetsAt: out ? out.resetsAt : null,
        account: out ? out.account : null
      });
    }

    if (waiting.length) {
      const first = waiting[0];
      return Object.assign(scene, {
        phase: 'waiting',
        project: byId[first.sessionId] || '',
        message: first.message || '',
        tool: first.lastTool || '',
        // El aviso queda; lo que se calma es el cabeceo. Insistir para siempre
        // deja de ser un aviso y pasa a ser ruido de fondo, que se ignora igual.
        insist: insists(first, now),
        // Las otras trabadas. Contestar la que el globo nombra y que aparezca
        // una segunda sin haberla visto venir es peor que saber que estaba.
        others: waiting.length - 1
      });
    }

    if (working.length) {
      const lead = working[0];
      return Object.assign(scene, {
        phase: 'working',
        project: byId[lead.sessionId] || '',
        tool: lead.lastTool || '',
        since: lead.startedAt || lead.updatedAt,
        count: working.length
      });
    }

    return Object.assign(scene, { phase: 'idle' });
  }

  // ¿Queda algo por decir? El pet no se cierra con un aviso a medio mostrar.
  function talking(now) {
    return !!(notice || queue.length) && (now || Date.now()) < noticeUntil;
  }

  return { project: project, talking: talking };
}

// La que espera hace más rato manda: es la que lleva más tiempo trabada, y con
// dos avisos abiertos el orden del directorio — el id de sesión — no tiene
// nada que ver con eso. El id desempata sólo para que no titile entre dos.
function byOldest(a, b) {
  return (a.updatedAt || 0) - (b.updatedAt || 0) ||
         String(a.sessionId).localeCompare(String(b.sessionId));
}

// La que se movió recién es la que está más viva, y es la que el pet muestra.
function byNewest(a, b) {
  return (b.updatedAt || 0) - (a.updatedAt || 0) ||
         String(a.sessionId).localeCompare(String(b.sessionId));
}

module.exports = {
  read: read,
  create: create,
  labels: labels,
  answered: answered,
  waits: waits,
  works: works,
  insists: insists,
  WAITING_TTL_MS: WAITING_TTL_MS,
  WORKING_TTL_MS: WORKING_TTL_MS,
  STALE_MS: STALE_MS,
  NOTICE_MS: NOTICE_MS,
  NOTICE_QUEUED_MS: NOTICE_QUEUED_MS,
  NOTICE_FRESH_MS: NOTICE_FRESH_MS
};
