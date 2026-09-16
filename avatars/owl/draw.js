/*
 * El búho.
 *
 * Se lleva `sleeping` mejor que ninguno: es el único al que dormir le queda
 * natural, y el único que además puede hacer lo contrario — los ojos de un búho
 * abiertos de par en par son la cara de «estoy mirando» más literal que hay.
 *
 * Los discos faciales son enormes a propósito: son el marco que hace que la
 * pupila se lea desde lejos, así que este avatar es el que más rinde el
 * paralaje de la mirada.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OwlMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.bh {',
    '  --bh-fur: #8a6242;',
    '  --bh-line: #2c1a10;',
    '  --bh-cream: #efdcc0;',
    '  --bh-inner: #6d4a30;',
    '  --bh-beak: #e0a53f;',
    '  --bh-accent: #d97a14;',
    '}',
    '.bh[data-palette="nevado"] {',
    '  --bh-fur: #eceef2; --bh-line: #3c4450; --bh-cream: #ffffff;',
    '  --bh-inner: #cdd4de; --bh-beak: #d4b054; --bh-accent: #5f88b0;',
    '}',
    '.bh[data-palette="leonado"] {',
    '  --bh-fur: #c98a3e; --bh-line: #3a2410; --bh-cream: #f8e4bc;',
    '  --bh-inner: #a86d2b; --bh-beak: #e6bc55; --bh-accent: #57794f;',
    '}',
    '.bh:focus-visible { outline: 3px solid var(--bh-accent); outline-offset: 8px; border-radius: 14px; }',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .bh { --bh-fur: #a87b58; --bh-inner: #8a6242; }',
    '  :root:not([data-theme="light"]) .bh[data-palette="nevado"] { --bh-fur: #f4f6f9; --bh-inner: #d8dfe8; }',
    '  :root:not([data-theme="light"]) .bh[data-palette="leonado"] { --bh-fur: #dda155; --bh-inner: #bd8036; }',
    '}',
    ':root[data-theme="dark"] .bh { --bh-fur: #a87b58; --bh-inner: #8a6242; }',
    ':root[data-theme="dark"] .bh[data-palette="nevado"] { --bh-fur: #f4f6f9; --bh-inner: #d8dfe8; }',
    ':root[data-theme="dark"] .bh[data-palette="leonado"] { --bh-fur: #dda155; --bh-inner: #bd8036; }',

    '.bh-skin  { fill: var(--bh-fur); }',
    '.bh-belly { fill: var(--bh-cream); }',
    '.bh-fur   { fill: var(--bh-fur); }',
    '.bh-cream { fill: var(--bh-cream); }',
    '.bh-inner { fill: var(--bh-inner); }',
    '.bh-beak  { fill: var(--bh-beak); }',
    '.bh-dark  { fill: var(--bh-line); }',
    '.bh-zzz   { fill: var(--bh-line); }',
    '.bh-stroke { fill: none; stroke: var(--bh-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.bh-claw { fill: var(--bh-beak); stroke: var(--bh-line); stroke-width: 3.2;',
    '  stroke-linejoin: round; }',

    // El iris se agranda esperando y se achica clavado en la pantalla: es el
    // mismo recurso que la pupila del gato, que en un búho se lee todavía mejor
    // porque el disco facial le hace de marco.
    '.bh-iris { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    '.bh.is-working .bh-iris, .bh.is-thinking .bh-iris { transform: scale(.78); }',
    '.bh.is-waiting .bh-iris { transform: scale(1.22); }',
    '@media (prefers-reduced-motion: reduce) { .bh-iris { transition: none; } }'
  ];

  var HEAD = [
    // Penachos: puntudos y separados, lo que distingue un búho de una lechuza.
    '      <g class="bh-ear">',
    '        <path class="bh-fur" d="M48 92 C40 60 46 34 62 24 C70 46 74 70 70 92 Z"/>',
    '      </g>',
    '      <g class="bh-ear">',
    '        <path class="bh-fur" d="M192 92 C200 60 194 34 178 24 C170 46 166 70 170 92 Z"/>',
    '      </g>',

    '      <path class="bh-fur" d="M120 38 C68 38 34 70 32 116 C30 158 68 186 120 186' +
      ' C172 186 210 158 208 116 C206 70 172 38 120 38 Z"/>',

    // Los discos faciales: dos círculos claros que se tocan en el medio. Es la
    // cara de un búho en dos formas.
    '      <circle class="bh-cream" cx="86" cy="112" r="42"/>',
    '      <circle class="bh-cream" cx="154" cy="112" r="42"/>',
    '      <circle class="bh-stroke" style="stroke-width:2.6;opacity:.45" cx="86" cy="112" r="42"/>',
    '      <circle class="bh-stroke" style="stroke-width:2.6;opacity:.45" cx="154" cy="112" r="42"/>',

    '      <g class="bh-eye">',
    '        <g class="bh-iris"><circle class="bh-beak" cx="86" cy="112" r="24"/></g>',
    '        <g class="bh-pupil">',
    '          <circle class="bh-dark" cx="86" cy="112" r="14"/>',
    '          <circle class="bh-cream" cx="80" cy="105" r="4.6"/>',
    '        </g>',
    '        <circle class="bh-stroke" cx="86" cy="112" r="24"/>',
    '      </g>',
    '      <g class="bh-eye">',
    '        <g class="bh-iris"><circle class="bh-beak" cx="154" cy="112" r="24"/></g>',
    '        <g class="bh-pupil">',
    '          <circle class="bh-dark" cx="154" cy="112" r="14"/>',
    '          <circle class="bh-cream" cx="148" cy="105" r="4.6"/>',
    '        </g>',
    '        <circle class="bh-stroke" cx="154" cy="112" r="24"/>',
    '      </g>',

    // Pico corto y ganchudo, entre los dos discos.
    '      <path class="bh-beak" d="M120 128 L132 146 C128 158 112 158 108 146 Z"/>',
    '      <path class="bh-stroke" style="stroke-width:2.8" d="M120 128 L132 146 C128 158 112 158 108 146 Z"/>',
    // plumón del pecho, apenas insinuado sobre la clavícula
    '      <path class="bh-stroke" style="stroke-width:2.4;opacity:.4" d="M96 176 q8 -7 16 0 q8 7 16 0 q8 -7 16 0"/>'
  ];

  // Garras de rapaz: tres dedos y una uña por dedo.
  function talon(x, s) {
    return '<path class="bh-claw" d="M' + (x - s * 13) + ' 202 C' + (x + s * 8) + ' 198 ' +
             (x + s * 16) + ' 206 ' + (x + s * 14) + ' 214 C' + (x + s * 10) + ' 220 ' +
             (x - s * 10) + ' 220 ' + (x - s * 15) + ' 210 Z"/>' +
           '<path class="bh-stroke" style="stroke-width:2.4" d="M' + (x + s * 12) + ' 212 L' + (x + s * 20) + ' 216' +
             ' M' + (x + s * 2) + ' 218 L' + (x + s * 4) + ' 226' +
             ' M' + (x - s * 9) + ' 216 L' + (x - s * 14) + ' 223"/>';
  }

  var SKIN = {
    ns: 'bh',
    label: 'Búho. Sigue el cursor.',
    edge: 'var(--bh-line)',
    css: CSS,
    head: HEAD.join('\n'),
    hands: {
      left: talon(36, 1),
      right: talon(204, -1),
      chin: '<g transform="rotate(-18 170 152)">' + talon(170, -1) + '</g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
