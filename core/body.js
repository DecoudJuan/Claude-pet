/*
 * pet-body.js — el cuerpo canónico.
 *
 * Todos los avatares comparten el mismo torso: la misma forma, el mismo tamaño
 * y los mismos puntos de anclaje. Lo que cambia de un avatar a otro es la
 * cabeza, la cara, los colores y los accesorios — de la clavícula para abajo
 * son todos iguales.
 *
 * No es una regla estética: es lo que hace que la notebook pueda ser un objeto
 * aparte. Si cada avatar dibujara su propio torso, la máquina tendría que
 * adivinar dónde apoyarse y las manos no llegarían al teclado. Con un torso
 * fijo, cualquier device calza en cualquier avatar.
 *
 * Todo en el sistema de coordenadas del viewBox 240x240. El torso se dibuja más
 * abajo del borde y se recorta, así que no deja franja al moverse.
 */
(function (root) {
  'use strict';

  root.PetBody = {
    // Todos los avatares dibujan en esta caja. Cuadrada, y el borde de abajo se
    // apoya sobre la barra de tareas.
    VIEWBOX: '0 0 240 240',

    // De acá para arriba manda el avatar: cabeza, cara, accesorios.
    HEAD_BOTTOM: 186,

    // De acá para abajo es igual en todos.
    TORSO_TOP: 162,

    // La silueta. Se recorta contra el borde inferior del viewBox.
    torso: 'M0.3 262 C-1.6 198 44 162 120 162 C196 162 241.6 198 239.7 262 Z',
    belly: 'M64.9 262 C63 214 93.4 196 120 196 C146.6 196 177 214 175.1 262 Z',

    // Dónde apoya la notebook. El device dibuja acá adentro; el avatar no
    // dibuja la máquina, sólo deja el hueco.
    DEVICE: { top: 166, bottom: 262, left: 30.7, right: 209.3 },

    // Dónde van las manos del avatar sobre el teclado. Las dibuja el avatar
    // — son suyas, no de la máquina — pero en estos puntos, para que el tecleo
    // coincida con el teclado que el device dibujó.
    HANDS: {
      left:  { x: 30.7, y: 210 },
      right: { x: 209.3, y: 210 },
      rx: 16, ry: 11
    },

    // El recorte que usan torso y notebook para no derramarse fuera del cuadro.
    clipRect: { x: -120, y: -120, width: 480, height: 360 }
  };
})(typeof window !== 'undefined' ? window : this);
