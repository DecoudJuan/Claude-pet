/*
 * turn.js — ¿el turno sigue vivo?
 *
 * Cuando cortás un turno con Ctrl+C, Claude Code no dispara ningún hook: ni
 * Stop ni StopFailure. La sesión se queda marcada como "working" y el avatar
 * teclea para siempre delante de una terminal que ya no hace nada.
 *
 * El único rastro es el transcript: mientras el turno corre, crece. Cuando se
 * corta, deja de crecer. Así que el heartbeat es la fecha de modificación de
 * ese archivo — gratis, sin lanzar un proceso por evento como haría un hook
 * de PreToolUse.
 *
 * El umbral sale de medir los silencios reales de una sesión larga: el 96,5 %
 * de los intervalos entre entradas son menores a 30 s, y el 99 % menores a
 * 86 s. Por eso 25 s alcanza para casi todo... salvo por un caso: una llamada
 * a herramienta larga (un build, un test) puede estar minutos sin escribir
 * nada y sigue trabajando de verdad.
 *
 * Para no confundir las dos cosas se mira la última entrada: si es una
 * herramienta que todavía no devolvió, el turno sigue vivo por más silencio
 * que haya. Recién a los 3 minutos se da por terminado igual.
 */
'use strict';

const fs = require('fs');

const QUIET_MS = 25000;        // silencio a partir del cual se sospecha
const HARD_QUIET_MS = 180000;  // silencio que ya no se le perdona ni a una tool
const TAIL_BYTES = 64 * 1024;  // con esto alcanza para la última entrada

// Parsear la cola cuesta, así que se recuerda por mtime: mientras el archivo
// no cambie, la respuesta es la misma.
const cache = new Map();

function isActive(rec, now) {
  if (!rec || !rec.transcript) return true;   // sin dato, no inventamos nada

  let st;
  try { st = fs.statSync(rec.transcript); } catch (e) { return true; }

  const quiet = (now || Date.now()) - st.mtimeMs;
  if (quiet < QUIET_MS) return true;          // escribiendo: está vivo
  if (quiet > HARD_QUIET_MS) return false;    // demasiado, sea lo que sea

  return toolPending(rec.transcript, st);
}

// ¿La última entrada es una herramienta que todavía no devolvió? Entonces el
// silencio es el de una tool corriendo, no el de un turno cortado.
function toolPending(file, st) {
  // La clave lleva tamaño además de fecha: dos contenidos distintos pueden
  // compartir mtime, y ahí la caché devolvería la respuesta del anterior.
  const key = file + ':' + st.mtimeMs + ':' + st.size;
  if (cache.has(key)) return cache.get(key);

  let pending = false;
  try {
    const start = Math.max(0, st.size - TAIL_BYTES);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(st.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const lines = buf.toString('utf8').split('\n');
    // La primera puede venir cortada por la mitad.
    if (start > 0) lines.shift();

    const ids = new Set();     // tool_use sin resultado todavía
    for (const line of lines) {
      if (!line.trim()) continue;
      let j;
      try { j = JSON.parse(line); } catch (e) { continue; }
      const content = j.message && j.message.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (part.type === 'tool_use' && part.id) ids.add(part.id);
        if (part.type === 'tool_result' && part.tool_use_id) ids.delete(part.tool_use_id);
      }
    }
    pending = ids.size > 0;
  } catch (e) {
    pending = true;   // ante la duda, no lo matamos
  }

  if (cache.size > 32) cache.clear();
  cache.set(key, pending);
  return pending;
}

module.exports = { isActive: isActive, QUIET_MS: QUIET_MS };
