/*
 * La ratita.
 *
 * Su rasgo son las orejas: dos discos enormes, casi tan anchos como el cráneo y
 * bien separados. Es lo que la distingue del hámster (cachetes) y del topo
 * (garras) a 152 px, que es donde los tres se confundían.
 *
 * Y tiene cola. La cola va DETRÁS del torso y no en la cabeza: colgada de la
 * cabeza se sacudiría cada vez que la ratita mira el cursor, que es exactamente
 * el movimiento que una cola no hace.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RatMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.rt {',
    '  --rt-fur: #9ba3ae;',
    '  --rt-line: #252d36;',
    '  --rt-cream: #eceff4;',
    '  --rt-inner: #7b8490;',
    '  --rt-pink: #e79aa4;',
    '  --rt-accent: #d97a14;',
    '}',
    '.rt[data-palette="blanca"] {',
    '  --rt-fur: #f3eee9; --rt-line: #4a3f39; --rt-cream: #fffcf8;',
    '  --rt-inner: #dcd2c9; --rt-pink: #ea8f9c; --rt-accent: #c2704a;',
    '}',
    '.rt[data-palette="campo"] {',
    '  --rt-fur: #a67c52; --rt-line: #2e1f12; --rt-cream: #f0dcc0;',
    '  --rt-inner: #8a6440; --rt-pink: #dd8e8e; --rt-accent: #5f8f5f;',
    '}',
    '.rt:focus-visible { outline: 3px solid var(--rt-accent); outline-offset: 8px; border-radius: 14px; }',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .rt { --rt-fur: #b4bcc7; --rt-inner: #949ca8; }',
    '  :root:not([data-theme="light"]) .rt[data-palette="blanca"] { --rt-fur: #f8f4f0; --rt-inner: #e4dbd3; }',
    '  :root:not([data-theme="light"]) .rt[data-palette="campo"] { --rt-fur: #c39668; --rt-inner: #a67c52; }',
    '}',
    ':root[data-theme="dark"] .rt { --rt-fur: #b4bcc7; --rt-inner: #949ca8; }',
    ':root[data-theme="dark"] .rt[data-palette="blanca"] { --rt-fur: #f8f4f0; --rt-inner: #e4dbd3; }',
    ':root[data-theme="dark"] .rt[data-palette="campo"] { --rt-fur: #c39668; --rt-inner: #a67c52; }',

    '.rt-skin  { fill: var(--rt-fur); }',
    '.rt-belly { fill: var(--rt-cream); }',
    '.rt-fur   { fill: var(--rt-fur); }',
    '.rt-cream { fill: var(--rt-cream); }',
    '.rt-inner { fill: var(--rt-inner); }',
    '.rt-pink  { fill: var(--rt-pink); }',
    '.rt-dark  { fill: var(--rt-line); }',
    '.rt-zzz   { fill: var(--rt-line); }',
    '.rt-stroke { fill: none; stroke: var(--rt-line); stroke-width: 3.2;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.rt-paw { fill: var(--rt-pink); stroke: var(--rt-line); stroke-width: 3.2; }',
    '.rt-toes { fill: none; stroke: var(--rt-line); stroke-width: 1.9;',
    '  stroke-linecap: round; opacity: .6; }',

    // La cola: se mueve sola, lento y sin ciclo redondo. Es lo único que se
    // mueve en `idle` además de los ojos, y alcanza para que no parezca un
    // dibujo pegado a la pantalla.
    '.rt-tail { transform-box: fill-box; transform-origin: 0% 100%; }',
    '@keyframes rt-wag { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg); } }',
    '.rt-tail { animation: rt-wag 3.4s ease-in-out infinite; }',
    '.rt.is-sleeping .rt-tail { animation-duration: 7s; }',
    '@media (prefers-reduced-motion: reduce) { .rt-tail { animation: none; } }'
  ];

  var HEAD = [
    // Las orejas primero: discos grandes, detrás del cráneo.
    '      <g class="rt-ear">',
    '        <circle class="rt-fur" cx="52" cy="62" r="33"/>',
    '        <circle class="rt-pink" cx="52" cy="62" r="19"/>',
    '      </g>',
    '      <g class="rt-ear">',
    '        <circle class="rt-fur" cx="188" cy="62" r="33"/>',
    '        <circle class="rt-pink" cx="188" cy="62" r="19"/>',
    '      </g>',

    // Cráneo más angosto que el del hámster, y el hocico se afina hacia abajo:
    // una rata tiene cara de cuña, no de pelota.
    '      <path class="rt-fur" d="M120 44 C80 44 50 70 48 110 C46 150 78 186 120 186' +
      ' C162 186 194 150 192 110 C190 70 160 44 120 44 Z"/>',
    '      <path class="rt-cream" d="M120 108 C142 108 156 130 154 150 C152 172 138 184 120 184' +
      ' C102 184 88 172 86 150 C84 130 98 108 120 108 Z"/>',

    '      <g class="rt-eye">',
    '        <g class="rt-pupil">',
    '          <ellipse class="rt-dark" cx="93" cy="106" rx="10" ry="11"/>',
    '          <circle class="rt-cream" cx="89.5" cy="102" r="3.2"/>',
    '        </g>',
    '      </g>',
    '      <g class="rt-eye">',
    '        <g class="rt-pupil">',
    '          <ellipse class="rt-dark" cx="147" cy="106" rx="10" ry="11"/>',
    '          <circle class="rt-cream" cx="143.5" cy="102" r="3.2"/>',
    '        </g>',
    '      </g>',

    // Nariz rosada en la punta del hocico y los dos dientes debajo.
    '      <ellipse class="rt-pink" cx="120" cy="146" rx="10" ry="8"/>',
    '      <path class="rt-stroke" d="M120 154 L120 161"/>',
    '      <path class="rt-stroke" d="M120 161 C114 168 106 167 103 162"/>',
    '      <path class="rt-stroke" d="M120 161 C126 168 134 167 137 162"/>',
    '      <path class="rt-cream" d="M114 164 h5 v11 h-5 Z M121 164 h5 v11 h-5 Z"/>',
    '      <path class="rt-stroke" style="stroke-width:2.2" d="M114 164 h5 v11 h-5 Z M121 164 h5 v11 h-5 Z"/>',
    // Bigotes largos: los de la ratita son el doble que los del hámster.
    '      <path class="rt-stroke" style="stroke-width:2.2;opacity:.7" d="M104 148 L58 138 M104 154 L56 156 M105 160 L60 172"/>',
    '      <path class="rt-stroke" style="stroke-width:2.2;opacity:.7" d="M136 148 L182 138 M136 154 L184 156 M135 160 L180 172"/>'
  ];

  // La cola sale de atrás del torso, a la derecha, y se enrosca hacia arriba.
  var BEHIND = [
    '      <g class="rt-tail">',
    '        <path class="rt-stroke" style="stroke-width:9" d="M196 222 C232 214 236 186 222 176 C212 169 202 176 206 186"/>',
    '        <path class="rt-stroke" style="stroke-width:4;stroke:var(--rt-pink)"' +
      ' d="M196 222 C232 214 236 186 222 176 C212 169 202 176 206 186"/>',
    '      </g>'
  ];

  function paw(x, dx) {
    return '<ellipse class="rt-paw" cx="' + x + '" cy="210" rx="13.5" ry="9.5"/>' +
           '<path class="rt-toes" d="M' + (x + dx * 8) + ' 207 q2.5 -4 5 0 M' + x + ' 205 q2.5 -4 5 0' +
           ' M' + (x - dx * 8) + ' 207 q2.5 -4 5 0"/>';
  }

  var SKIN = {
    ns: 'rt',
    label: 'Ratita. Sigue el cursor.',
    edge: 'var(--rt-line)',
    css: CSS,
    head: HEAD.join('\n'),
    behind: BEHIND.join('\n'),
    hands: {
      left: paw(34, -1),
      right: paw(206, 1),
      chin: '<g transform="rotate(-22 164 152)"><ellipse class="rt-paw" cx="164" cy="152" rx="13" ry="9"/>' +
            '<path class="rt-toes" d="M156 150 q2.5 -4 5 0 M164 148 q2.5 -4 5 0 M172 150 q2.5 -4 5 0"/></g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
