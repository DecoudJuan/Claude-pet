/*
 * quota.js — cuánto te queda y cuándo vuelve.
 *
 * Ningún hook de Claude Code trae el límite de uso. El único lugar donde ese
 * dato aparece es el JSON que Claude Code le pasa al comando de statusline, que
 * incluye:
 *
 *   rate_limits: {
 *     five_hour: { used_percentage, resets_at },   // resets_at en epoch/segundos
 *     seven_day: { used_percentage, resets_at }
 *   }
 *
 * Como el statusline corre en otro proceso y no podemos engancharnos a él, la
 * convención es un archivo: un statusline que publique su cuota en
 * ~/.claude/quota-status/current.json deja el dato disponible para quien quiera
 * leerlo. El pet lo lee; si no está, no pasa nada — el resto funciona igual y
 * el estado "durmiendo" simplemente nunca se dispara.
 *
 * El README trae el fragmento para publicarlo.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const FILE = process.env.CLAUDE_PET_QUOTA_FILE ||
             path.join(os.homedir(), '.claude', 'quota-status', 'current.json');

// Por debajo de esto todavía se puede trabajar. Se dispara al 100 %: una
// ventana a medio consumir no es una siesta.
const LIMIT_PCT = 100;

function readFile() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return null; }
}

/*
 * Devuelve null si se puede trabajar, o { window, pct, resetsAt, account }
 * describiendo la ventana agotada que vuelve antes.
 *
 * Con varias cuentas en el archivo mira todas: si cualquiera está al límite el
 * pet no puede saber en cuál estás trabajando, y avisar de más es mejor que
 * quedarse tecleando sin tokens.
 */
function exhausted(now) {
  const doc = readFile();
  if (!doc || !doc.accounts) return null;

  now = now || Date.now();
  const nowSec = Math.floor(now / 1000);
  let best = null;

  for (const entry of Object.values(doc.accounts)) {
    if (!entry || entry.available === false) continue;

    for (const key of ['five_hour', 'seven_day']) {
      const w = entry[key];
      if (!w || typeof w.pct !== 'number') continue;
      if (w.pct < LIMIT_PCT) continue;

      // Una ventana cuyo reset ya pasó describe el pasado: el statusline
      // todavía no la refrescó.
      if (typeof w.resets_at !== 'number' || w.resets_at <= nowSec) continue;

      // Si hay dos agotadas, manda la que vuelve antes: es cuando podés
      // volver a trabajar.
      if (!best || w.resets_at < best.resetsAt) {
        best = {
          window: key === 'five_hour' ? '5h' : '7d',
          pct: w.pct,
          resetsAt: w.resets_at * 1000,
          account: entry.account || null
        };
      }
    }
  }

  return best;
}

module.exports = { exhausted: exhausted, FILE: FILE };
