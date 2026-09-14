/*
 * claude-pet — ventana de escritorio con el pingüino.
 *
 * Transparente, sin marco, siempre encima, arrastrable. Vigila el directorio de
 * estado que escriben los hooks de Claude Code y traduce eso a los estados del
 * dibujo: trabajando / pensando / esperando permiso / listo.
 */
'use strict';

const { app, BrowserWindow, ipcMain, screen, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// El panel de ajustes mide siempre lo mismo, así que la ventana no puede ser
// más angosta que él: cambiar de tamaño mueve el alto y el avatar, nunca el
// ancho. El sobrante a los costados es transparente, no se ve.
// El alto deja lugar para que el panel abra ARRIBA del pingüino en vez de
// taparlo: así los controles del costado nunca quedan sepultados. Lo que sobra
// es transparente y, gracias al click-through, tampoco atrapa el mouse.
const SIZES = {
  s: { w: 240, h: 442 },
  m: { w: 240, h: 472 },
  l: { w: 288, h: 514 }
};
const DEFAULT_SIZE = 'm';

function sizeOf(key) { return SIZES[key] || SIZES[DEFAULT_SIZE]; }

const ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'),
  'claude-pets'
);
const STATE_DIR = path.join(ROOT, 'sessions');
const LOCK = path.join(ROOT, 'pet.lock');
const MUTED = path.join(ROOT, 'muted');

// Lanzado por el hook SessionStart: vive mientras haya sesiones de Claude Code.
// Arrancado a mano (npm start) se queda hasta que lo cierres vos.
const AUTO = process.argv.includes('--auto');
const QUIT_AFTER_MS = 25000;   // gracia desde que se va la última sesión
const BOOT_GRACE_MS = 30000;   // no cerrarse apenas arranca
const WAITING_TTL_MS = 40000;  // cuánto dura el aviso de «te espera»
const bootAt = Date.now();
let emptySince = 0;

let win = null;
let confPath = null;
let cursorTimer = null;
let pollTimer = null;
let dragTimer = null;

/* ---------- posición guardada ---------- */

function readConf() {
  try { return JSON.parse(fs.readFileSync(confPath, 'utf8')); } catch (e) { return {}; }
}

function writeConf(patch) {
  const next = Object.assign(readConf(), patch);
  try { fs.writeFileSync(confPath, JSON.stringify(next, null, 2)); } catch (e) { /* no pasa nada */ }
}

function defaultPosition(size) {
  // abajo a la izquierda, apoyado SOBRE la barra de tareas: workArea ya excluye
  // la barra, así que el borde inferior de la ventana va justo en su tope.
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + 14, y: wa.y + wa.height - size.h };
}

// Los controles van a la izquierda del pingüino, salvo que la ventana esté
// pegada al borde izquierdo de la pantalla y no quede lugar.
function sideFor(bounds) {
  const wa = screen.getDisplayMatching(bounds).workArea;
  // 12 px: sólo saltan si la ventana está literalmente pegada al borde. En su
  // lugar por defecto (x = 14) los botones quedan a la izquierda.
  return (bounds.x - wa.x) < 12 ? 'right' : 'left';
}

function pushSide() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('side', sideFor(win.getBounds()));
}

function onScreen(pos, size) {
  if (!pos || typeof pos.x !== 'number') return false;
  return screen.getAllDisplays().some(function (d) {
    const b = d.bounds;
    return pos.x + size.w > b.x && pos.x < b.x + b.width &&
           pos.y + size.h > b.y && pos.y < b.y + b.height;
  });
}

/* ---------- estado de las sesiones de Claude Code ---------- */

const STALE_MS = 6 * 60 * 60 * 1000;

function readSessions() {
  let names;
  try { names = fs.readdirSync(STATE_DIR); } catch (e) { return []; }
  const now = Date.now();
  const out = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(STATE_DIR, name);
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

let lastPhase = 'idle';
let doneUntil = 0;
let doneDetail = null;

function project(sessions) {
  const now = Date.now();

  // Cuando contestás un pedido de permiso no se dispara ningún hook hasta que
  // termina el turno, así que el aviso se apagaría recién ahí. Vence solo: a
  // los 40 s la sesión vuelve a contarse como trabajando, que es lo que pasó.
  const waiting = sessions.find(function (s) {
    return s.state === 'waiting' && now - (s.updatedAt || 0) < WAITING_TTL_MS;
  });
  const working = sessions.filter(function (s) {
    return s.state === 'working' ||
           (s.state === 'waiting' && now - (s.updatedAt || 0) >= WAITING_TTL_MS);
  });

  if (waiting) {
    lastPhase = 'waiting';
    doneUntil = 0;
    return {
      phase: 'waiting',
      project: label(waiting),
      message: waiting.message || '',
      tool: waiting.lastTool || ''
    };
  }

  if (working.length) {
    lastPhase = 'working';
    doneUntil = 0;
    const lead = working.sort(function (a, b) { return b.updatedAt - a.updatedAt; })[0];
    return {
      phase: 'working',
      project: label(lead),
      tool: lead.lastTool || '',
      since: lead.startedAt || lead.updatedAt,
      count: working.length
    };
  }

  // nadie trabajando: si veníamos de trabajar, avisamos
  if (lastPhase === 'working' || lastPhase === 'waiting') {
    const justDone = sessions
      .filter(function (s) { return s.finishedAt; })
      .sort(function (a, b) { return b.finishedAt - a.finishedAt; })[0];
    doneUntil = now + 20000;
    doneDetail = justDone
      ? { project: label(justDone), took: Math.max(0, (justDone.finishedAt - (justDone.startedAt || justDone.finishedAt))) }
      : { project: '', took: 0 };
    lastPhase = 'done';
  }

  if (now < doneUntil) {
    return Object.assign({ phase: 'done' }, doneDetail);
  }

  lastPhase = 'idle';
  return { phase: 'idle' };
}

function label(rec) {
  if (!rec || !rec.cwd) return '';
  return path.basename(rec.cwd);
}

let lastSent = '';
function pushState() {
  if (!win || win.isDestroyed()) return;

  const sessions = readSessions();
  const s = project(sessions);

  const key = JSON.stringify(s);
  if (key !== lastSent) {
    lastSent = key;
    win.webContents.send('state', s);
  }

  if (AUTO) maybeQuit(sessions.length);
}

// Sin sesiones de Claude Code el pet no tiene nada que mostrar: se va solo,
// pero recién después de que el globo de «terminó» haya tenido su momento.
function maybeQuit(count) {
  const now = Date.now();
  if (count) { emptySince = 0; return; }
  if (!emptySince) { emptySince = now; return; }
  if (now - emptySince < QUIT_AFTER_MS) return;
  if (now - bootAt < BOOT_GRACE_MS) return;
  if (now < doneUntil) return;
  app.quit();
}

/* ---------- ventana ---------- */

function createWindow() {
  const conf = readConf();
  const size = sizeOf(conf.size);
  const pos = onScreen(conf.position, size) ? conf.position : defaultPosition(size);

  win = new BrowserWindow({
    width: size.w,
    height: size.h,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'pet.html'));

  // La ventana no tiene dónde mostrar un error: sin esto, un fallo del renderer
  // es una ventana muda y no hay forma de enterarse.
  win.webContents.on('console-message', function (_e, level, message, line, source) {
    if (level >= 2) console.error('[pet] ' + source + ':' + line + ' ' + message);
  });
  win.webContents.on('render-process-gone', function (_e, d) {
    console.error('[pet] el renderer se cayó: ' + d.reason);
  });
  // 'screen-saver' es el nivel que queda por encima de la barra de tareas
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('closed', function () { win = null; });

  // el cursor de TODA la pantalla, no sólo el de la ventana
  cursorTimer = setInterval(function () {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const p = screen.getCursorScreenPoint();
    const b = win.getBounds();
    win.webContents.send('cursor', { x: p.x - b.x, y: p.y - b.y });
  }, 80);

  pollTimer = setInterval(pushState, 400);
  win.webContents.once('did-finish-load', function () {
    const c = readConf();
    win.webContents.send('conf', {
      size: SIZES[c.size] ? c.size : DEFAULT_SIZE,
      avatar: c.avatar || null,
      palette: c.palette || null,
      device: c.device || null,
      side: sideFor(win.getBounds())
    });
    lastSent = '';
    pushState();
  });
}

/* ---------- arrastre ---------- */

ipcMain.on('drag-start', function () {
  if (!win || dragTimer) return;
  const start = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const dx = start.x - b.x;
  const dy = start.y - b.y;
  dragTimer = setInterval(function () {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    win.setPosition(p.x - dx, p.y - dy, false);
  }, 16);
});

ipcMain.on('drag-end', function () {
  if (!dragTimer) return;
  clearInterval(dragTimer);
  dragTimer = null;
  if (win && !win.isDestroyed()) {
    const b = win.getBounds();
    writeConf({ position: { x: b.x, y: b.y } });
    pushSide();
  }
});

// Redimensiona anclando la esquina INFERIOR izquierda: si anclara la superior,
// cambiar de tamaño lo despegaría de la barra de tareas.
ipcMain.on('set-size', function (_e, key) {
  if (!win || win.isDestroyed() || !SIZES[key]) return;
  const s = SIZES[key];
  const b = win.getBounds();
  win.setBounds({ x: b.x, y: b.y + b.height - s.h, width: s.w, height: s.h });
  pushSide();
  writeConf({ size: key, position: { x: b.x, y: b.y + b.height - s.h } });
});

// La ventana es un rectángulo transparente enorme: si atajara el mouse en todo
// su ancho, taparía clicks del escritorio y se "activaría" pasando cerca. Vive
// ignorando el mouse (forward: true para seguir recibiendo los movimientos) y
// el renderer la despierta sólo cuando el puntero está sobre algo dibujado.
ipcMain.on('interactive', function (_e, on) {
  if (!win || win.isDestroyed()) return;
  win.setIgnoreMouseEvents(!on, { forward: true });
});

ipcMain.on('set-avatar', function (_e, pick) {
  writeConf({
    avatar: (pick && pick.avatar) || null,
    palette: (pick && pick.palette) || null,
    device: (pick && pick.device) || null
  });
});

// La X del hover: cerrar a mano lo silencia hasta la próxima sesión.
ipcMain.on('close-pet', function () {
  try { fs.writeFileSync(MUTED, String(Date.now())); } catch (e) { /* peor caso: vuelve */ }
  app.quit();
});

ipcMain.on('menu', function () {
  if (!win) return;
  Menu.buildFromTemplate([
    {
      label: 'Volver abajo a la izquierda',
      click: function () {
        const b = win.getBounds();
        const p = defaultPosition({ w: b.width, h: b.height });
        win.setPosition(p.x, p.y, false);
        writeConf({ position: p });
      }
    },
    {
      label: 'Siempre encima',
      type: 'checkbox',
      checked: win.isAlwaysOnTop(),
      click: function (item) { win.setAlwaysOnTop(item.checked, 'screen-saver'); }
    },
    { type: 'separator' },
    {
      label: 'Abrir carpeta de estado',
      click: function () { shell.openPath(STATE_DIR); }
    },
    { type: 'separator' },
    {
      // Salir a mano lo silencia hasta la próxima sesión: si lo cerraste vos,
      // el hook no tiene por qué devolvértelo en el prompt siguiente.
      label: 'Salir (vuelve en la próxima sesión)',
      click: function () {
        try { fs.writeFileSync(MUTED, String(Date.now())); } catch (e) { /* peor caso: vuelve */ }
        app.quit();
      }
    }
  ]).popup({ window: win });
});

/* ---------- arranque ---------- */

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (win) { win.show(); win.setAlwaysOnTop(true, 'screen-saver'); }
  });

  app.whenReady().then(function () {
    confPath = path.join(app.getPath('userData'), 'pet.json');
    try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch (e) { /* ya existe */ }
    try { fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, startedAt: bootAt })); } catch (e) { /* el hook igual tiene el single-instance lock de respaldo */ }
    createWindow();
  });

  app.on('window-all-closed', function () { app.quit(); });

  app.on('will-quit', function () {
    clearInterval(cursorTimer);
    clearInterval(pollTimer);
    clearInterval(dragTimer);
    try {
      const held = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
      if (held.pid === process.pid) fs.unlinkSync(LOCK);
    } catch (e) { /* no era nuestro, o ya no está */ }
  });
}
