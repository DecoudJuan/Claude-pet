/*
 * El murciélago.
 *
 * Su rasgo son las alas, y no como adorno: son lo único del catálogo que cambia
 * la silueta entera según el estado. Abiertas mientras labura, levantadas
 * cuando te espera, y envolviéndolo como una capa cuando se queda sin tokens.
 *
 * Eso último es lo que lo hace valer la pena. `sleeping` es el estado que casi
 * todos resuelven cerrando los ojos, que a 152 px es un cambio de dos píxeles;
 * un murciélago dormido es un bulto envuelto en sus propias alas, y eso se
 * distingue de `idle` desde el otro lado de la pantalla. Dormir cabeza abajo
 * quedaba mejor todavía, pero el dibujo se apoya en la barra de tareas y darlo
 * vuelta lo dejaba colgando del aire.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BatMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.mc {',
    '  --mc-fur: #6a5a7e;',
    '  --mc-line: #1e1726;',
    '  --mc-cream: #d8cfe4;',
    '  --mc-inner: #514463;',
    '  --mc-pink: #d98fa8;',
    '  --mc-accent: #d97a14;',
    '}',
    '.mc[data-palette="frutero"] {',
    '  --mc-fur: #8d5a3c; --mc-line: #2a1710; --mc-cream: #e8c9a8;',
    '  --mc-inner: #6f452d; --mc-pink: #d98f7a; --mc-accent: #5f8f5f;',
    '}',
    '.mc[data-palette="albino"] {',
    '  --mc-fur: #e6e2ea; --mc-line: #453c50; --mc-cream: #fffcff;',
    '  --mc-inner: #cbc3d4; --mc-pink: #e493a8; --mc-accent: #9a6ab0;',
    '}',
    '.mc:focus-visible { outline: 3px solid var(--mc-accent); outline-offset: 8px; border-radius: 14px; }',
    // Un murciélago es oscuro por definición: sobre un escritorio oscuro hay que
    // levantarlo bastante o queda una mancha con ojos.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .mc { --mc-fur: #8d7aa6; --mc-inner: #6d5d85; }',
    '  :root:not([data-theme="light"]) .mc[data-palette="frutero"] { --mc-fur: #b0764f; --mc-inner: #8d5a3c; }',
    '  :root:not([data-theme="light"]) .mc[data-palette="albino"] { --mc-fur: #f2eff5; --mc-inner: #d8d0e0; }',
    '}',
    ':root[data-theme="dark"] .mc { --mc-fur: #8d7aa6; --mc-inner: #6d5d85; }',
    ':root[data-theme="dark"] .mc[data-palette="frutero"] { --mc-fur: #b0764f; --mc-inner: #8d5a3c; }',
    ':root[data-theme="dark"] .mc[data-palette="albino"] { --mc-fur: #f2eff5; --mc-inner: #d8d0e0; }',

    '.mc-skin  { fill: var(--mc-fur); }',
    '.mc-belly { fill: var(--mc-cream); }',
    '.mc-fur   { fill: var(--mc-fur); }',
    '.mc-cream { fill: var(--mc-cream); }',
    '.mc-inner { fill: var(--mc-inner); }',
    '.mc-pink  { fill: var(--mc-pink); }',
    '.mc-dark  { fill: var(--mc-line); }',
    '.mc-zzz   { fill: var(--mc-line); }',
    '.mc-memb  { fill: var(--mc-inner); stroke: var(--mc-line); stroke-width: 3.4;',
    '  stroke-linejoin: round; }',
    '.mc-bone  { fill: none; stroke: var(--mc-line); stroke-width: 2.2; opacity: .45;',
    '  stroke-linecap: round; }',
    '.mc-stroke { fill: none; stroke: var(--mc-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.mc-paw { fill: var(--mc-inner); stroke: var(--mc-line); stroke-width: 3.4; }',

    // Las alas. El estado se lee en la silueta antes que en la cara, que es lo
    // que hace que este avatar funcione de reojo.
    '.mc-wing { transform-box: fill-box; transition: transform .38s cubic-bezier(.3,.8,.4,1); }',
    '.mc-wing-l { transform-origin: 100% 20%; }',
    '.mc-wing-r { transform-origin: 0% 20%; }',
    // laburando las despliega un poco, para que el bulto no tape la notebook
    '.mc.is-working .mc-wing-l, .mc.is-thinking .mc-wing-l { transform: rotate(-9deg) translateX(-5px); }',
    '.mc.is-working .mc-wing-r, .mc.is-thinking .mc-wing-r { transform: rotate(9deg) translateX(5px); }',
    // esperando las levanta: es el gesto de «pará» más grande del catálogo
    '.mc.is-waiting .mc-wing-l { transform: rotate(-20deg) translate(-8px, -12px); }',
    '.mc.is-waiting .mc-wing-r { transform: rotate(20deg) translate(8px, -12px); }',
    // durmiendo las pliega hacia adentro y aparece la capa
    '.mc.is-sleeping .mc-wing-l { transform: rotate(16deg) translate(24px, 6px) scale(.82); }',
    '.mc.is-sleeping .mc-wing-r { transform: rotate(-16deg) translate(-24px, 6px) scale(.82); }',

    // La capa: el murciélago envuelto en sus propias alas. Sólo durmiendo.
    '.mc-cloak { opacity: 0; transition: opacity .3s ease; pointer-events: none; }',
    '.mc.is-sleeping .mc-cloak { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .mc-wing, .mc-cloak { transition: none; }',
    '}'
  ];

  var HEAD = [
    // Orejas enormes y en punta: después de las alas, es lo que más lo nombra.
    '      <g class="mc-ear">',
    '        <path class="mc-fur" d="M58 100 C40 66 44 30 62 18 C80 30 92 62 88 96 Z"/>',
    '        <path class="mc-pink" d="M64 92 C54 68 56 44 66 36 C76 46 82 68 80 90 Z"/>',
    '      </g>',
    '      <g class="mc-ear">',
    '        <path class="mc-fur" d="M182 100 C200 66 196 30 178 18 C160 30 148 62 152 96 Z"/>',
    '        <path class="mc-pink" d="M176 92 C186 68 184 44 174 36 C164 46 158 68 160 90 Z"/>',
    '      </g>',

    '      <path class="mc-fur" d="M120 52 C78 52 44 78 42 116 C40 154 76 186 120 186' +
      ' C164 186 200 154 198 116 C196 78 162 52 120 52 Z"/>',

    '      <g class="mc-eye">',
    '        <g class="mc-pupil">',
    '          <ellipse class="mc-dark" cx="92" cy="114" rx="11" ry="12"/>',
    '          <circle class="mc-cream" cx="88" cy="109" r="3.6"/>',
    '        </g>',
    '      </g>',
    '      <g class="mc-eye">',
    '        <g class="mc-pupil">',
    '          <ellipse class="mc-dark" cx="148" cy="114" rx="11" ry="12"/>',
    '          <circle class="mc-cream" cx="144" cy="109" r="3.6"/>',
    '        </g>',
    '      </g>',

    // Hocico corto con la nariz de hoja, y dos colmillos: sin ellos es un ratón
    // con alas.
    '      <ellipse class="mc-cream" cx="120" cy="150" rx="26" ry="20"/>',
    '      <path class="mc-pink" d="M120 132 C128 132 132 140 128 146 C125 150 115 150 112 146 C108 140 112 132 120 132 Z"/>',
    '      <path class="mc-stroke" style="stroke-width:2.6" d="M120 150 L120 156"/>',
    '      <path class="mc-stroke" style="stroke-width:2.6" d="M120 156 C114 162 107 161 104 157"/>',
    '      <path class="mc-stroke" style="stroke-width:2.6" d="M120 156 C126 162 133 161 136 157"/>',
    '      <path class="mc-cream" d="M110 158 L114 168 L118 158 Z"/>',
    '      <path class="mc-cream" d="M122 158 L126 168 L130 158 Z"/>'
  ];

  // Un ala: la membrana con los tres huesos marcados. El festoneado del borde es
  // lo que la vuelve ala de murciélago y no capa de superhéroe.
  function wing(s) {
    var m = s > 0
      ? 'M66 186 C34 176 12 150 10 118 C26 132 34 136 44 136 C34 148 30 160 32 172' +
        ' C44 158 52 152 62 150 C56 162 56 174 60 186 Z'
      : 'M174 186 C206 176 228 150 230 118 C214 132 206 136 196 136 C206 148 210 160 208 172' +
        ' C196 158 188 152 178 150 C184 162 184 174 180 186 Z';
    var bones = s > 0
      ? 'M62 180 L14 122 M62 180 L36 140 M62 180 L44 166'
      : 'M178 180 L226 122 M178 180 L204 140 M178 180 L196 166';
    return '<g class="mc-wing mc-wing-' + (s > 0 ? 'l' : 'r') + '">' +
             '<path class="mc-memb" d="' + m + '"/>' +
             '<path class="mc-bone" d="' + bones + '"/>' +
           '</g>';
  }

  var BEHIND = [wing(1), wing(-1)];

  // La capa: dos mitades que se cierran sobre el torso. Sólo se ve durmiendo, y
  // es lo que convierte al murciélago en un bulto — el cambio de silueta que
  // separa «sin tokens» de «en reposo» sin depender de los ojos.
  var FRONT = [
    '      <g class="mc-cloak">',
    '        <path class="mc-memb" d="M120 172 C88 172 62 196 58 240 L120 240 Z"/>',
    '        <path class="mc-memb" d="M120 172 C152 172 178 196 182 240 L120 240 Z"/>',
    '        <path class="mc-bone" d="M112 180 L74 238 M108 186 L64 240"/>',
    '        <path class="mc-bone" d="M128 180 L166 238 M132 186 L176 240"/>',
    '      </g>'
  ];

  function claw(x) {
    return '<ellipse class="mc-paw" cx="' + x + '" cy="210" rx="14" ry="10"/>' +
           '<path class="mc-stroke" style="stroke-width:2.2;opacity:.6" d="M' + (x - 7) + ' 205 v-6 M' + x +
             ' 203 v-7 M' + (x + 7) + ' 205 v-6"/>';
  }

  var SKIN = {
    ns: 'mc',
    label: 'Murciélago. Sigue el cursor.',
    edge: 'var(--mc-line)',
    css: CSS,
    head: HEAD.join('\n'),
    behind: BEHIND.join('\n'),
    front: FRONT.join('\n'),
    hands: {
      left: claw(34),
      right: claw(206),
      chin: '<g transform="rotate(-20 166 152)"><ellipse class="mc-paw" cx="166" cy="152" rx="13" ry="9.5"/></g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
