/*
 * El gato.
 *
 * El que todo el mundo busca primero. Dos rasgos lo sostienen: las orejas
 * triangulares —las únicas puntiagudas del catálogo, todos los demás las tienen
 * redondas o no las tienen— y la pupila vertical, que además le da algo que
 * ninguno tiene: se abre y se cierra con el estado. Rendija cuando clava la
 * vista en el teclado, redonda y enorme cuando te mira esperando.
 *
 * Eso último es el mejor `waiting` del catálogo. Un gato con la pupila dilatada
 * mirándote fijo es una pregunta.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.gt {',
    '  --gt-fur: #e08f47;',
    '  --gt-line: #3b2312;',
    '  --gt-cream: #f8e6cd;',
    '  --gt-inner: #c26f2c;',
    '  --gt-pink: #e59098;',
    '  --gt-eye: #8ec07c;',
    '  --gt-accent: #d97a14;',
    '}',
    '.gt[data-palette="negro"] {',
    '  --gt-fur: #3a3f4a; --gt-line: #14171c; --gt-cream: #b9c0cb;',
    '  --gt-inner: #2a2e37; --gt-pink: #d0848f; --gt-eye: #e0c163; --gt-accent: #7aa2c2;',
    '}',
    '.gt[data-palette="siames"] {',
    '  --gt-fur: #e4d8c6; --gt-line: #4a3a2a; --gt-cream: #fdf6ec;',
    '  --gt-inner: #8a6f58; --gt-pink: #e79aa2; --gt-eye: #6fa8c9; --gt-accent: #b07a4a;',
    '}',
    '.gt:focus-visible { outline: 3px solid var(--gt-accent); outline-offset: 8px; border-radius: 14px; }',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .gt { --gt-fur: #efa45f; --gt-inner: #d4823c; }',
    '  :root:not([data-theme="light"]) .gt[data-palette="negro"] { --gt-fur: #565e6d; --gt-inner: #424957; }',
    '  :root:not([data-theme="light"]) .gt[data-palette="siames"] { --gt-fur: #efe6d8; --gt-inner: #a08871; }',
    '}',
    ':root[data-theme="dark"] .gt { --gt-fur: #efa45f; --gt-inner: #d4823c; }',
    ':root[data-theme="dark"] .gt[data-palette="negro"] { --gt-fur: #565e6d; --gt-inner: #424957; }',
    ':root[data-theme="dark"] .gt[data-palette="siames"] { --gt-fur: #efe6d8; --gt-inner: #a08871; }',

    '.gt-skin  { fill: var(--gt-fur); }',
    '.gt-belly { fill: var(--gt-cream); }',
    '.gt-fur   { fill: var(--gt-fur); }',
    '.gt-cream { fill: var(--gt-cream); }',
    '.gt-inner { fill: var(--gt-inner); }',
    '.gt-pink  { fill: var(--gt-pink); }',
    '.gt-dark  { fill: var(--gt-line); }',
    '.gt-zzz   { fill: var(--gt-line); }',
    '.gt-iris  { fill: var(--gt-eye); }',
    '.gt-stroke { fill: none; stroke: var(--gt-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.gt-paw { fill: var(--gt-fur); stroke: var(--gt-line); stroke-width: 3.4; }',
    '.gt-bean { fill: var(--gt-pink); }',

    // La pupila vertical: se afina cuando clava la vista en la pantalla y se
    // dilata cuando te mira a vos. Es la señal de estado más barata que hay —
    // dos números — y la más expresiva.
    '.gt-slit { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    '.gt.is-working .gt-slit, .gt.is-thinking .gt-slit { transform: scaleX(.45); }',
    '.gt.is-waiting .gt-slit { transform: scaleX(1.7); }',
    '@media (prefers-reduced-motion: reduce) { .gt-slit { transition: none; } }'
  ];

  var HEAD = [
    // Orejas triangulares: el rasgo primario, y las únicas en punta del catálogo.
    '      <g class="gt-ear">',
    '        <path class="gt-fur" d="M46 96 L52 28 L106 62 Z"/>',
    '        <path class="gt-pink" d="M60 87 L63 48 L91 66 Z"/>',
    '      </g>',
    '      <g class="gt-ear">',
    '        <path class="gt-fur" d="M194 96 L188 28 L134 62 Z"/>',
    '        <path class="gt-pink" d="M180 87 L177 48 L149 66 Z"/>',
    '      </g>',

    '      <path class="gt-fur" d="M120 46 C74 46 38 74 36 114 C34 156 70 186 120 186' +
      ' C170 186 206 156 204 114 C202 74 166 46 120 46 Z"/>',
    // rayas de atigrado en la frente: se apagan solas en las paletas lisas
    // porque comparten el tono del pelo interior
    '      <path class="gt-stroke" style="stroke:var(--gt-inner);stroke-width:6" d="M104 62 L98 78 M120 58 L120 76 M136 62 L142 78"/>',

    '      <g class="gt-eye">',
    '        <ellipse class="gt-iris" cx="88" cy="112" rx="17" ry="18"/>',
    '        <g class="gt-pupil">',
    '          <g class="gt-slit"><ellipse class="gt-dark" cx="88" cy="112" rx="6.5" ry="16"/></g>',
    '          <circle class="gt-cream" cx="83" cy="105" r="3.4"/>',
    '        </g>',
    '        <ellipse class="gt-stroke" cx="88" cy="112" rx="17" ry="18"/>',
    '      </g>',
    '      <g class="gt-eye">',
    '        <ellipse class="gt-iris" cx="152" cy="112" rx="17" ry="18"/>',
    '        <g class="gt-pupil">',
    '          <g class="gt-slit"><ellipse class="gt-dark" cx="152" cy="112" rx="6.5" ry="16"/></g>',
    '          <circle class="gt-cream" cx="147" cy="105" r="3.4"/>',
    '        </g>',
    '        <ellipse class="gt-stroke" cx="152" cy="112" rx="17" ry="18"/>',
    '      </g>',

    // Hocico: los dos lóbulos, la nariz triangular y la boca en «w».
    '      <ellipse class="gt-cream" cx="104" cy="152" rx="22" ry="17"/>',
    '      <ellipse class="gt-cream" cx="136" cy="152" rx="22" ry="17"/>',
    '      <path class="gt-pink" d="M110 140 L130 140 L120 150 Z"/>',
    '      <path class="gt-stroke" d="M120 150 L120 156"/>',
    '      <path class="gt-stroke" d="M120 156 C115 163 107 162 104 157"/>',
    '      <path class="gt-stroke" d="M120 156 C125 163 133 162 136 157"/>',
    '      <path class="gt-stroke" style="stroke-width:2.2;opacity:.7" d="M84 146 L44 138 M84 153 L42 156 M85 160 L46 172"/>',
    '      <path class="gt-stroke" style="stroke-width:2.2;opacity:.7" d="M156 146 L196 138 M156 153 L198 156 M155 160 L194 172"/>'
  ];

  function paw(x) {
    return '<ellipse class="gt-paw" cx="' + x + '" cy="210" rx="15" ry="10.5"/>' +
           '<circle class="gt-bean" cx="' + (x - 6) + '" cy="207" r="2.6"/>' +
           '<circle class="gt-bean" cx="' + x + '" cy="205.5" r="2.6"/>' +
           '<circle class="gt-bean" cx="' + (x + 6) + '" cy="207" r="2.6"/>';
  }

  var SKIN = {
    ns: 'gt',
    label: 'Gato. Sigue el cursor.',
    edge: 'var(--gt-line)',
    css: CSS,
    head: HEAD.join('\n'),
    hands: {
      left: paw(34),
      right: paw(206),
      chin: '<g transform="rotate(-22 166 150)">' + paw(166).replace(/cy="210"/, 'cy="150"')
              .replace(/cy="207"/g, 'cy="147"').replace(/cy="205.5"/, 'cy="145.5"') + '</g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
