/*
 * El topo.
 *
 * Su rasgo propio son las manos: garras de excavar, desproporcionadas, el doble
 * de grandes que las de cualquier otro. Eso lo separa del hámster y de la
 * ratita incluso en silueta, que es donde los tres se parecían.
 *
 * El problema del topo es `sleeping`: casi no tiene ojos —dos rendijas— así que
 * cerrarlos no se ve, y el estado se confundiría con `idle`, que es justo el
 * error que la skill marca como grave. Se resuelve con el hocico: despierto
 * apunta al frente y olfatea; durmiendo se cae. Es un cambio de silueta y se
 * lee sin ver un solo ojo.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MoleMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.tp {',
    '  --tp-fur: #55494f;',
    '  --tp-line: #1d1519;',
    '  --tp-cream: #cfc3c8;',
    '  --tp-inner: #6f6169;',
    '  --tp-pink: #e29aa0;',
    '  --tp-accent: #d97a14;',
    '}',
    '.tp[data-palette="tierra"] {',
    '  --tp-fur: #6b4f3a; --tp-line: #241812; --tp-cream: #d9c5b0;',
    '  --tp-inner: #8a6a50; --tp-pink: #d98f88; --tp-accent: #7a9b5c;',
    '}',
    '.tp[data-palette="albino"] {',
    '  --tp-fur: #e8dfe2; --tp-line: #4a3c42; --tp-cream: #fffafa;',
    '  --tp-inner: #cbbfc4; --tp-pink: #e88f97; --tp-accent: #b0607a;',
    '}',
    '.tp:focus-visible { outline: 3px solid var(--tp-accent); outline-offset: 8px; border-radius: 14px; }',
    // Un topo es gris oscuro: sobre un escritorio oscuro desaparece. Se levanta
    // el pelo bastante más que en los otros avatares, porque parte de más abajo.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .tp { --tp-fur: #7d6e76; --tp-inner: #968691; }',
    '  :root:not([data-theme="light"]) .tp[data-palette="tierra"] { --tp-fur: #96725a; --tp-inner: #b08a6d; }',
    '  :root:not([data-theme="light"]) .tp[data-palette="albino"] { --tp-fur: #f2ecee; --tp-inner: #d8ccd1; }',
    '}',
    ':root[data-theme="dark"] .tp { --tp-fur: #7d6e76; --tp-inner: #968691; }',
    ':root[data-theme="dark"] .tp[data-palette="tierra"] { --tp-fur: #96725a; --tp-inner: #b08a6d; }',
    ':root[data-theme="dark"] .tp[data-palette="albino"] { --tp-fur: #f2ecee; --tp-inner: #d8ccd1; }',

    '.tp-skin  { fill: var(--tp-fur); }',
    '.tp-belly { fill: var(--tp-cream); }',
    '.tp-fur   { fill: var(--tp-fur); }',
    '.tp-cream { fill: var(--tp-cream); }',
    '.tp-inner { fill: var(--tp-inner); }',
    '.tp-pink  { fill: var(--tp-pink); }',
    '.tp-dark  { fill: var(--tp-line); }',
    '.tp-zzz   { fill: var(--tp-line); }',
    '.tp-stroke { fill: none; stroke: var(--tp-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.tp-claw { fill: var(--tp-cream); stroke: var(--tp-line); stroke-width: 3.4;',
    '  stroke-linejoin: round; }',

    // El hocico es el estado. Olfatea de a ratos mientras labura, apunta al
    // frente cuando te espera y se cae cuando duerme.
    '.tp-snout { transform-box: fill-box; transform-origin: 50% 20%; transition: transform .35s ease; }',
    '@keyframes tp-sniff { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }',
    '.tp.is-working .tp-snout { animation: tp-sniff .5s steps(1, end) infinite; }',
    '.tp.is-waiting .tp-snout { transform: translateY(-4px) scale(1.06); }',
    '.tp.is-sleeping .tp-snout { transform: translateY(9px) rotate(6deg) scale(.96); }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .tp.is-working .tp-snout { animation: none; }',
    '  .tp-snout { transition: none; }',
    '}'
  ];

  var HEAD = [
    // Cráneo cónico: el topo no tiene cuello y la cabeza sigue al hocico.
    '      <path class="tp-fur" d="M120 36 C74 36 38 64 36 108 C34 152 70 186 120 186' +
      ' C170 186 206 152 204 108 C202 64 166 36 120 36 Z"/>',
    // Orejas: el topo casi no tiene. Dos pliegues, apenas insinuados — si se las
    // dibuja redondas vuelve a ser un hámster.
    '      <g class="tp-ear"><ellipse class="tp-inner" cx="47" cy="96" rx="9" ry="14" transform="rotate(-18 47 96)"/></g>',
    '      <g class="tp-ear"><ellipse class="tp-inner" cx="193" cy="96" rx="9" ry="14" transform="rotate(18 193 96)"/></g>',

    // Ojos de rendija: este bicho vive bajo tierra y casi no los usa. Pero
    // «casi no se ven» y «no se ven» son cosas distintas — negro sobre pelo
    // oscuro desaparecía del todo, y un avatar que no puede parpadear pierde
    // la única señal de que está vivo. Van sobre un parche claro, que además
    // es lo que tiene un topo de verdad alrededor del ojo.
    '      <g class="tp-eye">',
    '        <ellipse class="tp-cream" cx="88" cy="106" rx="14" ry="9"/>',
    '        <ellipse class="tp-dark" cx="88" cy="106" rx="8" ry="5.5"/>',
    '        <g class="tp-pupil"><circle class="tp-cream" cx="85.5" cy="104.5" r="2"/></g>',
    '      </g>',
    '      <g class="tp-eye">',
    '        <ellipse class="tp-cream" cx="152" cy="106" rx="14" ry="9"/>',
    '        <ellipse class="tp-dark" cx="152" cy="106" rx="8" ry="5.5"/>',
    '        <g class="tp-pupil"><circle class="tp-cream" cx="149.5" cy="104.5" r="2"/></g>',
    '      </g>',

    // El hocico: rosado, largo, proyectado hacia adelante y hacia abajo.
    '      <g class="tp-snout">',
    '        <path class="tp-pink" d="M96 130 C96 116 144 116 144 130 C144 152 134 168 120 168' +
      ' C106 168 96 152 96 130 Z"/>',
    '        <path class="tp-stroke" style="stroke-width:3" d="M96 130 C96 116 144 116 144 130' +
      ' C144 152 134 168 120 168 C106 168 96 152 96 130 Z"/>',
    '        <ellipse class="tp-dark" cx="111" cy="152" rx="4" ry="5"/>',
    '        <ellipse class="tp-dark" cx="129" cy="152" rx="4" ry="5"/>',
    // los pliegues del morro, que es lo que lo vuelve un hocico de topo y no
    // una nariz de cerdo
    '        <path class="tp-stroke" style="stroke-width:2.2;opacity:.5" d="M102 134 h36 M104 142 h32"/>',
    '      </g>',
    '      <path class="tp-stroke" style="stroke-width:2.2;opacity:.6" d="M92 146 L68 142 M92 152 L70 154"/>',
    '      <path class="tp-stroke" style="stroke-width:2.2;opacity:.6" d="M148 146 L172 142 M148 152 L170 154"/>'
  ];

  // Las garras. Mucho más grandes que cualquier otra mano del catálogo: es el
  // rasgo que lo separa de los otros dos roedores incluso en silueta.
  function claw(x, s) {
    return '<path class="tp-claw" d="M' + (x - s * 14) + ' 198 C' + (x + s * 10) + ' 194 ' +
             (x + s * 20) + ' 202 ' + (x + s * 18) + ' 212 C' + (x + s * 16) + ' 222 ' +
             (x - s * 10) + ' 222 ' + (x - s * 16) + ' 212 Z"/>' +
           // tres uñas, que es lo que se lee a 152 px
           '<path class="tp-stroke" style="stroke-width:2.6" d="M' + (x + s * 16) + ' 206 L' + (x + s * 26) + ' 202' +
             ' M' + (x + s * 12) + ' 216 L' + (x + s * 22) + ' 216' +
             ' M' + (x + s * 2) + ' 220 L' + (x + s * 6) + ' 229"/>';
  }

  var SKIN = {
    ns: 'tp',
    label: 'Topo. Sigue el cursor.',
    edge: 'var(--tp-line)',
    css: CSS,
    head: HEAD.join('\n'),
    hands: {
      left: claw(36, 1),
      right: claw(204, -1),
      chin: '<g transform="rotate(-20 170 150)">' + claw(170, -1) + '</g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
