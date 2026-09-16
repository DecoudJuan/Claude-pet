/*
 * El hámster.
 *
 * Tres roedores en el mismo catálogo se pisan: a 152 px y de reojo, hámster,
 * topo y ratita son el mismo bicho en tres colores. Así que cada uno se queda
 * con UNA cosa que no tiene ningún otro, y la del hámster son los cachetes —
 * enormes, redondos, más anchos que el cráneo.
 *
 * Y hacen algo: mientras labura se llenan. No es un chiste visual suelto, es la
 * señal de «está juntando» que separa `working` de `idle` incluso con la
 * notebook tapada por otra ventana.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HamsterMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.hm {',
    '  --hm-fur: #d9a253;',
    '  --hm-line: #3a2413;',
    '  --hm-cream: #f7e3c4;',
    '  --hm-inner: #c07c4a;',
    '  --hm-pink: #e08a92;',
    '  --hm-accent: #d97a14;',
    '}',
    '.hm[data-palette="gris"] {',
    '  --hm-fur: #9aa2ad; --hm-line: #242c34; --hm-cream: #eef2f6;',
    '  --hm-inner: #79828e; --hm-pink: #d98d96; --hm-accent: #4f9db7;',
    '}',
    '.hm[data-palette="blanco"] {',
    '  --hm-fur: #f2ece4; --hm-line: #4a3a2c; --hm-cream: #fffaf2;',
    '  --hm-inner: #d9cdbd; --hm-pink: #e79aa2; --hm-accent: #c2704a;',
    '}',
    '.hm:focus-visible { outline: 3px solid var(--hm-accent); outline-offset: 8px; border-radius: 14px; }',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .hm { --hm-fur: #e8b468; --hm-inner: #cf8d53; }',
    '  :root:not([data-theme="light"]) .hm[data-palette="gris"] { --hm-fur: #b3bcc7; --hm-inner: #929ba7; }',
    '  :root:not([data-theme="light"]) .hm[data-palette="blanco"] { --hm-fur: #faf6f0; --hm-inner: #e2d8ca; }',
    '}',
    ':root[data-theme="dark"] .hm { --hm-fur: #e8b468; --hm-inner: #cf8d53; }',
    ':root[data-theme="dark"] .hm[data-palette="gris"] { --hm-fur: #b3bcc7; --hm-inner: #929ba7; }',
    ':root[data-theme="dark"] .hm[data-palette="blanco"] { --hm-fur: #faf6f0; --hm-inner: #e2d8ca; }',

    '.hm-skin  { fill: var(--hm-fur); }',
    '.hm-belly { fill: var(--hm-cream); }',
    '.hm-fur   { fill: var(--hm-fur); }',
    '.hm-cream { fill: var(--hm-cream); }',
    '.hm-inner { fill: var(--hm-inner); }',
    '.hm-pink  { fill: var(--hm-pink); }',
    '.hm-dark  { fill: var(--hm-line); }',
    '.hm-stroke { fill: none; stroke: var(--hm-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.hm-paw { fill: var(--hm-fur); stroke: var(--hm-line); stroke-width: 3.4; }',
    '.hm-toes { fill: none; stroke: var(--hm-line); stroke-width: 2;',
    '  stroke-linecap: round; opacity: .6; }',

    // Los cachetes. Se llenan mientras labura y se vacían cuando termina: a
    // 152 px es un cambio de silueta, que es lo único que se lee de reojo.
    '.hm-cheek { transform-box: fill-box; transform-origin: 50% 40%; transition: transform .35s ease; }',
    '.hm.is-working .hm-cheek, .hm.is-thinking .hm-cheek { transform: scale(1.16); }',
    '.hm.is-sleeping .hm-cheek { transform: scale(.94); }',
    '@media (prefers-reduced-motion: reduce) { .hm-cheek { transition: none; } }'
  ];

  // Cráneo dentro de B.HEAD (x 28..212, y 30..186). Las orejas redondas asoman
  // arriba, en zona de accesorio, sin pasarse de B.LIMITS.
  var HEAD = [
    '      <g class="hm-ear">',
    '        <circle class="hm-fur" cx="62" cy="52" r="24"/>',
    '        <circle class="hm-pink" cx="62" cy="52" r="12"/>',
    '      </g>',
    '      <g class="hm-ear">',
    '        <circle class="hm-fur" cx="178" cy="52" r="24"/>',
    '        <circle class="hm-pink" cx="178" cy="52" r="12"/>',
    '      </g>',

    // Cráneo ancho y bajo: un hámster es casi todo cara.
    '      <path class="hm-fur" d="M120 38 C70 38 36 66 34 110 C32 154 68 186 120 186' +
      ' C172 186 208 154 206 110 C204 66 170 38 120 38 Z"/>',

    // Los cachetes, por delante del cráneo y desbordándolo a los costados.
    '      <g class="hm-cheek"><ellipse class="hm-cream" cx="56" cy="138" rx="34" ry="30"/></g>',
    '      <g class="hm-cheek"><ellipse class="hm-cream" cx="184" cy="138" rx="34" ry="30"/></g>',

    '      <g class="hm-eye">',
    '        <g class="hm-pupil">',
    '          <ellipse class="hm-dark" cx="90" cy="104" rx="11" ry="12"/>',
    '          <circle class="hm-cream" cx="86" cy="99" r="3.6"/>',
    '        </g>',
    '      </g>',
    '      <g class="hm-eye">',
    '        <g class="hm-pupil">',
    '          <ellipse class="hm-dark" cx="150" cy="104" rx="11" ry="12"/>',
    '          <circle class="hm-cream" cx="146" cy="99" r="3.6"/>',
    '        </g>',
    '      </g>',

    // Hocico corto, nariz chica y los dos dientes: el segundo rasgo del hámster.
    '      <ellipse class="hm-cream" cx="120" cy="140" rx="30" ry="24"/>',
    '      <ellipse class="hm-pink" cx="120" cy="128" rx="9" ry="7"/>',
    '      <path class="hm-stroke" d="M120 135 L120 143"/>',
    '      <path class="hm-stroke" d="M120 143 C114 150 106 149 103 144"/>',
    '      <path class="hm-stroke" d="M120 143 C126 150 134 149 137 144"/>',
    '      <path class="hm-cream" d="M112 150 h7 v14 h-7 Z"/>',
    '      <path class="hm-cream" d="M121 150 h7 v14 h-7 Z"/>',
    '      <path class="hm-stroke" style="stroke-width:2.4" d="M112 150 h7 v14 h-7 Z M121 150 h7 v14 h-7 Z"/>',
    // Bigotes cortos: el hámster los tiene finitos, no como la ratita.
    '      <path class="hm-stroke" style="stroke-width:2.2;opacity:.65" d="M86 136 L64 132 M86 142 L64 144"/>',
    '      <path class="hm-stroke" style="stroke-width:2.2;opacity:.65" d="M154 136 L176 132 M154 142 L176 144"/>'
  ];

  function paw(x, dx) {
    return '<ellipse class="hm-paw" cx="' + x + '" cy="210" rx="15" ry="10.5"/>' +
           '<path class="hm-toes" d="M' + (x + dx * 9) + ' 208 q3 -4 6 0 M' + (x + dx * 1) + ' 206 q3 -4 6 0' +
           ' M' + (x - dx * 7) + ' 208 q3 -4 6 0"/>';
  }

  var SKIN = {
    ns: 'hm',
    label: 'Hámster. Sigue el cursor.',
    edge: 'var(--hm-line)',
    css: CSS,
    head: HEAD.join('\n'),
    hands: {
      left: paw(34, -1),
      right: paw(206, 1),
      chin: '<g transform="rotate(-22 166 150)"><ellipse class="hm-paw" cx="166" cy="150" rx="14" ry="10"/>' +
            '<path class="hm-toes" d="M157 148 q3 -4 6 0 M165 146 q3 -4 6 0 M173 148 q3 -4 6 0"/></g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
