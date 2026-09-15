/*
 * turn.js — ¿el turno sigue vivo?
 *
 * Cuando cortás un turno con Ctrl+C, Claude Code no dispara ningún hook: ni
 * Stop ni StopFailure. La sesión se queda marcada como "working" y el avatar
 * teclea para siempre delante de una terminal que ya no hace nada.
 *
 * El rastro está en el transcript, y hay dos maneras de leerlo. La primera
 * versión de esto miraba sólo el silencio: si el archivo no crecía en 25 s, el
 * turno estaba muerto. Eso confunde dos cosas distintas — un turno cortado y
 * un turno pensando. Un bloque de razonamiento largo no escribe una línea en
 * minutos, y el pet anunciaba "Terminó" en medio del turno para después
 * volver a teclear.
 *
 * Así que la señal principal ya no es el silencio sino el corte explícito:
 * cuando interrumpís, Claude Code escribe una entrada
 * "[Request interrupted by user]" y ahí termina el archivo. Eso no se presta a
 * confusión y no hay que esperar nada para verlo.
 *
 * El silencio queda sólo como red de seguridad, con un umbral largo: si
 * pasaron tres minutos sin una línea y sin marca de corte, se da por
 * terminado igual. Es preferible seguir tecleando de más un rato a decir que
 * terminó cuando no terminó — el globo de fin es lo único que el usuario lee
 * como un hecho.
 */
'use strict';

const fs = require('fs');

const HARD_QUIET_MS = 180000;  // silencio que ya no se le perdona a nadie
const TAIL_BYTES = 64 * 1024;  // con esto alcanza para las últimas entradas

// Parsear la cola cuesta, así que se recuerda por mtime: mientras el archivo
// no cambie, la respuesta es la misma.
const cache = new Map();

function isActive(rec, now) {
  if (!rec || !rec.transcript) return true;   // sin dato, no inventamos nada

  let st;
  try { st = fs.statSync(rec.transcript); } catch (e) { return true; }

  // El corte explícito no espera: si el transcript termina en la marca de
  // interrupción, el turno murió aunque el archivo se haya escrito recién.
  if (tail(rec.transcript, st).interrupted) return false;

  // Sin marca, sólo el silencio largo lo desmiente. Pensar sin escribir es
  // trabajo, no un turno colgado.
  return (now || Date.now()) - st.mtimeMs < HARD_QUIET_MS;
}

// Lee la cola del transcript y devuelve lo único que interesa de ella: si
// termina en una interrupción del usuario.
function tail(file, st) {
  // La clave lleva tamaño además de fecha: dos contenidos distintos pueden
  // compartir mtime, y ahí la caché devolvería la respuesta del anterior.
  const key = file + ':' + st.mtimeMs + ':' + st.size;
  if (cache.has(key)) return cache.get(key);

  let interrupted = false;
  try {
    const start = Math.max(0, st.size - TAIL_BYTES);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(st.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const lines = buf.toString('utf8').split('\n');
    // La primera puede venir cortada por la mitad.
    if (start > 0) lines.shift();

    // La marca sólo cuenta si es lo último que hay: cualquier entrada
    // posterior — la respuesta de un turno nuevo, otro mensaje tuyo — quiere
    // decir que la sesión siguió viviendo después del corte.
    for (const line of lines) {
      if (!line.trim()) continue;
      let j;
      try { j = JSON.parse(line); } catch (e) { continue; }
      interrupted = isInterrupt(j);
    }
  } catch (e) {
    interrupted = false;   // ante la duda, no lo matamos
  }

  const val = { interrupted: interrupted };
  if (cache.size > 32) cache.clear();
  cache.set(key, val);
  return val;
}

const MARK = '[Request interrupted';

function isInterrupt(entry) {
  if (!entry) return false;
  // Claude Code marca la entrada con el mensaje que quedó a medias. Es la
  // señal más barata y no depende de cómo esté redactado el texto.
  if (entry.interruptedMessageId) return true;
  const content = entry.message && entry.message.content;
  if (typeof content === 'string') return content.indexOf(MARK) === 0;
  if (!Array.isArray(content)) return false;
  // Un turno cortado a mitad de una herramienta deja la marca como un bloque
  // de texto más dentro del mensaje.
  return content.some(function (part) {
    return part && part.type === 'text' && typeof part.text === 'string' &&
           part.text.indexOf(MARK) === 0;
  });
}

// ¿El transcript creció después de este instante?
//
// Es lo que distingue contestar un pedido de permiso de dejarlo ahí: contestar
// hace trabajo, y el trabajo se escribe. Ignorarlo no escribe una línea. Sin
// transcript no se asume nada — para afirmar que labura hace falta la prueba,
// no su ausencia.
function movedSince(rec, since) {
  if (!rec || !rec.transcript || !since) return false;
  try { return fs.statSync(rec.transcript).mtimeMs > since; } catch (e) { return false; }
}

module.exports = {
  isActive: isActive,
  movedSince: movedSince,
  HARD_QUIET_MS: HARD_QUIET_MS
};
