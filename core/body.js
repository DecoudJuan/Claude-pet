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

    // El cráneo también es fijo de ancho. No la forma — puede ser redonda,
    // cuadrada, alargada — pero sí la caja: todos los avatares tienen que
    // leerse como parte de la misma familia, y una cabeza del doble de ancho
    // que otra rompe eso. El alto tampoco es libre: el pet reserva un cuadrado
    // y una cabeza que se estire sin límite se sale del cuadro o achica todo
    // lo demás hasta que no se vea nada.
    HEAD: {
      cx: 120,
      top: 30,        // más arriba de esto ya no es cabeza, es accesorio
      bottom: 186,    // donde empieza el torso
      width: 184      // x 28..212
    },

    // Orejas de conejo, cuernos, una cola, una vincha: lo que sobresale del
    // cráneo puede llegar hasta acá y ni un píxel más. No es una preferencia
    // estética — afuera de esta caja el dibujo se sale del viewBox y el pet lo
    // recorta. Los auriculares del pingüino usan x 18..222, bien adentro.
    LIMITS: { top: 8, left: 8, right: 232, bottom: 240 },

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
