/*
 * greeting.js — el saludo, canónico.
 *
 * El pet aparece cuando arranca una sesión de Claude Code y se va cuando se
 * apaga la última. Las dos cosas pasaban de golpe: la ventana estaba o no
 * estaba. El saludo es lo que las convierte en una entrada y una salida —
 * «Hi!» al llegar, «Bye!» antes de irse, dos segundos cada uno.
 *
 * Vive en core y no en la ventana porque lo comparten tres piezas que no se
 * conocen entre sí:
 *
 *   - la ventana (app/window.js) muestra el cartel y pone al avatar en pose,
 *   - el proceso principal (app/main.js) tiene que esperar a que el «Bye!»
 *     termine antes de cerrar la app — si no, el adiós no se ve nunca,
 *   - cada avatar dibuja las dos poses.
 *
 * Con las constantes acá, el que se va no se puede desincronizar del que
 * saluda: si mañana el saludo dura más, lo dura para los tres.
 */
(function (root) {
  'use strict';

  var G = {
    // Lo que dura el cartel y la pose. Dos segundos es lo que tarda en leerse
    // sin que llegue a molestar en cada arranque de sesión.
    MS: 2000,

    // Cada saludo es un texto y el estado que el avatar tiene que poner.
    HELLO:   { text: 'Hi!',  state: 'greeting' },
    GOODBYE: { text: 'Bye!', state: 'farewell' }
  };

  root.PetGreeting = G;
  // El proceso principal lo pide con require(): es el único que no corre en la
  // ventana, y necesita el mismo MS para no cerrar la app antes de tiempo.
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : this);
