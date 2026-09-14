/*
 * statusline.js — la única puerta por la que entra el límite de uso.
 *
 * Claude Code no guarda en ningún lado cuánto te queda ni cuándo vuelve: ese
 * dato aparece una sola vez, en el JSON que le pasa al comando de statusline.
 * Ningún hook lo trae. Así que si el pet quiere saber que te quedaste sin
 * tokens, tiene que estar en esa cadena.
 *
 * Este script se pone como statusLine, lee ese JSON, publica la cuota en
 * ~/.claude/quota-status/current.json — que es lo que lee app/quota.js — y
 * después imprime la línea.
 *
 * NO te hace perder tu statusline. Si ya tenías uno, pasalo como argumento y
 * este se lo delega, con el mismo stdin:
 *
 *   node app/statusline.js -- bash ~/.claude/mi-statusline.sh
 *
 * Sin delegado imprime una línea propia, corta y suficiente.
 *
 * Igual que el hook: pase lo que pase sale con 0 y escribe algo. Un statusline
 * que se cae te deja la terminal sin barra.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const QUOTA_DIR = path.join(os.homedir(), '.claude', 'quota-status');
const QUOTA_FILE = path.join(QUOTA_DIR, 'current.json');

let input = '';
let done = false;

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (d) { input += d; });
process.stdin.on('end', run);
process.stdin.on('error', run);
setTimeout(run, 2000).unref();

function run() {
  if (done) return;
  done = true;

  let data = {};
  try { data = JSON.parse(input || '{}'); } catch (e) { /* seguimos igual */ }

  try { publish(data); } catch (e) { /* la cuota es un extra, no la línea */ }

  const argv = process.argv.slice(2);
  const sep = argv.indexOf('--');
  const delegate = sep >= 0 ? argv.slice(sep + 1) : (argv.length ? argv : null);

  if (delegate && delegate.length) {
    relay(delegate);
  } else {
    process.stdout.write(line(data));
    process.exit(0);
  }
}

/* ---------- publicar la cuota ---------- */

function publish(j) {
  const rl = j.rate_limits || {};
  const now = Math.floor(Date.now() / 1000);

  const win = function (w) {
    if (!w || typeof w.used_percentage !== 'number') return null;
    const r = typeof w.resets_at === 'number' ? w.resets_at : null;
    return { pct: Math.round(w.used_percentage), resets_at: r, stale_suspect: r !== null && r < now };
  };

  const five = win(rl.five_hour);
  const seven = win(rl.seven_day);
  if (!five && !seven) return;   // sin datos no se pisa nada

  // Dos cuentas pueden compartir email bajo organizaciones distintas, así que
  // la entrada va por uuid de organización.
  let key = 'default', account = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
    const oa = cfg.oauthAccount || {};
    account = oa.organizationName
      ? ((oa.emailAddress || '?').split('@')[0] + ' · ' + oa.organizationName)
      : (oa.emailAddress || null);
    key = oa.organizationUuid || oa.accountUuid || oa.emailAddress || 'default';
  } catch (e) { /* cuenta desconocida, igual sirve */ }

  let accounts = {};
  try {
    const prev = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
    if (prev && prev.accounts && typeof prev.accounts === 'object') accounts = prev.accounts;
  } catch (e) { /* primera vez */ }

  // Una ventana cuyo reset ya pasó no describe nada. Las cuentas que no se
  // tocan en una semana se van.
  for (const [id, e] of Object.entries(accounts)) {
    if (id === key) continue;
    if (typeof e.written_at !== 'number' || now - e.written_at > 604800) { delete accounts[id]; continue; }
    for (const k of ['five_hour', 'seven_day']) {
      if (e[k] && typeof e[k].resets_at === 'number' && e[k].resets_at < now) e[k] = null;
    }
  }

  accounts[key] = {
    available: true,
    account: account,
    written_at: now,
    five_hour: five,
    seven_day: seven,
    model: (j.model && j.model.display_name) || null
  };

  fs.mkdirSync(QUOTA_DIR, { recursive: true });
  // Las sesiones corren en paralelo: escribir y renombrar, para que nadie lea
  // un archivo a medio escribir.
  const tmp = QUOTA_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ schema: 2, written_at: now, accounts: accounts }));
  fs.renameSync(tmp, QUOTA_FILE);
}

/* ---------- la línea ---------- */

function line(j) {
  const dim = function (t) { return '\x1b[2m' + t + '\x1b[0m'; };
  const parts = [];

  const dir = String((j.workspace && j.workspace.current_dir) || j.cwd || '');
  if (dir) parts.push(dir.replace(/[/\\]+$/, '').split(/[/\\]/).pop());
  if (j.model && j.model.display_name) parts.push(dim(j.model.display_name));

  const cw = j.context_window || {};
  if (typeof cw.used_percentage === 'number') parts.push(dim('ctx ' + Math.round(cw.used_percentage) + '%'));

  const rl = j.rate_limits || {};
  const lim = [];
  if (rl.five_hour && typeof rl.five_hour.used_percentage === 'number') lim.push('5h ' + Math.round(rl.five_hour.used_percentage) + '%');
  if (rl.seven_day && typeof rl.seven_day.used_percentage === 'number') lim.push('7d ' + Math.round(rl.seven_day.used_percentage) + '%');
  if (lim.length) parts.push(dim(lim.join(' / ')));

  return parts.join(dim(' | '));
}

/* ---------- delegar al statusline que ya tenías ---------- */

function relay(cmd) {
  let child;
  try {
    child = spawn(cmd[0], cmd.slice(1), { stdio: ['pipe', 'inherit', 'ignore'] });
  } catch (e) {
    process.stdout.write(line(safeParse(input)));
    process.exit(0);
    return;
  }
  child.on('error', function () { process.exit(0); });
  child.on('close', function () { process.exit(0); });
  try { child.stdin.end(input); } catch (e) { /* ya se fue */ }
}

function safeParse(s) {
  try { return JSON.parse(s || '{}'); } catch (e) { return {}; }
}
