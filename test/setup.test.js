/*
 * setup.test.js — fusionar los hooks del pet en el settings.json del usuario.
 *
 * Este es el archivo donde el pet puede hacer daño de verdad. No es el estado
 * de un adorno: son los permisos, el modelo y los hooks propios de alguien que
 * usa Claude Code para trabajar. Un merge que pise de más le rompe el día, y el
 * síntoma va a aparecer en su próxima terminal, lejos de acá.
 *
 * Por eso casi todos los casos de abajo son de la forma «esto NO se tocó».
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const setup = require('../app/setup.js');
const { check, done } = require('./check.js');

const S = { hook: '/opt/claude-pet/hook.js', statusline: '/opt/claude-pet/statusline.js' };

// Cuántas veces aparece nuestro hook.js en todo el archivo. Es la cuenta que
// delata un merge que duplica: seis eventos, seis menciones.
function mentions(settings) {
  return (JSON.stringify(settings).match(/claude-pet\/hook\.js/g) || []).length;
}

function cmdOf(settings, ev) {
  const list = (settings.hooks && settings.hooks[ev]) || [];
  return list.map(function (g) {
    return (g.hooks || []).map(function (h) { return h.command; }).join(' + ');
  }).join(' | ');
}

console.log('setup.js — fusionar sin pisar');

/* ---------- lo básico ---------- */

var fresh = setup.merge({}, S).settings;
check('un settings vacío queda con los seis eventos', setup.EVENTS.every(function (ev) {
  return Array.isArray(fresh.hooks[ev]) && fresh.hooks[ev].length === 1;
}), true);
check('seis menciones, una por evento', mentions(fresh), 6);
check('y el statusLine del pet', /statusline\.js/.test(fresh.statusLine.command), true);
check('installed() lo reconoce', setup.installed(fresh, S), true);
check('installed() sobre vacío da false', setup.installed({}, S), false);

/* ---------- idempotencia: el caso que más se ejecuta ---------- */

// Instalar dos veces es lo normal: reinstalás la app, apretás el botón de nuevo,
// o el panel aparece porque faltaba un evento. Si cada vez suma un bloque, cada
// turno dispara N procesos node.
var twice = setup.merge(fresh, S).settings;
check('instalar dos veces no duplica', mentions(twice), 6);
check('y el archivo queda idéntico', JSON.stringify(twice), JSON.stringify(fresh));

// La misma ruta escrita como la escribe Windows según quién la generó.
var otherCase = setup.merge({
  hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node "/OPT/Claude-Pet/HOOK.js" start' }] }] }
}, S).settings;
check('la misma ruta en otra caja no se duplica', cmdOf(otherCase, 'SessionStart').split('|').length, 1);

/* ---------- mover la instalación ---------- */

// Tenías el pet clonado y ahora lo instalaste de un .exe: el bloque viejo
// apunta a un hook.js que ya no existe y hay que sacarlo, no acumularlo.
var moved = setup.merge({
  hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node "/home/juan/viejo/claude-pet/hook.js" done' }] }] }
}, S).settings;
check('el bloque de una instalación vieja se reemplaza', /viejo/.test(cmdOf(moved, 'Stop')), false);
check('y queda uno solo', moved.hooks.Stop.length, 1);

// Se reconoce por la forma del comando, no por la ruta: por eso funciona
// aunque la instalación anterior estuviera en cualquier lado.
var otroSO = setup.merge({
  hooks: { Notification: [{ hooks: [{ type: 'command', command: 'node "C:/Users/x/AppData/Local/Programs/claude-pet/resources/hook.js" waiting' }] }] }
}, S).settings;
check('una instalación de otro sistema también', otroSO.hooks.Notification.length, 1);

// Y un hook ajeno que no tenga nuestra forma no se toca, aunque diga node.
var ajeno = setup.merge({
  hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node /home/x/mi-script.js done' }] }] }
}, S).settings;
check('un hook ajeno con otro nombre sobrevive', ajeno.hooks.Stop.length, 2);

/* ---------- los hooks del usuario ---------- */

var mine = {
  hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'echo hola' }] }],
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mi-validador.sh' }] }]
  }
};
var mixed = setup.merge(mine, S).settings;
check('un hook propio en el MISMO evento sobrevive', /echo hola/.test(cmdOf(mixed, 'SessionStart')), true);
check('y el del pet se le suma', /hook\.js/.test(cmdOf(mixed, 'SessionStart')), true);
check('el suyo queda primero', mixed.hooks.SessionStart[0].hooks[0].command, 'echo hola');
check('un evento que no usamos queda intacto', JSON.stringify(mixed.hooks.PreToolUse), JSON.stringify(mine.hooks.PreToolUse));
check('y el matcher no se pierde', mixed.hooks.PreToolUse[0].matcher, 'Bash');
check('merge no muta el original', mine.hooks.SessionStart.length, 1);

/* ---------- todo lo demás del archivo ---------- */

var full = setup.merge({
  model: 'opus',
  permissions: { allow: ['Bash(npm test)'] },
  env: { FOO: 'bar' },
  raro: { anidado: [1, 2, { tres: true }] }
}, S).settings;
check('model sobrevive', full.model, 'opus');
check('permissions sobrevive', JSON.stringify(full.permissions.allow), '["Bash(npm test)"]');
check('env sobrevive', full.env.FOO, 'bar');
check('una clave que no conocemos sobrevive entera', JSON.stringify(full.raro), '{"anidado":[1,2,{"tres":true}]}');

/* ---------- el statusLine: lo único que es uno solo ---------- */

var suyo = setup.merge({
  statusLine: { type: 'command', command: 'bash ~/.claude/mi-linea.sh' }
}, S);
check('un statusLine propio NO se pisa', /mi-linea\.sh/.test(suyo.settings.statusLine.command), true);
check('queda delegado detrás del nuestro', /statusline\.js" -- bash ~\/\.claude\/mi-linea\.sh$/.test(suyo.settings.statusLine.command), true);
check('y se avisa que pasó', suyo.notes.indexOf('statusline:delegado') >= 0, true);

// Las comillas del usuario se pegan tal cual: partirlas en argumentos sería
// adivinar cómo las escribió, y Claude Code ya pasa el string por una shell.
var conEspacios = setup.merge({
  statusLine: { type: 'command', command: 'bash "/c/Mis Cosas/linea.sh" --color' }
}, S).settings;
check('una ruta con espacios se preserva textual', /-- bash "\/c\/Mis Cosas\/linea\.sh" --color$/.test(conEspacios.statusLine.command), true);

// Segunda instalación con el delegado ya puesto: envolver dos veces dejaría
// nuestro statusline llamándose a sí mismo.
var reDelegado = setup.merge(suyo.settings, S).settings;
check('no se envuelve dos veces', (reDelegado.statusLine.command.match(/statusline\.js/g) || []).length, 1);
check('y el delegado sigue ahí', /mi-linea\.sh/.test(reDelegado.statusLine.command), true);

// Alguien lo escribió como string suelto en vez de objeto.
var comoTexto = setup.merge({ statusLine: 'mi-cosa.sh' }, S).settings;
check('un statusLine escrito como texto se delega igual', /-- mi-cosa\.sh$/.test(comoTexto.statusLine.command), true);

/* ---------- formas inesperadas: no romper más de lo que ya está ---------- */

check('hooks siendo un string no explota', typeof setup.merge({ hooks: 'qué' }, S).settings.hooks, 'object');
check('hooks siendo un array tampoco', Array.isArray(setup.merge({ hooks: [] }, S).settings.hooks), false);
check('un evento con un array de basura se descarta', setup.merge({ hooks: { Stop: 'no soy lista' } }, S).settings.hooks.Stop.length, 1);
check('un grupo sin hooks no cuenta como nuestro', setup.merge({ hooks: { Stop: [{ matcher: 'x' }] } }, S).settings.hooks.Stop.length, 2);
check('null se trata como vacío', mentions(setup.merge(null, S).settings), 6);

// Faltando UN evento, la instalación no está: un pet que nunca dice «terminó»
// parece roto, no desconfigurado.
var casi = JSON.parse(JSON.stringify(fresh));
delete casi.hooks.SessionEnd;
check('falta un evento → installed() da false', setup.installed(casi, S), false);

// El statusLine es opcional: sin él sólo se pierde el estado «durmiendo».
var sinLinea = JSON.parse(JSON.stringify(fresh));
delete sinLinea.statusLine;
check('sin statusLine igual está instalado', setup.installed(sinLinea, S), true);

/* ---------- install(): lo que toca el disco ---------- */

var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-setup-'));
var file = path.join(dir, 'settings.json');

var r1 = setup.install(S, { file: file });
check('crea el archivo si no estaba', r1.ok && r1.changed, true);
check('sin backup: no había nada que perder', r1.backup, null);
check('y es JSON válido', typeof JSON.parse(fs.readFileSync(file, 'utf8')).hooks, 'object');

var r2 = setup.install(S, { file: file });
check('instalar de nuevo no cambia nada', r2.changed, false);
check('y no deja un backup al pedo', r2.backup, null);

fs.writeFileSync(file, JSON.stringify({ model: 'opus' }));
var r3 = setup.install(S, { file: file });
check('con contenido previo sí hace backup', typeof r3.backup, 'string');
check('el backup tiene lo de antes', JSON.parse(fs.readFileSync(r3.backup, 'utf8')).model, 'opus');

// El caso en el que NO hay que escribir: si no lo pudimos leer, no sabemos qué
// le estaríamos borrando.
fs.writeFileSync(file, '{ esto no es json,,, ');
var r4 = setup.install(S, { file: file });
check('un settings roto aborta', r4.ok, false);
check('con el motivo', r4.error, 'roto');
check('y el archivo queda como estaba', fs.readFileSync(file, 'utf8').slice(0, 6), '{ esto');
check('status() sobre un archivo roto avisa', setup.status(S, { file: file }).broken, true);

// Un archivo vacío no es un JSON roto: pasa a veces cuando lo tocás a mano.
fs.writeFileSync(file, '   \n');
check('un archivo vacío se puede instalar', setup.install(S, { file: file }).ok, true);

check('status() sobre uno que no existe', setup.status(S, { file: path.join(dir, 'no-existe.json') }).installed, false);

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* da igual */ }

done('setup.js');
