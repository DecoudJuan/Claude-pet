/*
 * avatars.js — registro de avatares del pet.
 *
 * El pet no sabe dibujar nada: sabe pedirle a un avatar que se monte y le
 * avisa en qué estado está Claude Code. Agregar uno nuevo es escribir un
 * archivo que se registre acá y sumarlo a los <script> de pet.html.
 *
 *   PetAvatars.register({
 *     id:       'pinguino',          // único y estable: se guarda en la config
 *     name:     'Pingüino',          // lo que se lee en el menú
 *     palettes: [                    // opcional
 *       { id: 'colour', name: 'Colour' },
 *       { id: 'riso',   name: 'Riso' }
 *     ],
 *     mount: function (host, opts) { ... }
 *   })
 *
 * `opts` llega con { palette, accessory, pointer: 'manual', interactive: false, label }.
 *
 * mount() tiene que devolver un handle con este contrato — es todo lo que el
 * pet le pide, y lo único que hay que respetar para que un avatar nuevo ande:
 *
 *   setState(estado)      'idle' | 'working' | 'thinking' | 'waiting' |
 *                         'sleeping' | 'greeting' | 'farewell'
 *   look(x, y)            cursor relativo a la ventana (la pantalla entera)
 *   poke()                reacción al click
 *   destroy()             soltar timers, listeners y rAF
 *
 * 'greeting' y 'farewell' son la entrada y la salida: el pet los manda una vez
 * cada uno, al aparecer y justo antes de cerrarse, y duran lo que dice
 * core/greeting.js. El avatar asoma desde abajo del cuadro y se hunde por el
 * mismo camino; el «Hi!» y el «Bye!» los dice el pet, en su globo.
 *
 * Opcionales: setPalette(id), setAccessory(id) y element (el nodo, para tests).
 */
(function (root) {
  'use strict';

  var order = [];
  var byId = {};

  function register(def) {
    if (!def || !def.id) throw new Error('PetAvatars.register: falta id');
    if (typeof def.mount !== 'function') throw new Error('PetAvatars.register: ' + def.id + ' no trae mount()');
    if (byId[def.id]) return byId[def.id];

    var entry = {
      id: def.id,
      name: def.name || def.id,
      palettes: def.palettes || [],
      accessories: def.accessories || [],
      mount: def.mount
    };
    byId[entry.id] = entry;
    order.push(entry);
    return entry;
  }

  function list() {
    return order.slice();
  }

  // Siempre devuelve algo montable: si el id guardado ya no existe (borraste el
  // archivo del avatar), cae al primero registrado en vez de dejar la ventana vacía.
  function get(id) {
    return byId[id] || order[0] || null;
  }

  root.PetAvatars = { register: register, list: list, get: get };
})(window);
