/*
 * otter-mascot — un busto de nutria en SVG que sigue el cursor, parpadea,
 * teclea y se toca la pera cuando piensa. Sin dependencias.
 *
 *   <div id="mascota"></div>
 *   <script src="core/body.js"></script>
 *   <script src="avatars/otter/draw.js"></script>
 *   <script>OtterMascot.mount(document.getElementById('mascota'));</script>
 *
 * El torso sale de PetBody y la notebook la dibuja PetDevices: acá sólo hay
 * cabeza, cara, bigotes y manos.
 */
(function (root, factory) {
  root.OtterMascot = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var STYLE_ID = 'otter-mascot-style';

  var CSS = [
    // La nutria de río no es marrón chocolate: es gris pardo apagado, con la
    // cara y la garganta un gris claro — no un crema cálido. Los tonos salen
    // de una foto de una nutria de verdad, no de la idea que uno tiene de una.
    '.ot {',
    '  --ot-fur: #6e6459;',
    // el contorno tiene tinta propia, más oscura que el pelo: la nariz y el
    // hocico se pierden si comparten el gris del cuerpo.
    '  --ot-line: #2b2621;',
    '  --ot-cream: #d8d2c5;',
    '  --ot-inner: #968d80;',
    // el acento es el verde del pasto de esa foto: lo único que no es gris
    '  --ot-accent: #8a9a6b;',
    '  display: block; width: 100%; height: auto; max-width: 100%;',
    '  overflow: visible; cursor: pointer; touch-action: manipulation;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.ot[data-palette="marina"] {',
    '  --ot-fur: #6a707a; --ot-line: #1f242a; --ot-cream: #f1f4f7;',
    '  --ot-inner: #9aa3ad; --ot-accent: #5fa8c4;',
    '}',
    '.ot[data-palette="kelp"] {',
    '  --ot-fur: #3f6b56; --ot-line: #10281f; --ot-cream: #f1fbf4;',
    '  --ot-inner: #79a68d; --ot-accent: #ffb13a;',
    '}',
    '.ot:focus-visible { outline: 3px solid var(--ot-accent); outline-offset: 8px; border-radius: 14px; }',
    // La ventana es transparente: sobre un escritorio oscuro un marrón medio se
    // apaga hasta ser una mancha. Se levanta el pelo lo justo para que la
    // silueta siga leyéndose, sin tocar el contorno.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .ot { --ot-fur: #948a7c; --ot-inner: #b6ada0; }',
    '  :root:not([data-theme="light"]) .ot[data-palette="marina"] { --ot-fur: #949ba6; --ot-inner: #b9c1cb; }',
    '  :root:not([data-theme="light"]) .ot[data-palette="kelp"] { --ot-fur: #5d9b7d; --ot-inner: #93c4ab; }',
    '}',
    ':root[data-theme="dark"] .ot { --ot-fur: #948a7c; --ot-inner: #b6ada0; }',
    ':root[data-theme="dark"] .ot[data-palette="marina"] { --ot-fur: #949ba6; --ot-inner: #b9c1cb; }',
    ':root[data-theme="dark"] .ot[data-palette="kelp"] { --ot-fur: #5d9b7d; --ot-inner: #93c4ab; }',
    '.ot-fur    { fill: var(--ot-fur); }',
    '.ot-cream  { fill: var(--ot-cream); }',
    '.ot-inner  { fill: var(--ot-inner); }',
    '.ot-dark   { fill: var(--ot-line); }',
    '.ot-mouth  { fill: none; stroke: var(--ot-line); stroke-width: 4; stroke-linecap: round; }',
    // los bigotes son finitos a propósito: a 152 px tienen que sugerirse, no
    // competir con la cara.
    '.ot-whisk  { fill: none; stroke: var(--ot-line); stroke-width: 2.2; stroke-linecap: round; opacity: .72; }',
    '.ot-whiskers { transform-box: fill-box; transform-origin: 50% 20%; transition: transform .3s ease; }',
    '.ot.is-sleeping .ot-whiskers { transform: translateY(4px) scaleY(.82); }',
    // --- estados de trabajo: la notebook y el tecleo ---
    '.ot-laptop { opacity: 0; transition: opacity .22s ease; pointer-events: none; }',
    // esperando también muestra la notebook: sigue a mitad de tarea, no terminó
    '.ot.is-working .ot-laptop, .ot.is-thinking .ot-laptop, .ot.is-waiting .ot-laptop { opacity: 1; }',
    // las manos van sobre el cuerpo, del mismo pelo: sin contorno propio
    // desaparecen y no se ve el tecleo.
    '.ot-hand { fill: var(--ot-fur); stroke: var(--ot-line); stroke-width: 3.5;',
    '  transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    // esperando: las dos manos se sueltan del teclado y suben a la vista, por
    // encima del canto de la tapa. Si sólo se despegan un poco, a 152 px no se
    // distingue de working — y es el estado que no se puede confundir.
    '.ot.is-waiting .ot-hand-l { transform: translate(-7px, -20px); }',
    '.ot.is-waiting .ot-hand-r { transform: translate(7px, -20px); }',
    // pensando: la pata sube a la pera. Es la misma tarea que working, otra
    // pose — la notebook sigue abierta. La pata de la pera es una pieza aparte,
    // dibujada por delante de la máquina: la mano del teclado queda atrás de la
    // tapa y desde ahí no hay forma de que llegue a la cara.
    '.ot-chin { opacity: 0; transition: opacity .25s ease; }',
    '.ot.is-thinking .ot-chin { opacity: 1; }',
    '.ot.is-thinking .ot-hand-r { opacity: 0; }',
    // steps(1) en vez de interpolar: el tecleo salta entre dos posiciones y
    // repinta 8 veces por segundo en lugar de 60. Además se lee más seco.
    '@keyframes ot-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }',
    '.ot.is-working .ot-hand-l { animation: ot-tap .26s steps(1, end) infinite; }',
    '.ot.is-working .ot-hand-r { animation: ot-tap .26s steps(1, end) .13s infinite; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .ot.is-working .ot-hand-l, .ot.is-working .ot-hand-r { animation: none; }',
    '  .ot-hand, .ot-ear, .ot-eye, .ot-whiskers { transition: none; }',
    '}',
    '.ot-all { transform-box: fill-box; transform-origin: 50% 96%; }',
    '.ot-eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .12s ease; }',
    '.ot.is-blinking .ot-eye, .ot.is-sleeping .ot-eye { transform: scaleY(.08); }',
    // esperando: ojos bien abiertos y orejas paradas. Es el único estado donde
    // la nutria te busca a vos y no a la pantalla.
    '.ot.is-waiting .ot-eye { transform: scale(1.14); }',
    '.ot-ear { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .3s ease; }',
    '.ot.is-waiting .ot-ear { transform: translateY(-4px) scale(1.1); }',
    '.ot.is-sleeping .ot-ear { transform: translateY(3px) scale(.92); }',
    // Durmiendo: una Z que sube. steps(3) — puede quedarse así horas y no vale
    // repintar 60 veces por segundo por un adorno.
    '.ot-zzz { fill: var(--ot-line); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 26px; font-weight: 600; opacity: 0; pointer-events: none;',
    '  transform-box: fill-box; transform-origin: 50% 50%; }',
    '@keyframes ot-zzz {',
    '  0%   { opacity: .85; transform: translate(0, 0) scale(.8); }',
    '  33%  { opacity: .7;  transform: translate(6px, -14px) scale(1); }',
    '  66%  { opacity: .35; transform: translate(12px, -28px) scale(1.15); }',
    '  100% { opacity: 0;   transform: translate(18px, -40px) scale(1.2); }',
    '}',
    '.ot.is-sleeping .ot-zzz   { animation: ot-zzz 4.2s steps(3, end) infinite; }',
    '.ot.is-sleeping .ot-zzz-b { animation-delay: 2.1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .ot.is-sleeping .ot-zzz { animation: none; opacity: .6; }',
    '}',
    '.ot-note {',
    '  fill: var(--ot-accent); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 30px; font-weight: 600; opacity: 0;',
    '  transform-box: fill-box; transform-origin: 50% 50%;',
    '  pointer-events: none;',
    '}',
    '@keyframes ot-squash {',
    '  0%   { transform: translateY(0) scale(1, 1); }',
    '  20%  { transform: translateY(9px) scale(1.08, .9); }',
    '  48%  { transform: translateY(-9px) scale(.95, 1.07); }',
    '  72%  { transform: translateY(3px) scale(1.03, .975); }',
    '  100% { transform: translateY(0) scale(1, 1); }',
    '}',
    '@keyframes ot-float {',
    '  0%   { opacity: 0; transform: translate(0, 0) scale(.55) rotate(-8deg); }',
    '  18%  { opacity: 1; }',
    '  100% { opacity: 0; transform: translate(var(--ot-nx, -10px), -52px) scale(1.1) rotate(-14deg); }',
    '}',
    // --- entrar y salir ---
    // Sube desde abajo del cuadro, como si asomara por detrás de la barra de
    // tareas, y se queda quieta arriba mientras dura el saludo. Al irse es el
    // camino inverso. Derecho, sin balanceo: entra y sale una vez por sesión,
    // y un personaje que se tambalea al aparecer se lee como un tropiezo, no
    // como un saludo — el saludo lo dice el globo.
    //
    // Se queda abajo al final (`forwards`) porque después de esto la ventana
    // se cierra: si volviera al centro, el último cuadro sería la nutria otra vez
    // entera, justo lo que se acaba de despedir.
    '@keyframes ot-hello {',
    '  0%   { opacity: 0; transform: translateY(150px); }',
    '  55%  { opacity: 1; }',
    '  100% { opacity: 1; transform: translateY(0); }',
    '}',
    '@keyframes ot-bye {',
    '  0%   { opacity: 1; transform: translateY(0); }',
    '  62%  { opacity: 1; transform: translateY(0); }',
    '  100% { opacity: 0; transform: translateY(150px); }',
    '}',
    // Las curvas son las de algo que entra frenando y sale acelerando, sin
    // rebote: `ease-out` para asomar, `ease-in` para hundirse.
    '.ot.is-greeting .ot-all { animation: ot-hello .62s cubic-bezier(.22, .68, .3, 1) both; }',
    '.ot.is-farewell .ot-all { animation: ot-bye 2s cubic-bezier(.5, 0, .9, .35) forwards; }',
    // Sin movimiento no se entra ni se sale volando, pero el saludo sigue
    // existiendo: lo dice el cartel del pet, y acá sólo se está quieta.
    '@media (prefers-reduced-motion: reduce) {',
    '  .ot.is-greeting .ot-all, .ot.is-farewell .ot-all { animation: none; }',
    '}',
    '.ot.is-poked .ot-all  { animation: ot-squash .62s cubic-bezier(.34, 1.36, .5, 1); }',
    '.ot.is-poked .ot-note { animation: ot-float .95s ease-out; }',
    '.ot.is-poked .ot-note-b { animation-delay: .1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .ot.is-poked .ot-all, .ot.is-poked .ot-note { animation: none; }',
    '  .ot-eye { transition: none; }',
    '}'
  ].join('\n');

  // El busto se corta contra el borde inferior del viewBox: el torso se dibuja
  // más abajo de lo que se ve y se recorta, para no dejar franja al moverse.
  //
  // La nutria se reconoce por tres cosas y ninguna es el color: hocico ancho y
  // chato, orejas chicas y redondas pegadas al cráneo, y bigotes. Sin eso es un
  // oso cualquiera.
  var MARKUP = [
    '<svg class="ot" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">',
    '  <defs>',
    '    <clipPath id="ot-crop-__UID__"><rect x="-120" y="-120" width="480" height="360"/></clipPath>',
    '  </defs>',
    '  <g class="ot-all">',
    // El torso es canónico: misma forma y mismo tamaño en todos los avatares.
    // Viene de PetBody para que no pueda desviarse copiándolo mal.
    '    <g class="ot-body" clip-path="url(#ot-crop-__UID__)">',
    '      <path class="ot-fur" d="__TORSO__"/>',
    '      <path class="ot-cream" d="__BELLY__"/>',
    '    </g>',

    // De la clavícula para arriba manda el avatar.
    '    <g class="ot-head">',
    // dos mechones al tope del cráneo, dibujados antes para que la base quede
    // tapada por la cabeza. Viven afuera de HEAD pero muy adentro de LIMITS.
    '      <path class="ot-fur" d="M104 44 C99 30 101 20 108 13 C111 24 116 34 121 42 Z"/>',
    '      <path class="ot-fur" d="M126 42 C127 28 132 20 140 16 C140 27 139 36 141 44 Z"/>',
    // el cráneo: ancho, con los cachetes más anchos que la frente
    '      <path class="ot-fur" d="M120 34 C76 34 40 56 34 100 C28 145 62 186 120 186 C178 186 212 145 206 100 C200 56 164 34 120 34 Z"/>',
    // orejas chicas y redondas, apenas asomando del contorno
    '      <g class="ot-ear">',
    '        <circle class="ot-fur" cx="46" cy="64" r="19"/>',
    '        <circle class="ot-inner" cx="46" cy="65" r="9"/>',
    '      </g>',
    '      <g class="ot-ear">',
    '        <circle class="ot-fur" cx="194" cy="64" r="19"/>',
    '        <circle class="ot-inner" cx="194" cy="65" r="9"/>',
    '      </g>',
    // la cara clara: antifaz alrededor de los ojos y hocico, en una sola tinta
    '      <ellipse class="ot-cream" cx="88" cy="104" rx="25" ry="23"/>',
    '      <ellipse class="ot-cream" cx="152" cy="104" rx="25" ry="23"/>',
    '      <path class="ot-cream" d="M120 108 C152 108 180 122 180 145 C180 168 152 182 120 182 C88 182 60 168 60 145 C60 122 88 108 120 108 Z"/>',

    '      <g class="ot-eye">',
    '        <g class="ot-pupil">',
    '          <ellipse class="ot-dark" cx="88" cy="103" rx="12.5" ry="13"/>',
    '          <ellipse class="ot-cream" cx="83.5" cy="97.5" rx="3.6" ry="4.8" transform="rotate(-24 83.5 97.5)"/>',
    '        </g>',
    '      </g>',
    '      <g class="ot-eye">',
    '        <g class="ot-pupil">',
    '          <ellipse class="ot-dark" cx="152" cy="103" rx="12.5" ry="13"/>',
    '          <ellipse class="ot-cream" cx="147.5" cy="97.5" rx="3.6" ry="4.8" transform="rotate(-24 147.5 97.5)"/>',
    '        </g>',
    '      </g>',

    // nariz ancha de nutria: un trapecio redondeado, no un triángulo de gato
    '      <path class="ot-dark" d="M101 124 C101 116 109 112 120 112 C131 112 139 116 139 124 C139 133 131 140 120 143 C109 140 101 133 101 124 Z"/>',
    '      <path class="ot-mouth" d="M120 143 L120 152"/>',
    '      <path class="ot-mouth" d="M120 152 C114 162 101 162 96 153"/>',
    '      <path class="ot-mouth" d="M120 152 C126 162 139 162 144 153"/>',

    '      <g class="ot-whiskers">',
    '        <g class="ot-whisk">',
    '          <path d="M86 146 C64 140 40 134 21 130"/>',
    '          <path d="M86 154 C62 155 40 156 19 157"/>',
    '          <path d="M86 161 C64 168 44 174 25 179"/>',
    '          <path d="M154 146 C176 140 200 134 219 130"/>',
    '          <path d="M154 154 C178 155 200 156 221 157"/>',
    '          <path d="M154 161 C176 168 196 174 215 179"/>',
    '        </g>',
    '      </g>',
    '    </g>',

    // La máquina no es del avatar: acá sólo va el hueco y las manos, que sí son
    // del personaje. Van en los anclajes de PetBody para caer sobre el teclado
    // que dibujó el device. Sólo visible mientras hay trabajo a medio hacer.
    '    <g class="ot-laptop" clip-path="url(#ot-crop-__UID__)" aria-hidden="true">',
    '      <ellipse class="ot-hand ot-hand-l" cx="__HLX__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '      <ellipse class="ot-hand ot-hand-r" cx="__HRX2__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '      <g class="ot-device"></g>',
    // la inclinación va en un <g> propio: sobre la elipse sería un transform
    // CSS y el transform-box de .ot-hand la re-basaría contra su propia caja,
    // que la manda a cualquier lado.
    '      <g transform="rotate(-24 168 148)">',
    '        <ellipse class="ot-hand ot-chin" cx="168" cy="148" rx="15" ry="11"/>',
    '      </g>',
    '    </g>',

    '    <g aria-hidden="true">',
    '      <text class="ot-zzz ot-zzz-a" x="178" y="58">z</text>',
    '      <text class="ot-zzz ot-zzz-b" x="198" y="40">z</text>',
    '      <text class="ot-note ot-note-a" x="16" y="70">&#9834;</text>',
    '      <text class="ot-note ot-note-b" x="206" y="78" style="--ot-nx: 12px">&#9835;</text>',
    '    </g>',

    '  </g>',
    '</svg>'
  ].join('\n');

  var uid = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function injectStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    var el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    doc.head.appendChild(el);
  }

  function mount(host, options) {
    if (typeof host === 'string') host = document.querySelector(host);
    if (!host) throw new Error('OtterMascot.mount: no encontre el contenedor.');
    options = options || {};

    injectStyle(host.ownerDocument || document);

    // La geometría del cuerpo no se copia: se pide.
    var B = window.PetBody;
    if (!B) throw new Error('OtterMascot: falta core/body.js');

    host.innerHTML = MARKUP
      .replace(/__UID__/g, String(++uid))
      .replace('__TORSO__', B.torso)
      .replace('__BELLY__', B.belly)
      .replace(/__HLX__/g, B.HANDS.left.x)
      .replace(/__HRX2__/g, B.HANDS.right.x)
      .replace(/__HY__/g, B.HANDS.left.y)
      .replace(/__HRX__/g, B.HANDS.rx)
      .replace(/__HRY__/g, B.HANDS.ry);

    var svg = host.querySelector('.ot');
    var head = svg.querySelector('.ot-head');
    var body = svg.querySelector('.ot-body');
    var pupils = svg.querySelectorAll('.ot-pupil');
    var deviceSlot = svg.querySelector('.ot-device');

    // La notebook la dibuja el device, entera. El avatar sólo le presta el
    // hueco y le pasa su contorno para que la línea combine con el dibujo.
    function applyDevice(dev) {
      if (!window.PetDevices) { deviceSlot.innerHTML = ''; return; }
      window.PetDevices.injectStyle(host.ownerDocument || document);
      svg.style.setProperty('--pd-edge', 'var(--ot-line)');
      window.PetDevices.applyTo(svg, dev);
      deviceSlot.innerHTML = window.PetDevices.markup(dev);
    }
    applyDevice(options.device);

    svg.setAttribute('aria-label', options.label || 'Nutria con bigotes. Sigue el cursor.');
    if (options.palette) svg.setAttribute('data-palette', options.palette);
    if (options.interactive !== false) svg.setAttribute('tabindex', '0');

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // objetivo (tx, ty) y posición suavizada (sx, sy), ambos en -1..1
    var tx = 0, ty = 0, sx = 0, sy = 0;
    var lastClientX = null, lastClientY = null;
    var lastMoveAt = -Infinity;
    var alive = true;

    function aim() {
      if (lastClientX === null) return;
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var hx = r.left + r.width * 0.5;
      var hy = r.top + r.height * 0.44;
      tx = clamp((lastClientX - hx) / (r.width * 1.4), -1, 1);
      ty = clamp((lastClientY - hy) / (r.height * 1.1), -1, 1);
    }

    function onMove(e) {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      lastMoveAt = performance.now();
      aim();
    }

    // pointer: 'manual' desactiva el listener global — la posición la inyecta
    // quien monta, con .look(), porque es la del cursor en toda la pantalla.
    var manualPointer = options.pointer === 'manual';
    if (!manualPointer) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', aim, { passive: true });
      window.addEventListener('resize', aim, { passive: true });
    }

    var state = 'idle';

    // La ventana es transparente y cada repintado le cuesta al compositor
    // mezclar con el escritorio. Dos frenos: el bucle se pisa a ~33 ms y no se
    // toca el DOM si el valor redondeado no cambió.
    var STEP_MS = 33;
    var lastFrameAt = 0;
    var lastHead = '', lastBody = '', lastPupil = '';

    function q(v) { return (Math.round(v * 2) / 2).toFixed(1); }

    var raf = 0;
    function frame(now) {
      if (!alive) return;
      var drifting = (state === 'idle' && now - lastMoveAt > 2600) || state === 'sleeping';
      if (now - lastFrameAt < (drifting ? 100 : STEP_MS)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrameAt = now;

      if (state === 'working') {
        // clavada en el teclado, con micro-movimiento para que no parezca colgada
        tx = Math.sin(now / 700) * 0.12;
        ty = 0.88;
      } else if (state === 'thinking') {
        // levanta la vista y mira al costado, con la pata en la pera
        tx = -0.55 + Math.sin(now / 1900) * 0.14;
        ty = -0.5 + Math.sin(now / 2600) * 0.08;
      } else if (state === 'sleeping') {
        // no sigue el cursor: está durmiendo, no distraída
        tx = 0.06;
        ty = 0.55;
      } else if (state === 'greeting' || state === 'farewell') {
        // saludando te mira a vos, no a la pantalla: un saludo al vacío no es
        // un saludo. Quieta, de frente — nada de barrer la mirada de un lado a
        // otro, que es justo lo que haría parecer que se tambalea.
        tx = 0;
        ty = -0.12;
      } else if (state === 'waiting') {
        // te busca a vos y se queda ahí: si derivara parecería distraída, y es
        // justo el estado en el que necesita que la mires
        ty = Math.min(ty, 0.2);
      } else if (now - lastMoveAt > 2600) {
        // sin cursor cerca: deriva lenta, mirando alrededor
        tx = Math.sin(now / 2400) * 0.45;
        ty = Math.sin(now / 3700) * 0.28 - 0.05;
      }

      sx += (tx - sx) * 0.14;
      sy += (ty - sy) * 0.14;

      // Media unidad del viewBox es menos de medio píxel en pantalla: cuantizar
      // ahí no se ve y corta de raíz los repintados de la deriva.
      var h = 'translate(' + q(sx * 8) + ' ' + q(sy * 6) + ') rotate(' + q(sx * 5) + ' 120 180)';
      var b = 'translate(' + q(sx * 3) + ' ' + q(sy * 2) + ')';
      var p = 'translate(' + q(sx * 6) + ' ' + q(sy * 5) + ')';

      if (h !== lastHead) { head.setAttribute('transform', h); lastHead = h; }
      if (b !== lastBody) { body.setAttribute('transform', b); lastBody = b; }
      if (p !== lastPupil) {
        for (var i = 0; i < pupils.length; i++) pupils[i].setAttribute('transform', p);
        lastPupil = p;
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    var blinkTimer = 0, openTimer = 0;
    function blink(times) {
      if (state === 'sleeping') return;   // ya tiene los ojos cerrados
      svg.classList.add('is-blinking');
      clearTimeout(openTimer);
      openTimer = setTimeout(function () {
        svg.classList.remove('is-blinking');
        if (times > 1) setTimeout(function () { blink(times - 1); }, 110);
      }, 130);
    }
    function scheduleBlink() {
      blinkTimer = setTimeout(function () {
        if (!document.hidden) blink(Math.random() < 0.22 ? 2 : 1);
        scheduleBlink();
      }, 2200 + Math.random() * 4200);
    }
    scheduleBlink();

    var pokeTimer = 0;
    function poke() {
      blink(2);
      if (reduced) return;
      svg.classList.remove('is-poked');
      void svg.getBoundingClientRect(); // reinicia la animación
      svg.classList.add('is-poked');
      clearTimeout(pokeTimer);
      pokeTimer = setTimeout(function () { svg.classList.remove('is-poked'); }, 980);
    }

    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); }
    }

    if (options.interactive !== false) {
      svg.addEventListener('pointerdown', poke);
      svg.addEventListener('keydown', onKey);
    }

    return {
      element: svg,
      poke: poke,
      // 'idle' | 'working' | 'thinking' | 'waiting' | 'sleeping' |
      // 'greeting' | 'farewell'. working teclea, thinking se toca la pera sin
      // cerrar la notebook, waiting suelta el teclado y te mira, sleeping
      // cierra los ojos y guarda la máquina, greeting entra subiendo y
      // farewell se hunde.
      setState: function (next) {
        state = next || 'idle';
        svg.classList.toggle('is-working', state === 'working');
        svg.classList.toggle('is-thinking', state === 'thinking');
        svg.classList.toggle('is-waiting', state === 'waiting');
        svg.classList.toggle('is-sleeping', state === 'sleeping');
        svg.classList.toggle('is-greeting', state === 'greeting');
        svg.classList.toggle('is-farewell', state === 'farewell');
      },
      getState: function () { return state; },
      // coordenadas del cursor relativas a la ventana, para pointer: 'manual'
      look: function (clientX, clientY) {
        lastClientX = clientX;
        lastClientY = clientY;
        lastMoveAt = performance.now();
        aim();
      },
      setPalette: function (name) { svg.setAttribute('data-palette', name); },
      setDevice: applyDevice,
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        clearTimeout(blinkTimer); clearTimeout(openTimer); clearTimeout(pokeTimer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', aim);
        window.removeEventListener('resize', aim);
        host.innerHTML = '';
      }
    };
  }

  function mountAll(selector, options) {
    var nodes = document.querySelectorAll(selector || '[data-otter-mascot]');
    return Array.prototype.map.call(nodes, function (n) {
      var opts = {
        palette: n.getAttribute('data-palette') || (options || {}).palette,
        label: n.getAttribute('data-label') || (options || {}).label
      };
      return mount(n, opts);
    });
  }

  return { mount: mount, mountAll: mountAll };
});
