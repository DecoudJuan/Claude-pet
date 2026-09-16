/*
 * setup.js — dejar los hooks del pet dentro de ~/.claude/settings.json.
 *
 * Hasta ahora el pet te copiaba el bloque al portapapeles y vos lo fusionabas a
 * mano. Eso funciona si ya sabés que el botón derecho existe, que el archivo se
 * llama settings.json y cómo se mezclan dos objetos JSON sin romper el que ya
 * tenías. Es demasiado para un adorno: el que lo baja de un .exe no tiene por
 * qué pedirle a Claude que se lo instale.
 *
 * Fusionar, no pisar. Este archivo es del usuario y casi nunca está vacío: ahí
 * viven sus permisos, su modelo, sus propios hooks. La regla es que todo lo que
 * no sea nuestro sale intacto, y que instalar dos veces deje lo mismo que
 * instalar una.
 *
 * Todo el trabajo pesado son funciones puras sobre objetos — merge(), ours(),
 * installed() — para que los casos raros se puedan testear sin tocar el disco
 * de nadie. install() es la única que escribe.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Los seis eventos que el pet escucha. El orden es el del ciclo de vida de una
// sesión, no alfabético: se lee como la historia que cuentan.
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'Notification', 'Stop', 'StopFailure', 'SessionEnd'];

function settingsPath(home) {
  return path.join(home || os.homedir(), '.claude', 'settings.json');
}

// settings.json es JSON: una ruta de Windows con backslashes habría que
// escaparla dos veces. Con barras normales funciona igual y se lee.
function toPosix(p) { return String(p).split(path.sep).join('/'); }

/*
 * Un hook nuestro se reconoce por la ruta del script, no por el comando
 * entero. El argumento cambia con el evento (start, working, done…) y el
 * timeout puede haber cambiado entre versiones; lo único estable es que apunta
 * a nuestro hook.js.
 *
 * Se compara en minúsculas porque en Windows la misma ruta aparece escrita de
 * las dos formas según quién la haya generado — el instalador la escribe con
 * C:\, el hook con c:\ — y un reinstalar que no se reconozca a sí mismo deja
 * los dos bloques puestos y dispara cada hook dos veces.
 */
function mentions(command, script) {
  if (typeof command !== 'string' || !script) return false;
  return command.toLowerCase().indexOf(toPosix(script).toLowerCase()) >= 0;
}

/*
 * La ruta actual no alcanza para reconocernos. El caso es corriente: probaste
 * el pet clonado, después lo instalaste de un .exe, y el bloque viejo apunta a
 * un hook.js que sigue existiendo en la copia del repo. Como no coincide con la
 * ruta nueva, se quedaría — y entonces cada turno dispara los hooks dos veces,
 * dos Electron se pelean por el mismo pet.lock, y el que lo sufre no tiene
 * forma de saber por qué.
 *
 * Así que además de la ruta exacta se reconoce la FORMA del comando: un
 * archivo llamado hook.js seguido de uno de nuestros seis argumentos. Es
 * específico — nadie escribe `hook.js waiting` por casualidad — y el error que
 * podría cometer es sacar un hook ajeno que se llame igual y use las mismas
 * palabras. Preferimos ese riesgo a acumular bloques duplicados: lo primero es
 * improbable y se nota al toque, lo segundo es silencioso y rompe el turno.
 */
const SHAPE = /(^|[\\/"'\s])hook\.js["']?\s+(start|working|tool|waiting|done|end)(\s|$)/i;

function looksOurs(command) {
  return typeof command === 'string' && SHAPE.test(command);
}

// Un "grupo" es cada entrada de la lista que Claude Code guarda por evento:
// { matcher?, hooks: [...] }. Es nuestro si alguno de sus hooks nos nombra.
function groupIsOurs(group, script) {
  if (!group || !Array.isArray(group.hooks)) return false;
  return group.hooks.some(function (h) {
    return h && (mentions(h.command, script) || looksOurs(h.command));
  });
}

/*
 * El bloque que queremos que quede puesto, armado con las rutas de esta
 * instalación. `scripts` viene de afuera porque dónde está hook.js sólo lo sabe
 * el proceso principal: empaquetada la app vive en resources/, clonada en app/.
 */
function desired(scripts) {
  const h = toPosix(scripts.hook);
  const one = function (arg, timeout) {
    return [{
      hooks: [{
        type: 'command',
        command: 'node "' + h + '" ' + arg,
        // async: el hook no tiene por qué sumarle latencia a tu turno.
        async: true,
        timeout: timeout || 5
      }]
    }];
  };

  return {
    hooks: {
      // 10 s porque SessionStart es el que puede tener que levantar un Electron.
      SessionStart: one('start', 10),
      UserPromptSubmit: one('working'),
      Notification: one('waiting'),
      Stop: one('done'),
      StopFailure: one('done'),
      SessionEnd: one('end')
    },
    statusLine: {
      type: 'command',
      command: 'node "' + toPosix(scripts.statusline) + '"'
    }
  };
}

/*
 * ¿Ya está puesto? Alcanza con que los seis eventos nos nombren: si falta uno,
 * el pet se entera a medias y eso es peor que no estar — un pet que nunca dice
 * «terminó» parece roto, no desconfigurado.
 *
 * El statusLine no cuenta: es opcional, sólo sirve para el estado «durmiendo»,
 * y hay gente que no lo va a querer. Faltando sólo eso, la instalación está.
 */
function installed(current, scripts) {
  const hooks = current && current.hooks;
  if (!hooks || typeof hooks !== 'object') return false;
  return EVENTS.every(function (ev) {
    const list = hooks[ev];
    return Array.isArray(list) && list.some(function (g) { return groupIsOurs(g, scripts.hook); });
  });
}

/*
 * La fusión. Devuelve { settings, notes } — settings es el objeto nuevo y notes
 * son las cosas que el usuario tiene que saber que pasaron, para contárselas en
 * vez de hacerlas en silencio.
 *
 * No muta `current`: el que llama se queda con el original por si hay que
 * abortar sin escribir nada.
 */
function merge(current, scripts) {
  const want = desired(scripts);
  const out = JSON.parse(JSON.stringify(current && typeof current === 'object' ? current : {}));
  const notes = [];

  // Un settings.json con "hooks": "algo" no es nuestro problema de contenido,
  // pero sí de no romperlo más: si no es un objeto, se empieza de cero ahí.
  if (!out.hooks || typeof out.hooks !== 'object' || Array.isArray(out.hooks)) out.hooks = {};

  EVENTS.forEach(function (ev) {
    const prev = Array.isArray(out.hooks[ev]) ? out.hooks[ev] : [];
    // Los nuestros viejos se van — pueden apuntar a una instalación que moviste
    // o borraste — y los ajenos se quedan enteros, delante. Que el del usuario
    // vaya primero no cambia nada funcional (son async) pero deja el archivo
    // leyéndose como estaba: lo suyo arriba, lo del adorno abajo.
    const theirs = prev.filter(function (g) { return !groupIsOurs(g, scripts.hook); });
    if (theirs.length !== prev.length) notes.push('reemplazado:' + ev);
    out.hooks[ev] = theirs.concat(want.hooks[ev]);
  });

  /*
   * El statusLine es el único lugar donde podemos pisarle algo que le importa:
   * es UNO solo, no una lista, y si ya tenía el suyo y se lo cambiamos, la
   * próxima vez que abra una terminal su barra desapareció y el culpable es un
   * pingüino. Por eso:
   *
   *   - si no tiene, ponemos el nuestro
   *   - si el suyo ya somos nosotros, no se toca (con o sin delegado colgando)
   *   - si tiene uno propio, el nuestro lo envuelve y se lo delega
   *
   * El comando del usuario se pega tal cual, sin re-citar ni partir en
   * argumentos: Claude Code pasa el string por una shell, así que sus comillas
   * ya significan lo que él quiso. Partirlo nosotros sería adivinar.
   */
  const cur = out.statusLine;
  const curCmd = cur && typeof cur === 'object' ? cur.command : (typeof cur === 'string' ? cur : null);

  if (!curCmd) {
    out.statusLine = want.statusLine;
  } else if (mentions(curCmd, scripts.statusline)) {
    notes.push('statusline:ya-estaba');
  } else {
    out.statusLine = { type: 'command', command: want.statusLine.command + ' -- ' + curCmd };
    notes.push('statusline:delegado');
  }

  return { settings: out, notes: notes };
}

/* ---------- lo único que toca el disco ---------- */

function read(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { missing: true, value: {} }; }
  // Un archivo vacío es un archivo vacío, no un JSON roto.
  if (!raw.trim()) return { missing: false, value: {} };
  try { return { missing: false, value: JSON.parse(raw) }; }
  catch (e) { return { missing: false, broken: true, value: null }; }
}

/*
 * Instala. Devuelve { ok, changed, file, backup, notes, error }.
 *
 * Nunca escribe encima de algo que no pudo leer: si el JSON está roto, el
 * usuario tiene un problema con su settings.json que nosotros no vamos a
 * resolver pisándoselo. Se aborta y se lo decimos.
 */
function install(scripts, opts) {
  opts = opts || {};
  const file = opts.file || settingsPath(opts.home);

  const cur = read(file);
  if (cur.broken) {
    return { ok: false, error: 'roto', file: file };
  }

  const before = cur.missing ? null : JSON.stringify(cur.value);
  const res = merge(cur.value, scripts);
  const after = JSON.stringify(res.settings);

  if (before === after) {
    return { ok: true, changed: false, file: file, backup: null, notes: res.notes };
  }

  let backup = null;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // La copia se saca sólo si había algo que perder, y con la hora en el
    // nombre para que reinstalar tres veces no se coma el respaldo bueno.
    if (!cur.missing) {
      backup = file + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(file, backup);
    }
    fs.writeFileSync(file, JSON.stringify(res.settings, null, 2) + '\n');
  } catch (e) {
    return { ok: false, error: 'escritura', file: file, detail: String(e && e.message || e) };
  }

  return { ok: true, changed: true, file: file, backup: backup, notes: res.notes };
}

// ¿Están los hooks puestos ahora mismo? Para decidir si mostrar el panel de
// bienvenida. Si el archivo no se puede leer, asumimos que NO están: mostrar de
// más un cartel que se cierra es mejor que un pet mudo sin explicación.
function status(scripts, opts) {
  opts = opts || {};
  const file = opts.file || settingsPath(opts.home);
  const cur = read(file);
  if (cur.broken) return { installed: false, broken: true, file: file };
  return { installed: installed(cur.value, scripts), file: file };
}

module.exports = {
  EVENTS: EVENTS,
  settingsPath: settingsPath,
  toPosix: toPosix,
  desired: desired,
  installed: installed,
  merge: merge,
  install: install,
  status: status
};
