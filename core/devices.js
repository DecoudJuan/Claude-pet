/*
 * devices.js — registro de notebooks.
 *
 * La máquina es un objeto aparte del avatar, no un adorno suyo: el device se
 * dibuja a sí mismo — tapa y logo — y el avatar sólo le presta el hueco. El
 * mismo avatar puede estar sobre una MacBook o sobre una ThinkPad, y un avatar
 * nuevo hereda las diez sin escribir una línea.
 *
 * Eso se sostiene porque el torso es canónico (ver pet-body.js): la máquina
 * siempre se apoya en el mismo lugar, así que no necesita saber quién la
 * sostiene. Si cada avatar dibujara su propio torso, cada máquina tendría que
 * adivinar dónde encajar.
 *
 * A este tamaño las notebooks no se distinguen por la silueta sino por el
 * color de la tapa y el logo — la silueta es una sola, compartida. Sumar "la
 * HP gris" o "la MacBook midnight" es registrar colores.
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

  // La silueta es del device, no del avatar. Se dibuja siempre en el mismo
  // lugar — PetBody.DEVICE — así que cualquier máquina calza en cualquier
  // avatar sin que ninguno de los dos sepa nada del otro.
  var LID = 'M53.5 262 L30.7 174 C28.8 170 32.6 166 37.4 166 ' +
            'L202.6 166 C207.4 166 211.2 170 209.3 174 L186.5 262 Z';

  var BADGE_CX = 120;
  var BADGE_CY = 206;

  function badgeMarkup(def, cx, cy) {
    if (!def) return '';
    cx = cx === undefined ? BADGE_CX : cx;
    cy = cy === undefined ? BADGE_CY : cy;
    switch (def.badge) {
      case 'glow': return '<circle class="pd-badge" cx="' + cx + '" cy="' + cy + '" r="8"/>';
      case 'bar':  return '<rect class="pd-badge" x="' + (cx - 12) + '" y="' + (cy - 3) + '" width="24" height="6" rx="3"/>';
      case 'ring': return '<circle class="pd-badge-ring" cx="' + cx + '" cy="' + cy + '" r="8"/>';
      default:     return '';
    }
  }

  // La máquina entera: tapa y logo. El avatar sólo inserta esto en su hueco.
  function markup(def) {
    if (!def) return '';
    return '<path class="pd-lid" d="' + LID + '"/>' + badgeMarkup(def);
  }

  // Los colores van por custom properties para que el avatar no tenga que
  // saber nada de ellos. Se validan: un device puede venir de un tercero.
  function colour(v, fallback) {
    return /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/.test(String(v || ''))
      ? String(v)
      : fallback;
  }

  function applyTo(el, def) {
    el.style.setProperty('--pd-lid', colour(def && def.lid, '#1f252d'));
    el.style.setProperty('--pd-badge', colour(def && def.badgeColor, '#d8dadd'));
  }

  // El estilo de la máquina también es del device. Se inyecta una sola vez.
  var STYLE_ID = 'pet-devices-style';
  function injectStyle(doc) {
    doc = doc || document;
    if (doc.getElementById(STYLE_ID)) return;
    var el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = [
      '.pd-lid        { fill: var(--pd-lid, #1f252d); stroke: var(--pd-edge, #000); stroke-width: 5; stroke-linejoin: round; }',
      '.pd-badge      { fill: var(--pd-badge, #d8dadd); }',
      '.pd-badge-ring { fill: none; stroke: var(--pd-badge, #d8dadd); stroke-width: 3; }'
    ].join('\n');
    doc.head.appendChild(el);
  }

  root.PetDevices = {
    register: register,
    list: list,
    get: get,
    markup: markup,
    badgeMarkup: badgeMarkup,
    applyTo: applyTo,
    injectStyle: injectStyle,
    LID: LID
  };
})(window);
