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

function write() {
  let payload = {};
  try { payload = JSON.parse(input || '{}'); } catch (e) { /* sin payload, seguimos */ }

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
    lastTool: payload.tool_name || (KIND === 'done' ? '' : prev.lastTool || ''),
    // Notification trae en `message` qué está pidiendo ("Claude needs your
    // permission to use Bash"). Sin esto el globo sólo puede decir "te espera",
    // que es justo lo que no sirve saber.
    message: KIND === 'waiting' ? String(payload.message || '').slice(0, 160) : '',
    startedAt: restarting ? now : (prev.startedAt || now),
    finishedAt: KIND === 'done' ? now : null,
    updatedAt: now
  }));

  // Una sesión nueva empieza limpia: si lo habías cerrado a mano, vuelve.
  if (KIND === 'start') {
    try { fs.unlinkSync(MUTED); } catch (e) { /* no estaba silenciado */ }
  }

  // 'working' y 'waiting' también lo levantan: si el pet se cayó o nunca
  // arrancó (hooks agregados con la sesión ya abierta), no queda huérfano.
  if (KIND === 'start' || KIND === 'working' || KIND === 'waiting') ensurePet();
}

// El pet vive mientras haya sesiones: lo abre SessionStart y él mismo se cierra
// cuando se va la última. El lock evita levantar un Electron al pedo en cada
// sesión nueva; el single-instance lock de Electron es el respaldo.
function ensurePet() {
  if (petAlive()) return;
  if (fs.existsSync(MUTED)) return;   // salió por el menú: respetalo

  const bin = path.join(
    __dirname, 'node_modules', 'electron', 'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron'
  );
  if (!fs.existsSync(bin)) return;   // sin npm install no hay nada que abrir

  const child = spawn(bin, [__dirname, '--auto'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
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
