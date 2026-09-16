/*
 * La taza de café.
 *
 * No es un animal, y ése es el punto: el sistema de avatares no pide bicho, y
 * hasta ahora todos lo eran. Una taza con cara prueba que el contrato aguanta
 * cualquier cosa que entre en la caja de la cabeza.
 *
 * Y no tiene cuerpo: una taza con hombros era justamente lo raro. El torso
 * canónico sigue estando —el path es el de todos y los anclajes de la máquina y
 * de las manos no se mueven, que es lo que la regla protege— pero esta piel no
 * lo pinta: dibuja una mesa en su lugar. Así la escena es lo que tiene que ser,
 * una taza y una notebook apoyadas en la misma mesa.
 *
 * Además resuelve los estados con algo que ningún animal tiene: el vapor.
 * Sube mientras labura, se enrosca cuando piensa y se apaga cuando duerme —
 * una taza fría es la imagen más directa de «acá no está pasando nada» que
 * puede haber. Eso deja `sleeping` clarísimo sin depender de los ojos.
 *
 * La piel; el resto lo pone core/rig.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MugMascot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSS = [
    '.tz {',
    '  --tz-body: #f3f0ea;',
    '  --tz-line: #2f3640;',
    '  --tz-cream: #ffffff;',
    '  --tz-inner: #d8d2c6;',
    '  --tz-brew: #7a4a24;',
    '  --tz-accent: #d97a14;',
    // La mesa no cambia con el esmalte de la taza: es la misma en las tres
    // paletas, como pasaría en una cocina de verdad.
    '  --tz-wood: #b5854f;',
    '  --tz-wood-dark: #8a6039;',
    '  --tz-wood-top: #caa06b;',
    '}',
    '.tz[data-palette="esmalte"] {',
    '  --tz-body: #3f6fa8; --tz-line: #14243a; --tz-cream: #e8f0fa;',
    '  --tz-inner: #305584; --tz-brew: #5e3418; --tz-accent: #e0a53f;',
    '}',
    '.tz[data-palette="termo"] {',
    '  --tz-body: #9aa3ad; --tz-line: #242c34; --tz-cream: #eef2f6;',
    '  --tz-inner: #79828e; --tz-brew: #3d2410; --tz-accent: #c2704a;',
    '}',
    '.tz:focus-visible { outline: 3px solid var(--tz-accent); outline-offset: 8px; border-radius: 14px; }',
    // Una taza blanca sobre un escritorio claro se pierde: acá la que se ajusta
    // no es la tinta del cuerpo sino el contorno, que se afirma.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .tz { --tz-body: #fbf9f5; --tz-inner: #e2ddd2;',
    '    --tz-wood: #c4915a; --tz-wood-dark: #98693e; --tz-wood-top: #d8ad76; }',
    '  :root:not([data-theme="light"]) .tz[data-palette="esmalte"] { --tz-body: #5586bf; --tz-inner: #3f6fa8; }',
    '  :root:not([data-theme="light"]) .tz[data-palette="termo"] { --tz-body: #b3bcc7; --tz-inner: #929ba7; }',
    '}',
    ':root[data-theme="dark"] .tz { --tz-body: #fbf9f5; --tz-inner: #e2ddd2;',
    '  --tz-wood: #c4915a; --tz-wood-dark: #98693e; --tz-wood-top: #d8ad76; }',
    ':root[data-theme="dark"] .tz[data-palette="esmalte"] { --tz-body: #5586bf; --tz-inner: #3f6fa8; }',
    ':root[data-theme="dark"] .tz[data-palette="termo"] { --tz-body: #b3bcc7; --tz-inner: #929ba7; }',

    // El torso canónico se sigue dibujando —está en el andamio de todos— pero
    // esta piel no lo pinta: en su lugar va la mesa, en el hueco `front`.
    '.tz-skin, .tz-belly { fill: none; }',
    '.tz-wood     { fill: var(--tz-wood); }',
    '.tz-wood-top { fill: var(--tz-wood-top); }',
    '.tz-wood-dk  { fill: var(--tz-wood-dark); }',
    '.tz-cream { fill: var(--tz-cream); }',
    '.tz-body  { fill: var(--tz-body); }',
    '.tz-inner { fill: var(--tz-inner); }',
    '.tz-brew  { fill: var(--tz-brew); }',
    '.tz-dark  { fill: var(--tz-line); }',
    '.tz-zzz   { fill: var(--tz-line); }',
    '.tz-stroke { fill: none; stroke: var(--tz-line); stroke-width: 4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    '.tz-paw { fill: var(--tz-body); stroke: var(--tz-line); stroke-width: 3.4; }',

    // El vapor: la señal de estado propia de este avatar.
    '.tz-steam { fill: none; stroke: var(--tz-line); stroke-width: 4.5; stroke-linecap: round;',
    '  opacity: 0; transition: opacity .3s ease; }',
    '@keyframes tz-rise {',
    '  0%   { opacity: 0;   transform: translateY(6px) scaleY(.7); }',
    '  35%  { opacity: .75; }',
    '  100% { opacity: 0;   transform: translateY(-22px) scaleY(1.15); }',
    '}',
    '.tz-steam { transform-box: fill-box; transform-origin: 50% 100%; }',
    '.tz.is-working .tz-steam, .tz.is-thinking .tz-steam, .tz.is-waiting .tz-steam {',
    '  animation: tz-rise 2.6s steps(4, end) infinite; }',
    '.tz.is-working .tz-steam-b, .tz.is-thinking .tz-steam-b, .tz.is-waiting .tz-steam-b {',
    '  animation-delay: .9s; }',
    '.tz.is-working .tz-steam-c, .tz.is-thinking .tz-steam-c, .tz.is-waiting .tz-steam-c {',
    '  animation-delay: 1.7s; }',
    // En reposo humea apenas, sin subir: sigue caliente pero no pasa nada.
    '.tz.is-idle .tz-steam { opacity: .28; }',
    // Dormida no humea: una taza fría es lo más claro que hay para «acá no se
    // puede hacer nada hasta que vuelva».
    '.tz.is-sleeping .tz-steam { opacity: 0; animation: none; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .tz-steam { animation: none !important; opacity: .5; }',
    '  .tz.is-sleeping .tz-steam { opacity: 0; }',
    '}'
  ];

  var HEAD = [
    // El vapor sale de arriba, en zona de accesorio (B.LIMITS deja hasta y 8).
    '      <path class="tz-steam tz-steam-a" d="M92 60 C84 48 100 40 92 26"/>',
    '      <path class="tz-steam tz-steam-b" d="M120 56 C112 44 128 36 120 22"/>',
    '      <path class="tz-steam tz-steam-c" d="M148 60 C140 48 156 40 148 26"/>',

    // La oreja de la taza, a la derecha y por detrás del cuerpo.
    '      <path class="tz-stroke" style="stroke-width:13" d="M196 116 C222 110 222 152 196 150"/>',
    '      <path class="tz-stroke" style="stroke-width:6;stroke:var(--tz-body)" d="M196 116 C222 110 222 152 196 150"/>',

    // El cuerpo de la taza: tronco de cono, más angosto abajo. Entra en B.HEAD.
    '      <path class="tz-body" d="M52 84 L58 168 C60 180 76 186 120 186 C164 186 180 180 182 168 L188 84 Z"/>',
    '      <path class="tz-stroke" d="M52 84 L58 168 C60 180 76 186 120 186 C164 186 180 180 182 168 L188 84 Z"/>',
    // El borde y el café adentro: sin esto es un balde, no una taza.
    '      <ellipse class="tz-cream" cx="120" cy="84" rx="68" ry="14"/>',
    '      <ellipse class="tz-brew" cx="120" cy="84" rx="58" ry="10"/>',
    '      <ellipse class="tz-stroke" cx="120" cy="84" rx="68" ry="14"/>',

    '      <g class="tz-eye">',
    '        <g class="tz-pupil">',
    '          <ellipse class="tz-dark" cx="94" cy="124" rx="10" ry="12"/>',
    '          <circle class="tz-cream" cx="90" cy="119" r="3.4"/>',
    '        </g>',
    '      </g>',
    '      <g class="tz-eye">',
    '        <g class="tz-pupil">',
    '          <ellipse class="tz-dark" cx="146" cy="124" rx="10" ry="12"/>',
    '          <circle class="tz-cream" cx="142" cy="119" r="3.4"/>',
    '        </g>',
    '      </g>',
    // Una sonrisa mínima. En una taza la cara es lo único que la vuelve un
    // personaje, pero con dos rasgos alcanza: más se vuelve una calcomanía.
    '      <path class="tz-stroke" style="stroke-width:3.4" d="M104 148 C112 158 128 158 136 148"/>'
  ];

  // La mesa. Va en el hueco `front` —delante del torso canónico, que esta piel
  // deja sin pintar— y se mueve con el cuerpo, no con la taza: una mesa quieta
  // es justamente lo que hace que la taza parezca apoyada y no flotando.
  //
  // La tabla sangra por los dos costados a propósito. Una mesa que termina
  // adentro del cuadro es una tablita; una que se va por los bordes es una mesa
  // de la que sólo ves el pedazo que tenés delante.
  var FRONT = [
    // las patas primero, para que la tabla les quede por delante
    '      <rect class="tz-wood-dk" x="32" y="196" width="19" height="56" rx="3"/>',
    '      <rect class="tz-wood-dk" x="189" y="196" width="19" height="56" rx="3"/>',
    '      <path class="tz-stroke" style="stroke-width:3.2" d="M32 200 V252 M51 200 V252 M189 200 V252 M208 200 V252"/>',
    // la tabla: canto grueso y cara de arriba más clara, que es lo que la
    // vuelve una superficie y no una franja de color
    '      <rect class="tz-wood" x="-8" y="180" width="256" height="23" rx="2"/>',
    '      <rect class="tz-wood-top" x="-8" y="180" width="256" height="9"/>',
    '      <path class="tz-stroke" d="M-8 180 H248 M-8 189 H248 M-8 203 H248"/>',
    // dos vetas, para que la tabla no sea un rectángulo liso
    '      <path class="tz-stroke" style="stroke-width:2;opacity:.25" d="M18 196 H86 M154 196 H226"/>',
    // la sombra de la taza sobre la tabla: es lo que la apoya de verdad
    '      <ellipse class="tz-dark" style="opacity:.16" cx="120" cy="186" rx="64" ry="6"/>'
  ];

  function mitt(x) {
    return '<ellipse class="tz-paw" cx="' + x + '" cy="210" rx="14" ry="10"/>';
  }

  var SKIN = {
    ns: 'tz',
    label: 'Taza de café. Sigue el cursor.',
    edge: 'var(--tz-line)',
    css: CSS,
    head: HEAD.join('\n'),
    front: FRONT.join('\n'),
    hands: {
      left: mitt(34),
      right: mitt(206),
      chin: '<g transform="rotate(-20 166 152)"><ellipse class="tz-paw" cx="166" cy="152" rx="13" ry="9.5"/></g>'
    }
  };

  return {
    mount: function (host, options) { return window.PetRig.mount(host, options, SKIN); },
    skin: SKIN
  };
});
