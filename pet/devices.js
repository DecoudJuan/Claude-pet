/*
 * devices.js — registro de notebooks.
 *
 * La máquina en la que trabaja el avatar es un dato aparte del avatar: el mismo
 * pingüino puede estar sobre una MacBook o sobre una ThinkPad, y un avatar
 * nuevo hereda las seis sin escribir una línea.
 *
 * A este tamaño las notebooks no se distinguen por la silueta sino por el
 * color de la tapa y el logo, así que eso es exactamente lo que define un
 * device. Sumar "la HP gris" o "la MacBook midnight" es registrar colores.
 *
 *   PetDevices.register({
 *     id:    'macbook-midnight',
 *     name:  'MacBook · Midnight',
 *     lid:   '#2e3440',     // dorso de la tapa
 *     badge: 'glow',        // 'glow' | 'bar' | 'ring' | 'none'
 *     badgeColor: '#d8dadd'
 *   })
 */
(function (root) {
  'use strict';

  var order = [];
  var byId = {};

  var BADGES = ['glow', 'bar', 'ring', 'none'];

  function register(def) {
    if (!def || !def.id) throw new Error('PetDevices.register: falta id');
    if (byId[def.id]) return byId[def.id];

    var entry = {
      id: def.id,
      name: def.name || def.id,
      lid: def.lid || '#1f252d',
      badge: BADGES.indexOf(def.badge) >= 0 ? def.badge : 'none',
      badgeColor: def.badgeColor || '#d8dadd'
    };
    byId[entry.id] = entry;
    order.push(entry);
    return entry;
  }

  function list() { return order.slice(); }

  function get(id) { return byId[id] || order[0] || null; }

  // El markup del logo, en las coordenadas del viewBox del avatar (240x240).
  // Lo usa el avatar al dibujar su notebook; devolver '' es perfectamente
  // válido y es lo que hace 'none'.
  function badgeMarkup(def, cx, cy) {
    if (!def) return '';
    switch (def.badge) {
      case 'glow': return '<circle class="pm-lap-badge" cx="' + cx + '" cy="' + cy + '" r="8"/>';
      case 'bar':  return '<rect class="pm-lap-badge" x="' + (cx - 12) + '" y="' + (cy - 3) + '" width="24" height="6" rx="3"/>';
      case 'ring': return '<circle class="pm-lap-badge-ring" cx="' + cx + '" cy="' + cy + '" r="8"/>';
      default:     return '';
    }
  }

  root.PetDevices = {
    register: register,
    list: list,
    get: get,
    badgeMarkup: badgeMarkup
  };
})(window);
