/*
 * claude-pet — ventana de escritorio con el avatar.
 *
 * Transparente, sin marco, siempre encima, arrastrable. Vigila el directorio de
 * estado que escriben los hooks de Claude Code y traduce eso a los estados del
 * dibujo: trabajando / pensando / esperando permiso / listo.
 */
'use strict';

const { app, BrowserWindow, ipcMain, screen, Menu, shell, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const quota = require('./quota');
const sessions = require('./sessions');
const setup = require('./setup');
const update = require('./update');
const greeting = require('../core/greeting');

// El panel de ajustes mide siempre lo mismo, así que la ventana no puede ser
// más angosta que él: cambiar de tamaño mueve el alto y el avatar, nunca el
// ancho. El sobrante a los costados es transparente, no se ve.
// El alto deja lugar para que el panel abra ARRIBA del avatar en vez de
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
// Empaquetada, el hook no tiene forma de saber dónde quedó instalada la app:
// no hay node_modules al lado suyo. Se lo dejamos escrito en cada arranque.
const APP_PATH = path.join(ROOT, 'app-path.json');

// Lanzado por el hook SessionStart: vive mientras haya sesiones de Claude Code.
// Arrancado a mano (npm start) se queda hasta que lo cierres vos.
const AUTO = process.argv.includes('--auto');
const QUIT_AFTER_MS = 25000;   // gracia desde que se va la última sesión
const BOOT_GRACE_MS = 30000;   // no cerrarse apenas arranca
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

// Los controles van a la izquierda del avatar, salvo que la ventana esté
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

// Quién espera, quién labura y cuál acaba de terminar vive en app/sessions.js,
// fuera de Electron, para que se pueda testear de verdad. Acá queda sólo el
// pedazo que es de la app: cada cuánto se mira y a quién se le manda.
const scene = sessions.create();

let lastSent = '';
function pushState() {
  if (!win || win.isDestroyed()) return;

  const now = Date.now();
  const open = sessions.read(STATE_DIR, now);
  const s = scene.project(open, now, quota.exhausted(now));

  const key = JSON.stringify(s);
  if (key !== lastSent) {
    lastSent = key;
    win.webContents.send('state', s);
  }

  if (AUTO) maybeQuit(open.length, now);
}

// Sin sesiones de Claude Code el pet no tiene nada que mostrar: se va solo,
// pero recién después de que el globo de «terminó» haya tenido su momento.
function maybeQuit(count, now) {
  now = now || Date.now();
  if (count) { emptySince = 0; return; }
  if (!emptySince) { emptySince = now; return; }
  if (now - emptySince < QUIT_AFTER_MS) return;
  if (now - bootAt < BOOT_GRACE_MS) return;
  if (scene.talking(now)) return;
  farewell();
}

/* ---------- irse avisando ---------- */

// El pet no se cierra de golpe: avisa. La ventana muestra el «Bye!» y hay que
// darle el tiempo de que se vea — cerrar la app en el mismo tick sería mostrar
// una despedida que nadie llega a leer.
//
// Los 220 ms de más no son magia: es el viaje del mensaje por IPC más el
// cuadro en el que la animación arranca. Sin ese margen el adiós se corta
// justo al final, que es cuando el cartel se va subiendo.
const BYE_MS = greeting.MS + 220;
let leaving = false;

// Toda salida voluntaria pasa por acá: la X del hover, «Salir» del menú y el
// apagado solo cuando se fue la última sesión. app.quit() directo sigue
// existiendo para lo que no es voluntario — que no haya ventana, por ejemplo.
function farewell() {
  if (leaving) return;
  leaving = true;
  if (!win || win.isDestroyed()) { app.quit(); return; }
  win.webContents.send('farewell');
  setTimeout(function () { app.quit(); }, BYE_MS);
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
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,          // el renderer corre sin acceso a Node
      webviewTag: false,
      spellcheck: false,
      enableBlinkFeatures: ''
    }
  });

  win.loadFile(path.join(__dirname, 'window.html'));

  // La ventana no navega a ningún lado ni abre ventanas: es una sola página
  // local. Dejarlo explícito cierra el camino por el que un avatar de terceros
  // podría sacar la ventana de su propia página.
  win.webContents.setWindowOpenHandler(function () { return { action: 'deny' }; });
  win.webContents.on('will-navigate', function (e) { e.preventDefault(); });
  win.webContents.on('will-attach-webview', function (e) { e.preventDefault(); });

  // La ventana no tiene dónde mostrar un error: sin esto, un fallo del renderer
  // es una ventana muda y no hay forma de enterarse.
  // La firma cambió en Electron 37: antes (event, level, message, line, source)
  // con level numérico, ahora un solo objeto con level de texto. Soporta las dos
  // para que actualizar Electron no vuelva a dejar la ventana muda.
  win.webContents.on('console-message', function (a, level, message, line, source) {
    const e = (a && typeof a === 'object' && 'level' in a) ? a : null;
    const lvl = e ? e.level : level;
    const bad = lvl === 'error' || lvl === 'warning' || (typeof lvl === 'number' && lvl >= 2);
    if (!bad) return;
    const where = (e ? (e.sourceId + ':' + e.lineNumber) : (source + ':' + line));
    console.error('[pet] ' + where + ' ' + (e ? e.message : message));
  });
  win.webContents.on('render-process-gone', function (_e, d) {
    console.error('[pet] el renderer se cayó: ' + d.reason);
  });
  // 'screen-saver' es el nivel que queda por encima de la barra de tareas
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('closed', function () { win = null; });

  // El cursor de TODA la pantalla, no sólo el de la ventana. Lejos de la
  // ventana la mirada ya está en su tope, así que afinar el muestreo no se ve:
  // se sondea rápido sólo cerca, y el resto del tiempo a un cuarto del ritmo.
  let lastCursor = '';
  cursorTimer = setInterval(function () {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const b = win.getBounds();
    const p = screen.getCursorScreenPoint();
    const far = p.x < b.x - 500 || p.x > b.x + b.width + 500 ||
                p.y < b.y - 500 || p.y > b.y + b.height + 500;
    if (far && (Date.now() % 320) > 80) return;

    const x = p.x - b.x, y = p.y - b.y;
    const key = x + ',' + y;
    if (key === lastCursor) return;   // el mouse quieto no genera tráfico
    lastCursor = key;
    win.webContents.send('cursor', { x: x, y: y });
  }, 80);

  pollTimer = setInterval(pushState, 600);
  win.webContents.once('did-finish-load', function () {
    const c = readConf();
    win.webContents.send('conf', {
      size: SIZES[c.size] ? c.size : DEFAULT_SIZE,
      avatar: c.avatar || null,
      palette: c.palette || null,
      device: c.device || null,
      side: sideFor(win.getBounds()),
      updates: update.enabled(c),
      // Con la variable de ambiente puesta el interruptor no se puede mover: la
      // decisión la tomó quien lanzó el proceso, no quien mira la ventana.
      updatesLocked: !!process.env.CLAUDE_PET_NO_UPDATE_CHECK,
      version: app.getVersion()
    });
    lastSent = '';
    pushState();
    pushSetup();

    // El chequeo no va en el arranque: el pet aparece cuando abrís una terminal,
    // que es cuando la máquina está haciendo otras cosas. Treinta segundos
    // después no se lo lleva nadie por delante, y si el pet se cerró antes —
    // una sesión corta — directamente no llegó a preguntar.
    setTimeout(function () { checkUpdate(false); }, 30000).unref();
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

// Los ids vienen del renderer y terminan en un archivo de configuración, así
// que se acotan a lo que un id puede ser. Nada de acá se ejecuta ni se
// interpola en una ruta, pero un id de 4 MB tampoco tiene por qué caber.
function cleanId(v) {
  if (typeof v !== 'string') return null;
  const id = v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return id || null;
}

ipcMain.on('set-avatar', function (_e, pick) {
  writeConf({
    avatar: cleanId(pick && pick.avatar),
    palette: cleanId(pick && pick.palette),
    device: cleanId(pick && pick.device)
  });
});

// La X del hover: cerrar a mano lo silencia hasta la próxima sesión.
ipcMain.on('close-pet', function () {
  try { fs.writeFileSync(MUTED, String(Date.now())); } catch (e) { /* peor caso: vuelve */ }
  farewell();
});

// Instalada desde un .exe, nadie sabe dónde quedó hook.js. En vez de hacerte
// buscarlo, la app arma el bloque con sus propias rutas y te lo deja en el
// portapapeles listo para pegar.
function hookPath(name) {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, name);
}

// Dónde están nuestros scripts en ESTA instalación. Es lo único que app/setup.js
// no puede averiguar solo: empaquetada viven en resources/, clonada en app/.
function scripts() {
  return { hook: hookPath('hook.js'), statusline: hookPath('statusline.js') };
}

// El bloque que se copia al portapapeles, para el que prefiere pegarlo él.
function hooksConfig() {
  return JSON.stringify(setup.desired(scripts()), null, 2);
}

/* ---------- el paso que falta ---------- */

/*
 * El pet no sirve de nada sin los hooks puestos, y hasta la 1.3.0 la única
 * forma de enterarse de eso era preguntarle a Claude. Ahora la ventana lo
 * pregunta sola y ofrece hacerlo.
 *
 * Con --auto no se pregunta nada: si el pet lo levantó un hook, los hooks
 * están. Preguntarlo sería gastar una lectura de disco cada arranque para
 * confirmar lo que ya sabemos.
 */
function pushSetup(extra) {
  if (!win || win.isDestroyed()) return;
  const st = AUTO ? { installed: true } : setup.status(scripts());
  win.webContents.send('setup', Object.assign({
    installed: st.installed,
    broken: !!st.broken,
    file: st.file || setup.settingsPath()
  }, extra || {}));
}

ipcMain.on('install-hooks', function () {
  const r = setup.install(scripts());
  // El resultado va con el estado nuevo: la ventana muestra las dos cosas, si
  // salió bien y qué pasó con el statusLine que ya tenías.
  pushSetup({
    result: {
      ok: !!r.ok,
      changed: !!r.changed,
      error: r.error || null,
      backup: !!r.backup,
      delegated: (r.notes || []).indexOf('statusline:delegado') >= 0
    }
  });
});

ipcMain.on('copy-hooks', function () { clipboard.writeText(hooksConfig()); });

// Abrir la CARPETA y no el archivo: settings.json no tiene por qué tener un
// programa asociado, y en ese caso openPath no hace nada y parece que el botón
// está roto.
ipcMain.on('reveal-settings', function () {
  const f = setup.settingsPath();
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch (e) { /* ya estaba */ }
  if (fs.existsSync(f)) shell.showItemInFolder(f);
  else shell.openPath(path.dirname(f));
});

/* ---------- versión nueva ---------- */

/*
 * Lo único que este proyecto manda a la red, y sólo si lo dejás. Ver el
 * encabezado de app/update.js: qué pide, qué no manda y las tres formas de
 * apagarlo.
 *
 * Una vez por versión, y no vuelve a insistir: si ya te dijimos que salió la
 * 1.4.0, la próxima vez que hable va a ser por la 1.5.0.
 *
 * Eso no alcanzaba cuando el globo duraba doce segundos en blanco y negro:
 * avisar una única vez algo que se puede no ver es no avisar. Pero el arreglo
 * era que SE VEA, no que insista. Ahora va en color de acento, cabecea, el
 * avatar pega el salto y dura treinta segundos; con eso, repetirlo todos los
 * días es hinchar al pedo. Un adorno que te recuerda a diario que no lo
 * actualizaste es peor que uno viejo.
 */
function checkUpdate(force) {
  const conf = readConf();
  if (!update.enabled(conf)) return;

  update.check({
    current: app.getVersion(),
    conf: conf,
    lastCheck: conf.updateCheckedAt,
    force: !!force
  }, function (found, asked) {
    if (asked) writeConf({ updateCheckedAt: Date.now() });
    if (!found) return;
    // Ya te lo dijimos. `force` es el que acaba de prender el chequeo desde el
    // menú: ése quiere saber ahora, aunque se lo hayamos dicho antes.
    if (readConf().updateSeen === found.version && !force) return;
    writeConf({ updateSeen: found.version });
    if (win && !win.isDestroyed()) win.webContents.send('update', found);
  });
}

function setUpdates(on) {
  const want = !!on;
  writeConf({ updates: want });
  // Se prende y se apaga desde dos lados: el check del panel de bienvenida y el
  // menú del botón derecho. El que no lo tocó tiene que quedar mostrando lo
  // mismo, o el usuario ve dos respuestas distintas a la misma pregunta.
  if (win && !win.isDestroyed()) win.webContents.send('updates-pref', want);
  // Prendiéndolo se pregunta en el momento: el que acaba de activarlo quiere
  // saber ahora, no mañana.
  if (want) checkUpdate(true);
}

ipcMain.on('set-updates', function (_e, on) { setUpdates(on); });

ipcMain.on('open-releases', function (_e, url) {
  // La URL no viene del renderer por confianza sino por comodidad: se acepta
  // sólo si es del repo. Cualquier otra cosa abre la página de releases.
  const ok = typeof url === 'string' && url.indexOf(update.PAGE.slice(0, update.PAGE.lastIndexOf('/releases'))) === 0;
  shell.openExternal(ok ? url : update.PAGE);
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
    {
      // Lo único que este proyecto manda a la red, y se apaga acá. Con la
      // variable de ambiente puesta el ítem se ve pero no se puede mover: la
      // decisión la tomó quien lanzó el proceso.
      label: 'Avisarme de versiones nuevas',
      type: 'checkbox',
      enabled: !process.env.CLAUDE_PET_NO_UPDATE_CHECK,
      checked: update.enabled(readConf()),
      click: function (item) { setUpdates(item.checked); }
    },
    { type: 'separator' },
    {
      label: 'Instalar los hooks en Claude Code',
      click: function () {
        const r = setup.install(scripts());
        if (!r.ok) {
          dialog.showMessageBox(win, {
            type: 'warning',
            title: 'No se pudo',
            message: r.error === 'roto'
              ? 'Tu settings.json tiene un error de sintaxis.'
              : 'No se pudo escribir el archivo.',
            detail: r.error === 'roto'
              ? ['No lo tocamos: pisarlo sería borrarte lo que haya adentro.',
                 '', r.file].join('\n')
              : [String(r.detail || ''), '', r.file].join('\n'),
            buttons: ['Listo']
          });
          return;
        }
        const notes = r.notes || [];
        dialog.showMessageBox(win, {
          type: 'info',
          title: r.changed ? 'Listo' : 'Ya estaba',
          message: r.changed ? 'Los hooks quedaron instalados.' : 'Los hooks ya estaban puestos.',
          detail: [
            r.changed ? 'Abrí una terminal nueva y el pet empieza a seguirte.' : '',
            notes.indexOf('statusline:delegado') >= 0
              ? 'Tu statusLine no se tocó: el del pet se lo delega.' : '',
            r.backup ? 'Copia de tu archivo anterior al lado, con .bak- en el nombre.' : '',
            '', r.file
          ].filter(Boolean).join('\n'),
          buttons: ['Listo']
        });
        pushSetup();
      }
    },
    {
      label: 'Copiar configuración de hooks',
      click: function () {
        clipboard.writeText(hooksConfig());
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'Copiado',
          message: 'La configuración está en el portapapeles.',
          detail: [
            'Pegala dentro de ~/.claude/settings.json.',
            '',
            'Si ya tenías un statusLine propio no lo pises: pasáselo a este como',
            'delegado, con -- adelante del tuyo.'
          ].join('\n'),
          buttons: ['Listo']
        });
      }
    },
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
        farewell();
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
    try {
      fs.writeFileSync(APP_PATH, JSON.stringify({
        exe: process.execPath,
        packaged: app.isPackaged,
        root: app.isPackaged ? null : path.join(__dirname, '..'),
        version: app.getVersion(),
        writtenAt: Date.now()
      }));
    } catch (e) { /* el hook tiene un plan B */ }
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
