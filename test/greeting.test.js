/*
 * El saludo es lo único que comparten el proceso principal y la ventana sin
 * poder verse: main.js espera MS milisegundos antes de cerrar la app y la
 * ventana muestra el cartel durante MS. Si los dos números se separan, el
 * «Bye!» se corta a la mitad o la app se queda un rato de más con la ventana
 * ya muda — y ninguna de las dos cosas rompe nada, así que no se notaría.
 *
 * Esto fija el contrato: un solo archivo, valores usables por los dos.
 */
'use strict';

const { check, done } = require('./check');
const G = require('../core/greeting');

check('el saludo dura algo razonable', G.MS >= 1000 && G.MS <= 5000, true);
check('el texto de entrada', G.HELLO.text, 'Hi!');
check('el texto de salida', G.GOODBYE.text, 'Bye!');
check('entrar y salir son estados distintos', G.HELLO.state !== G.GOODBYE.state, true);

// El avatar recibe estos dos como estado, igual que 'working' o 'waiting': si
// alguno se llamara como uno existente, el dibujo pondría la pose equivocada.
const POSES = ['idle', 'working', 'thinking', 'waiting', 'sleeping'];
check('greeting no pisa un estado existente', POSES.indexOf(G.HELLO.state), -1);
check('farewell no pisa un estado existente', POSES.indexOf(G.GOODBYE.state), -1);

done('greeting');
