/*
 * El cangrejo.
 *
 * Es el único del catálogo que no tiene cuello ni cara en el sentido normal: lo
 * que se lee como cabeza es el caparazón, y los ojos viven afuera, arriba de
 * dos pedúnculos. Eso lo vuelve el que mejor sigue el cursor de todos — los
 * ojos están despegados del cráneo, así que el paralaje tiene el doble de
 * recorrido y se nota desde lejos que te está mirando.
 *
 * Y las manos son pinzas. No es un adorno: en `waiting` una pinza abierta a la
 * altura de la cara es la lectura más clara de «pará, che» que hay en todo el
 * catálogo.
 *
 * El dibujo sale del armazón compartido (core/rig.js): acá está la piel y nada
 * más. Ver AVATARS.md para el contrato y la skill avatar-designer para el
 * criterio de cada estado.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrabMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Naranja Claude de fábrica. El contorno tiene tinta propia, más oscura que
  // el caparazón: la boca y la juntura se pierden si comparten el mismo tono.
  var CSS = [
    '.cb {',
    '  --cb-shell: #d9702a;',
    '  --cb-line: #4a1d0c;',
    '  --cb-cream: #f6d9b4;',
    '  --cb-inner: #b8511a;',
    '  --cb-accent: #d97a14;',
    '}',
    '.cb[data-palette="coral"] {',
    '  --cb-shell: #e3617a; --cb-line: #4b1524; --cb-cream: #ffe2e7;',
    '  --cb-inner: #c2455f; --cb-accent: #4f9db7;',
    '}',
    '.cb[data-palette="roca"] {',
    '  --cb-shell: #7d8794; --cb-line: #222b33; --cb-cream: #e5ebf0;',
    '  --cb-inner: #616c79; --cb-accent: #d9a441;',
    '}',
    '.cb:focus-visible { outline: 3px solid var(--cb-accent); outline-offset: 8px; border-radius: 14px; }',
    // La ventana es transparente: sobre un escritorio oscuro un naranja medio se
    // apaga. Se levanta el caparazón lo justo para que la silueta siga
    // leyéndose, sin tocar el contorno.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .cb { --cb-shell: #ec8440; --cb-inner: #cf6427; }',
    '  :root:not([data-theme="light"]) .cb[data-palette="coral"] { --cb-shell: #f0788f; --cb-inner: #d55871; }',
    '  :root:not([data-theme="light"]) .cb[data-palette="roca"] { --cb-shell: #9aa5b3; --cb-inner: #7b8794; }',
    '}',
    ':root[data-theme="dark"] .cb { --cb-shell: #ec8440; --cb-inner: #cf6427; }',
    ':root[data-theme="dark"] .cb[data-palette="coral"] { --cb-shell: #f0788f; --cb-inner: #d55871; }',
    ':root[data-theme="dark"] .cb[data-palette="roca"] { --cb-shell: #9aa5b3; --cb-inner: #7b8794; }',

    '.cb-skin   { fill: var(--cb-shell); }',
    '.cb-belly  { fill: var(--cb-cream); }',
    '.cb-inner  { fill: var(--cb-inner); }',
    '.cb-dark   { fill: var(--cb-line); }',
    '.cb-cream  { fill: var(--cb-cream); }',
    '.cb-zzz    { fill: var(--cb-line); }',
    '.cb-stroke { fill: none; stroke: var(--cb-line); stroke-width: 3.6;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.cb-claw   { fill: var(--cb-shell); stroke: var(--cb-line); stroke-width: 3.5;',
    '  stroke-linejoin: round; }',

    // Los pedúnculos: el tallo sale del caparazón y el ojo va arriba. El grupo
    // entero se inclina un toque con la mirada, además del paralaje de la
    // pupila — un ojo montado en un palo que no se mueve parece de plástico.
    '.cb-stalk { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .3s ease; }',
    // Esperando, los dos se estiran y se separan: es el gesto de «levantar la
    // vista» de un bicho que no tiene cuello para levantar.
    '.cb.is-waiting .cb-stalk-l { transform: translate(-3px, -5px) rotate(-7deg); }',
    '.cb.is-waiting .cb-stalk-r { transform: translate(3px, -5px) rotate(7deg); }',
    // Durmiendo se doblan hacia adelante, como una antena floja. Es lo que
    // separa dormir de estar en reposo sin depender de los ojos, que a este
    // tamaño ya están cerrados en los dos.
    '.cb.is-sleeping .cb-stalk-l { transform: translateY(7px) rotate(19deg); }',
    '.cb.is-sleeping .cb-stalk-r { transform: translateY(7px) rotate(-19deg); }',
    '@media (prefers-reduced-motion: reduce) { .cb-stalk { transition: none; } }'
  ];

  // El caparazón entra en B.HEAD (x 28..212, y 30..186). Los pedúnculos salen
  // de ahí para arriba, que es zona de accesorio: llegan a y 22, bien adentro
  // de B.LIMITS (y 8).
  var HEAD = [
    // Las patitas de atrás asoman a los costados del caparazón: sin ellas la
    // silueta es una piedra con ojos.
    '      <path class="cb-stroke" d="M40 132 C24 128 16 136 12 146"/>',
    '      <path class="cb-stroke" d="M42 148 C26 148 18 158 16 168"/>',
    '      <path class="cb-stroke" d="M200 132 C216 128 224 136 228 146"/>',
    '      <path class="cb-stroke" d="M198 148 C214 148 222 158 224 168"/>',

    // Pedúnculos. Van ANTES del caparazón para que el tallo nazca por detrás.
    '      <g class="cb-stalk cb-stalk-l">',
    '        <path class="cb-stroke" style="stroke-width:7" d="M92 104 L88 54"/>',
    '        <g class="cb-eye">',
    '          <circle class="cb-cream" cx="88" cy="42" r="16"/>',
    '          <g class="cb-pupil"><circle class="cb-dark" cx="88" cy="42" r="8"/>',
    '          <circle class="cb-cream" cx="85" cy="38" r="2.6"/></g>',
    '          <circle class="cb-stroke" cx="88" cy="42" r="16"/>',
    '        </g>',
    '      </g>',
    '      <g class="cb-stalk cb-stalk-r">',
    '        <path class="cb-stroke" style="stroke-width:7" d="M148 104 L152 54"/>',
    '        <g class="cb-eye">',
    '          <circle class="cb-cream" cx="152" cy="42" r="16"/>',
    '          <g class="cb-pupil"><circle class="cb-dark" cx="152" cy="42" r="8"/>',
    '          <circle class="cb-cream" cx="149" cy="38" r="2.6"/></g>',
    '          <circle class="cb-stroke" cx="152" cy="42" r="16"/>',
    '        </g>',
    '      </g>',

    // El caparazón: ancho arriba, angosto abajo, con el borde dentado apenas
    // insinuado. A 152 px lo que se lee es el contorno, no los detalles.
    '      <path class="cb-skin" d="M120 76 C74 76 36 96 34 124 C32 156 70 182 120 182' +
      ' C170 182 208 156 206 124 C204 96 166 76 120 76 Z"/>',
    // Dos manchas más oscuras: le dan volumen sin agregar una línea más.
    '      <ellipse class="cb-inner" cx="70" cy="150" rx="19" ry="11"/>',
    '      <ellipse class="cb-inner" cx="170" cy="150" rx="19" ry="11"/>',
    '      <path class="cb-stroke" style="stroke-width:3" d="M52 120 C74 108 166 108 188 120"/>',
    // La boca: dos mandíbulas chiquitas. Nada de sonrisa — un cangrejo no
    // sonríe, y a este tamaño una curva de más lo vuelve un oso naranja.
    '      <path class="cb-stroke" d="M104 158 L112 164 L120 158 L128 164 L136 158"/>'
  ];

  // Las pinzas, en los anclajes de PetBody. La de arriba es la móvil: el dedo
  // que se abre. Con la notebook abierta las dos caen sobre el teclado.
  function claw(x, dir) {
    var s = dir;   // 1 mira a la derecha, -1 a la izquierda
    return [
      '<path class="cb-claw" d="M' + x + ' 200 C' + (x + s * 17) + ' 198 ' + (x + s * 21) + ' 210 ' +
        (x + s * 12) + ' 214 C' + (x + s * 2) + ' 218 ' + (x - s * 12) + ' 214 ' + (x - s * 13) + ' 206' +
        ' C' + (x - s * 14) + ' 200 ' + (x - s * 6) + ' 200 ' + x + ' 200 Z"/>',
      // el dedo móvil, separado por una muesca — es lo que la vuelve una pinza
      // y no una manopla
      '<path class="cb-claw" d="M' + (x - s * 2) + ' 199 C' + (x + s * 8) + ' 193 ' + (x + s * 20) + ' 194 ' +
        (x + s * 22) + ' 201 C' + (x + s * 14) + ' 202 ' + (x + s * 6) + ' 203 ' + (x - s * 2) + ' 205 Z"/>'
    ].join('');
  }

  var SKIN = {
    ns: 'cb',
    label: 'Cangrejo. Sigue el cursor.',
    edge: 'var(--cb-line)',
    css: CSS,
    head: HEAD.join('\n'),
    hands: {
      left: claw(36, 1),
      right: claw(204, -1),
      // pensando: una pinza sube a la altura de la cara, entreabierta
      chin: '<g transform="rotate(-18 172 150)">' + claw(172, -1) + '</g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
