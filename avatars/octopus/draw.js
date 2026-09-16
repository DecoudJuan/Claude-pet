/*
 * El pulpo.
 *
 * Es el que mejor resuelve `working` de todo el catálogo, y no por el dibujo
 * sino por la anatomía: donde los demás tienen dos manos, éste tiene ocho
 * brazos. Cuatro sobre el teclado tecleando en contratiempo se lee como
 * «está laburando en serio» de un vistazo, sin que haga falta ver la pantalla.
 *
 * También es la silueta más distinta: sin orejas, sin hocico, una cúpula lisa
 * con dos ojos enormes. Al lado de tres roedores y un oso, es lo que evita que
 * el catálogo entero parezca el mismo dibujo con distinta cara.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OctopusMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.pl {',
    '  --pl-skin: #a05bb5;',
    '  --pl-line: #2b1436;',
    '  --pl-cream: #f3e3f7;',
    '  --pl-inner: #83429a;',
    '  --pl-sucker: #e7b9d8;',
    '  --pl-accent: #d97a14;',
    '}',
    '.pl[data-palette="coral"] {',
    '  --pl-skin: #e0685f; --pl-line: #3d120f; --pl-cream: #ffe6e0;',
    '  --pl-inner: #c24a44; --pl-sucker: #f7c3b4; --pl-accent: #3f8fa8;',
    '}',
    '.pl[data-palette="abisal"] {',
    '  --pl-skin: #3f6d8e; --pl-line: #0f2230; --pl-cream: #d9ecf5;',
    '  --pl-inner: #2f5773; --pl-sucker: #9fc9dd; --pl-accent: #e0b24a;',
    '}',
    '.pl:focus-visible { outline: 3px solid var(--pl-accent); outline-offset: 8px; border-radius: 14px; }',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .pl { --pl-skin: #bb74cf; --pl-inner: #9c58b2; }',
    '  :root:not([data-theme="light"]) .pl[data-palette="coral"] { --pl-skin: #ef7d74; --pl-inner: #d85f58; }',
    '  :root:not([data-theme="light"]) .pl[data-palette="abisal"] { --pl-skin: #5b8dae; --pl-inner: #467293; }',
    '}',
    ':root[data-theme="dark"] .pl { --pl-skin: #bb74cf; --pl-inner: #9c58b2; }',
    ':root[data-theme="dark"] .pl[data-palette="coral"] { --pl-skin: #ef7d74; --pl-inner: #d85f58; }',
    ':root[data-theme="dark"] .pl[data-palette="abisal"] { --pl-skin: #5b8dae; --pl-inner: #467293; }',

    '.pl-skin  { fill: var(--pl-skin); }',
    '.pl-belly { fill: var(--pl-cream); }',
    '.pl-flesh { fill: var(--pl-skin); }',
    '.pl-cream { fill: var(--pl-cream); }',
    '.pl-inner { fill: var(--pl-inner); }',
    '.pl-dark  { fill: var(--pl-line); }',
    '.pl-zzz   { fill: var(--pl-line); }',
    '.pl-sucker { fill: var(--pl-sucker); }',
    '.pl-stroke { fill: none; stroke: var(--pl-line); stroke-width: 3.4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.pl-arm { fill: none; stroke: var(--pl-skin); stroke-width: 15; stroke-linecap: round; }',
    '.pl-arm-line { fill: none; stroke: var(--pl-line); stroke-width: 3.2; stroke-linecap: round; }',

    // Los brazos de atrás ondulan siempre, cada uno a su ritmo: es lo que hace
    // que el pulpo se vea vivo aun quieto. Períodos primos entre sí para que el
    // conjunto no vuelva a coincidir y no se lea como un loop.
    '.pl-wave { transform-box: fill-box; transform-origin: 50% 0%; }',
    '@keyframes pl-wave { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }',
    '.pl-wave-a { animation: pl-wave 3.1s ease-in-out infinite; }',
    '.pl-wave-b { animation: pl-wave 4.3s ease-in-out infinite; }',
    '.pl-wave-c { animation: pl-wave 5.7s ease-in-out infinite; }',
    '.pl-wave-d { animation: pl-wave 3.7s ease-in-out infinite; }',
    '.pl.is-sleeping .pl-wave { animation-duration: 9s; }',

    // Los dos brazos de más que caen sobre el teclado. Sólo se ven laburando:
    // en reposo un pulpo no deja los brazos en el aire.
    '.pl-extra { opacity: 0; transition: opacity .22s ease; }',
    '.pl.is-working .pl-extra, .pl.is-thinking .pl-extra { opacity: 1; }',
    '@keyframes pl-tap2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }',
    '.pl.is-working .pl-extra-l { animation: pl-tap2 .26s steps(1, end) .065s infinite; }',
    '.pl.is-working .pl-extra-r { animation: pl-tap2 .26s steps(1, end) .195s infinite; }',
    '.pl-extra { transform-box: fill-box; transform-origin: 50% 50%; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pl-wave, .pl.is-working .pl-extra-l, .pl.is-working .pl-extra-r { animation: none; }',
    '}'
  ];

  // La cúpula del manto entra en B.HEAD. Sin orejas ni hocico: el pulpo es todo
  // frente y ojos.
  var HEAD = [
    '      <path class="pl-flesh" d="M120 32 C72 32 40 66 38 112 C36 158 72 186 120 186' +
      ' C168 186 204 158 202 112 C200 66 168 32 120 32 Z"/>',
    // dos manchas de manto, para que la cúpula no sea una pelota lisa
    '      <ellipse class="pl-inner" cx="82" cy="66" rx="16" ry="10" transform="rotate(-22 82 66)"/>',
    '      <ellipse class="pl-inner" cx="158" cy="66" rx="16" ry="10" transform="rotate(22 158 66)"/>',

    // Ojos enormes, que es lo que más se lee: un pulpo es dos ojos con cuerpo.
    '      <g class="pl-eye">',
    '        <ellipse class="pl-cream" cx="88" cy="116" rx="27" ry="25"/>',
    '        <g class="pl-pupil">',
    // Pupila horizontal, como la de un pulpo de verdad: es lo que lo separa de
    // cualquier mamífero del catálogo. Pero achatada de más se lee como un ojo
    // cerrado —el pulpo parecía dormido en los siete estados—, así que es una
    // barra alta, no una ranura.
    '          <rect class="pl-dark" x="75" y="105" width="26" height="21" rx="9"/>',
    '          <circle class="pl-cream" cx="82" cy="110" r="3.4"/>',
    '        </g>',
    '        <ellipse class="pl-stroke" cx="88" cy="116" rx="27" ry="25"/>',
    '      </g>',
    '      <g class="pl-eye">',
    '        <ellipse class="pl-cream" cx="152" cy="116" rx="27" ry="25"/>',
    '        <g class="pl-pupil">',
    '          <rect class="pl-dark" x="139" y="105" width="26" height="21" rx="9"/>',
    '          <circle class="pl-cream" cx="146" cy="110" r="3.4"/>',
    '        </g>',
    '        <ellipse class="pl-stroke" cx="152" cy="116" rx="27" ry="25"/>',
    '      </g>',
    // boca chica, apenas una curva: con los ojos de este tamaño, cualquier boca
    // grande lo vuelve una caricatura
    '      <path class="pl-stroke" style="stroke-width:3" d="M111 158 C116 163 124 163 129 158"/>'
  ];

  // Cuatro brazos detrás del torso, dos por lado, ondulando cada uno a su ritmo.
  function arm(d, cls) {
    return '<g class="pl-wave ' + cls + '">' +
             '<path class="pl-arm" d="' + d + '"/>' +
             '<path class="pl-arm-line" style="opacity:.35" d="' + d + '"/>' +
           '</g>';
  }

  var BEHIND = [
    arm('M58 196 C22 200 8 224 12 250', 'pl-wave-a'),
    arm('M74 190 C40 182 18 196 14 216', 'pl-wave-b'),
    arm('M182 196 C218 200 232 224 228 250', 'pl-wave-c'),
    arm('M166 190 C200 182 222 196 226 216', 'pl-wave-d')
  ];

  // La punta de un brazo sobre el teclado: se enrosca y muestra las ventosas.
  function tip(x, s) {
    return '<path class="pl-arm" style="stroke-width:17" d="M' + (x - s * 4) + ' 232 C' + (x - s * 2) + ' 216 ' +
             (x + s * 12) + ' 212 ' + (x + s * 10) + ' 202"/>' +
           '<circle class="pl-sucker" cx="' + (x + s * 7) + '" cy="206" r="3.4"/>' +
           '<circle class="pl-sucker" cx="' + (x + s * 2) + '" cy="216" r="3.4"/>';
  }

  var SKIN = {
    ns: 'pl',
    label: 'Pulpo. Sigue el cursor.',
    edge: 'var(--pl-line)',
    css: CSS,
    head: HEAD.join('\n'),
    behind: BEHIND.join('\n'),
    hands: {
      // los dos de siempre, más otros dos: cuatro brazos tecleando en
      // contratiempo. Es la ventaja de tener ocho.
      left: tip(36, 1) + '<g class="pl-extra pl-extra-l">' + tip(66, 1) + '</g>',
      right: tip(204, -1) + '<g class="pl-extra pl-extra-r">' + tip(174, -1) + '</g>',
      chin: '<g transform="rotate(-16 168 150)">' + tip(168, -1) + '</g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
