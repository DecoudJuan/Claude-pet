/*
 * hook.js — lo ejecuta Claude Code en cada evento y deja el estado de la sesión
 * en un archivo que la ventana del pet vigila.
 *
 *   node hook.js start     (SessionStart)      — abrí el pet si no está
 *   node hook.js working   (UserPromptSubmit)  — arrancó a laburar
 *   node hook.js tool      (PreToolUse)        — sigue laburando, anota la tool
 *   node hook.js waiting   (Notification)      — necesita que le contestes
 *   node hook.js done      (Stop)              — terminó el turno
 *   node hook.js end       (SessionEnd)        — se cerró la sesión
 *
 * Claude Code le pasa el payload del evento por stdin. Sale siempre con 0 y sin
 * escribir nada en stdout: un hook que falla o que habla no tiene que romperle
 * el turno a nadie.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'),
  'claude-pets'
);
const DIR = path.join(ROOT, 'sessions');
const LOCK = path.join(ROOT, 'pet.lock');
const MUTED = path.join(ROOT, 'muted');   // lo cerraste a mano: no lo resucites
const APP_PATH = path.join(ROOT, 'app-path.json');   // dónde quedó instalada

const KIND = process.argv[2] || 'working';

let input = '';
let done = false;

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (d) { input += d; });
process.stdin.on('end', run);
process.stdin.on('error', run);
// si no llega stdin no nos quedamos colgados
setTimeout(run, 1000).unref();

function run() {
  if (done) return;
  done = true;
  try { write(); } catch (e) { /* el pet es decorativo: nunca romper el turno */ }
  process.exit(0);
}

/*
 * Claude Code manda Notification por dos motivos que no se parecen en nada:
 * te pide permiso para algo — y ahí el turno está frenado hasta que contestes,
 * que es el caso caro — o pasaron 60 s sin que escribas y te da un codazo. Lo
 * segundo no es una espera: ya contestó, la pelota es tuya y no hay nada
 * trabado. Tratarlos igual hacía que el pet sacara la notebook y dijera «te
 * espera» cuando no esperaba nada.
 *
 * Se descarta el codazo por su texto y no se filtra al revés — dejando pasar
 * sólo lo que diga "permission" — para que un aviso nuevo que sí frene el
 * turno se siga viendo en vez de desaparecer en silencio.
 */
function isIdleNudge(msg) {
  return /waiting for (your )?input/i.test(String(msg || ''));
}

// No intenta ser exhaustivo: si no matchea, el pet simplemente no se duerme.
function looksLimited(msg) {
  return /usage limit|rate limit|limit reached|out of tokens|sin tokens|l[ií]mite de uso/i
    .test(String(msg || ''));
}

function write() {
  let payload = {};
  try { payload = JSON.parse(input || '{}'); } catch (e) { /* sin payload, seguimos */ }

  // El codazo no dice nada que el pet no sepa: se sale sin tocar el archivo,
  // así el estado que ya había — trabajando, esperando, en reposo — queda como
  // estaba y no se le corre el updatedAt a nadie.
  if (KIND === 'waiting' && isIdleNudge(payload.message)) return;

  const id = String(payload.session_id || 'sin-id').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, id + '.json');

  if (KIND === 'end') {
    try { fs.unlinkSync(file); } catch (e) { /* ya no estaba */ }
    return;
  }

  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* primera vez */ }

  const now = Date.now();
  const state = KIND === 'done' || KIND === 'start' ? 'idle'
              : KIND === 'waiting' ? 'waiting'
              : 'working';
  const restarting = state === 'working' && prev.state !== 'working';

  fs.writeFileSync(file, JSON.stringify({
    sessionId: id,
    state: state,
    cwd: payload.cwd || prev.cwd || '',
    // El latido del turno: Ctrl+C no dispara ningún hook, pero el transcript
    // deja de crecer. Ver app/turn.js.
    transcript: payload.transcript_path || prev.transcript || '',
    lastTool: payload.tool_name || (KIND === 'done' ? '' : prev.lastTool || ''),
    // Notification trae en `message` qué está pidiendo ("Claude needs your
    // permission to use Bash"). Sin esto el globo sólo puede decir "te espera",
    // que es justo lo que no sirve saber.
    message: KIND === 'waiting' ? String(payload.message || '').slice(0, 160) : '',
    // Sin statusline no hay forma de saber que se acabaron los tokens, salvo
    // que Claude Code lo diga en el texto de un aviso. Es un plan B: alcanza
    // para saber QUE pasó, nunca para saber cuándo vuelve.
    limited: looksLimited(payload.message) || (prev.limited && KIND !== 'working') || false,
    startedAt: restarting ? now : (prev.startedAt || now),
    finishedAt: KIND === 'done' ? now : null,
    updatedAt: now
  }));

  // Una sesión nueva empieza limpia: si lo habías cerrado a mano, vuelve. Pero
  // sólo si de verdad es un arranque limpio — con otras sesiones abiertas, la
  // terminal nueva no es un empezar de cero, y resucitar el pet ahí es
  // desobedecer: lo cerraste hace dos minutos y vuelve porque abriste otra
  // pestaña. El silencio dura mientras dure la tanda.
  if (KIND === 'start' && !othersAlive(id)) {
    try { fs.unlinkSync(MUTED); } catch (e) { /* no estaba silenciado */ }
  }

  // 'working' y 'waiting' también lo levantan: si el pet se cayó o nunca
  // arrancó (hooks agregados con la sesión ya abierta), no queda huérfano.
  if (KIND === 'start' || KIND === 'working' || KIND === 'waiting') ensurePet();
}

// ¿Hay otra sesión de Claude Code viva ahora mismo? Se mira lo mismo que mira
// el pet — el directorio de estado — y con el mismo techo de 6 h, para que una
// sesión que se murió sin avisar (un reinicio, un cierre a lo bruto) no deje
// el pet silenciado para siempre.
const STALE_MS = 6 * 60 * 60 * 1000;

function othersAlive(self) {
  let names;
  try { names = fs.readdirSync(DIR); } catch (e) { return false; }
  const now = Date.now();
  return names.some(function (name) {
    if (!name.endsWith('.json') || name === self + '.json') return false;
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
      return now - (rec.updatedAt || 0) < STALE_MS;
    } catch (e) { return false; }
  });
}

// El pet vive mientras haya sesiones: lo abre SessionStart y él mismo se cierra
// cuando se va la última. El lock evita levantar un Electron al pedo en cada
// sesión nueva; el single-instance lock de Electron es el respaldo.
function ensurePet() {
  if (petAlive()) return;
  if (fs.existsSync(MUTED)) return;   // salió por el menú: respetalo

  const launch = resolveApp();
  if (!launch) return;   // ni instalada ni clonada: no hay nada que abrir

  const child = spawn(launch.bin, launch.args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

/*
 * Dos maneras de estar instalado:
 *   - empaquetada: el ejecutable se anuncia en app-path.json al arrancar
 *   - desde el repo: el electron de node_modules, con la raíz como argumento
 */
function resolveApp() {
  try {
    const p = JSON.parse(fs.readFileSync(APP_PATH, 'utf8'));
    if (p.packaged && p.exe && fs.existsSync(p.exe)) return { bin: p.exe, args: ['--auto'] };
    if (p.root && fs.existsSync(p.root)) {
      const b = electronIn(p.root);
      if (b) return { bin: b, args: [p.root, '--auto'] };
    }
  } catch (e) { /* todavía nunca arrancó */ }

  const root = path.join(__dirname, '..');
  const b = electronIn(root);
  return b ? { bin: b, args: [root, '--auto'] } : null;
}

function electronIn(root) {
  const bin = path.join(root, 'node_modules', 'electron', 'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron');
  return fs.existsSync(bin) ? bin : null;
}

function petAlive() {
  let held;
  try { held = JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch (e) { return false; }
  if (!held || !held.pid) return false;
  try {
    process.kill(held.pid, 0);   // no lo mata: pregunta si existe
    return true;
  } catch (e) {
    try { fs.unlinkSync(LOCK); } catch (e2) { /* alguien más lo limpió */ }
    return false;
  }
}
