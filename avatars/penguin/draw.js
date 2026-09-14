/*
 * penguin-mascot — un busto de pingüino en SVG que sigue el cursor,
 * parpadea y reacciona al toque. Sin dependencias, sin API de imágenes.
 *
 *   <div id="mascota"></div>
 *   <script src="core/body.js"></script>
 *   <script src="avatars/penguin/draw.js"></script>
 *   <script>PenguinMascot.mount(document.getElementById('mascota'));</script>
 */
(function (root, factory) {
  root.PenguinMascot = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var STYLE_ID = 'penguin-mascot-style';

  var CSS = [
    '.pm {',
    '  --pm-ink: #1e2228;',
    // el marco tiene tinta propia, más oscura que la piel: si comparte el negro
    // del cuerpo los anteojos desaparecen contra la capucha.
    '  --pm-frame: #000000;',
    '  --pm-snow: #ffffff;',
    '  --pm-beak: #f0951f;',
    '  --pm-beak-shade: #d97a10;',
    '  --pm-silver: #f1f3f5;',
    '  display: block; width: 100%; height: auto; max-width: 100%;',
    '  overflow: visible; cursor: pointer; touch-action: manipulation;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.pm[data-palette="riso"] {',
    '  --pm-ink: #2c3fae; --pm-frame: #101b5e; --pm-snow: #fdf8ee; --pm-beak: #ff5a36;',
    '  --pm-beak-shade: #e03d1c; --pm-silver: #ffe4da;',
    '}',
    '.pm[data-palette="menta"] {',
    '  --pm-ink: #1a4a3c; --pm-frame: #04201a; --pm-snow: #f6fdf9; --pm-beak: #ffb13a;',
    '  --pm-beak-shade: #e0901a; --pm-silver: #dcf0e7;',
    '}',
    '.pm:focus-visible { outline: 3px solid var(--pm-beak); outline-offset: 8px; border-radius: 14px; }',
    // Sobre fondo oscuro el negro del pingüino se funde con la página: se levanta
    // la tinta apenas, lo justo para que la silueta siga leyéndose.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .pm { --pm-ink: #3d4652; --pm-frame: #12161b; }',
    '  :root:not([data-theme="light"]) .pm[data-palette="riso"] { --pm-ink: #5f74ea; --pm-frame: #1e2b8f; }',
    '  :root:not([data-theme="light"]) .pm[data-palette="menta"] { --pm-ink: #37836d; --pm-frame: #0b3329; }',
    '}',
    ':root[data-theme="dark"] .pm { --pm-ink: #3d4652; --pm-frame: #12161b; }',
    ':root[data-theme="dark"] .pm[data-palette="riso"] { --pm-ink: #5f74ea; --pm-frame: #1e2b8f; }',
    ':root[data-theme="dark"] .pm[data-palette="menta"] { --pm-ink: #37836d; --pm-frame: #0b3329; }',
    '.pm-fill-ink   { fill: var(--pm-ink); }',
    '.pm-fill-snow  { fill: var(--pm-snow); }',
    '.pm-frame      { fill: none; stroke: var(--pm-frame); stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }',
    '.pm-beak       { fill: var(--pm-beak); stroke: var(--pm-ink); stroke-width: 3.5; stroke-linejoin: round; }',
    '.pm-beak-shade { fill: var(--pm-beak-shade); }',
    '.pm-feather    { fill: none; stroke: var(--pm-ink); stroke-width: 2.2; stroke-linecap: round; }',
    '.pm-band-out   { fill: none; stroke: var(--pm-ink); stroke-width: 23; stroke-linecap: round; }',
    '.pm-band       { fill: none; stroke: var(--pm-silver); stroke-width: 15; stroke-linecap: round; }',
    '.pm-band-line  { fill: none; stroke: var(--pm-ink); stroke-width: 1.6; opacity: .55; }',
    '.pm-cup        { fill: var(--pm-silver); stroke: var(--pm-ink); stroke-width: 5; }',
    '.pm-cup-line   { fill: none; stroke: var(--pm-ink); stroke-width: 1.6; opacity: .55; }',
    // --- estados de trabajo: la notebook y el tecleo ---
    '.pm-laptop { opacity: 0; transition: opacity .22s ease; pointer-events: none; }',
    // esperando también muestra la notebook: sigue a mitad de tarea, no terminó
    '.pm.is-working .pm-laptop, .pm.is-thinking .pm-laptop, .pm.is-waiting .pm-laptop { opacity: 1; }',
    // las aletas se despegan del teclado y quedan quietas
    '.pm.is-waiting .pm-hand { transform: translateY(-7px); }',
    // las aletas van sobre el cuerpo, del mismo color: sin contorno propio
    // desaparecen y no se ve el tecleo.
    '.pm-hand { fill: var(--pm-ink); stroke: var(--pm-frame); stroke-width: 3.5; transform-box: fill-box; transform-origin: 50% 50%; }',
    // steps(1) en vez de interpolar: el tecleo salta entre dos posiciones en
    // vez de recorrer sesenta por segundo. Repinta 8 veces por segundo en lugar
    // de 60 — y encima un tecleo seco se lee mejor que uno suave.
    '@keyframes pm-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }',
    '.pm.is-working .pm-hand-l { animation: pm-tap .26s steps(1, end) infinite; }',
    '.pm.is-working .pm-hand-r { animation: pm-tap .26s steps(1, end) .13s infinite; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pm.is-working .pm-hand-l, .pm.is-working .pm-hand-r { animation: none; }',
    '}',
    '.pm-all { transform-box: fill-box; transform-origin: 50% 96%; }',
    '.pm-eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .09s ease; }',
    '.pm.is-blinking .pm-eye, .pm.is-sleeping .pm-eye { transform: scaleY(.09); }',
    // Durmiendo: una Z que sube. steps(3) en vez de interpolar — el avatar puede
    // quedarse así horas y no vale repintar 60 veces por segundo por un adorno.
    '.pm-zzz { fill: var(--pm-ink); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 26px; font-weight: 600; opacity: 0; pointer-events: none;',
    '  transform-box: fill-box; transform-origin: 50% 50%; }',
    '@keyframes pm-zzz {',
    '  0%   { opacity: .85; transform: translate(0, 0) scale(.8); }',
    '  33%  { opacity: .7;  transform: translate(6px, -14px) scale(1); }',
    '  66%  { opacity: .35; transform: translate(12px, -28px) scale(1.15); }',
    '  100% { opacity: 0;   transform: translate(18px, -40px) scale(1.2); }',
    '}',
    '.pm.is-sleeping .pm-zzz   { animation: pm-zzz 4.2s steps(3, end) infinite; }',
    '.pm.is-sleeping .pm-zzz-b { animation-delay: 2.1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pm.is-sleeping .pm-zzz { animation: none; opacity: .6; }',
    '}',
    '.pm-note {',
    '  fill: var(--pm-beak); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 30px; font-weight: 600; opacity: 0;',
    '  transform-box: fill-box; transform-origin: 50% 50%;',
    '  pointer-events: none;',   // invisible pero seguiría atajando el mouse
    '}',
    '@keyframes pm-squash {',
    '  0%   { transform: translateY(0) scale(1, 1); }',
    '  20%  { transform: translateY(9px) scale(1.08, .9); }',
    '  48%  { transform: translateY(-9px) scale(.95, 1.07); }',
    '  72%  { transform: translateY(3px) scale(1.03, .975); }',
    '  100% { transform: translateY(0) scale(1, 1); }',
    '}',
    '@keyframes pm-float {',
    '  0%   { opacity: 0; transform: translate(0, 0) scale(.55) rotate(-8deg); }',
    '  18%  { opacity: 1; }',
    '  100% { opacity: 0; transform: translate(var(--pm-nx, -10px), -52px) scale(1.1) rotate(-14deg); }',
    '}',
    '.pm.is-poked .pm-all  { animation: pm-squash .62s cubic-bezier(.34, 1.36, .5, 1); }',
    '.pm.is-poked .pm-note { animation: pm-float .95s ease-out; }',
    '.pm.is-poked .pm-note-b { animation-delay: .1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pm.is-poked .pm-all, .pm.is-poked .pm-note { animation: none; }',
    '  .pm-eye { transition: none; }',
    '}'
  ].join('\n');

  // El busto se corta contra el borde inferior del viewBox, así que el torso se
  // dibuja más abajo de lo que se ve y se recorta — si no, al moverse deja una
  // franja transparente en el pie.
  //
  // Los anteojos son UNA sola forma negra con dos agujeros (fill-rule evenodd),
  // no dos rectángulos con borde: es lo que les da el marco grueso del dibujo.
  var MARKUP = [
    '<svg class="pm" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">',
    '  <defs>',
    '    <clipPath id="pm-crop-__UID__"><rect x="-120" y="-120" width="480" height="360"/></clipPath>',
    '  </defs>',
    '  <g class="pm-all">',
    // El torso es canónico: misma forma y mismo tamaño en todos los avatares.
    // Viene de PetBody para que no pueda desviarse copiándolo mal.
    '    <g class="pm-body" clip-path="url(#pm-crop-__UID__)">',
    '      <path class="pm-fill-ink" d="__TORSO__"/>',
    '      <path class="pm-fill-snow" d="__BELLY__"/>',
    '      <path class="pm-feather" d="M140 212 C143.8 216 143.8 221 140.9 225"/>',
    '      <path class="pm-feather" d="M148.5 224 C152.3 228 152.3 233 149.4 237"/>',
    '    </g>',

    // De la clavícula para arriba manda el avatar. El 5% de angostura es del
    // pingüino, no del sistema, así que envuelve sólo su cabeza.
    '    <g class="pm-head" transform="translate(120 0) scale(0.95 1) translate(-120 0)">',
    // capucha negra — apenas asimétrica, como trazo a mano
    '      <path class="pm-fill-ink" d="M120 30 C66 30 28 64 28 116 C28 158 62 186 120 186 C178 186 212 158 212 116 C212 64 174 30 120 30 Z"/>',
    // cara blanca: casi toda la cabeza, subiendo en dos jorobas — una por ojo
    '      <path class="pm-fill-snow" d="M31 124 C31 86 50 70 76 70 C100 70 112 88 114 108 C116 115 124 115 126 108 C128 88 140 70 164 70 C190 70 209 86 209 124 C209 162 172 184 120 184 C68 184 31 162 31 124 Z"/>',


    '      <g class="pm-eye">',
    '        <ellipse class="pm-fill-snow" cx="76" cy="107" rx="18" ry="17"/>',
    '        <g class="pm-pupil">',
    '          <ellipse class="pm-fill-ink" cx="76" cy="107" rx="11" ry="13"/>',
    '          <ellipse class="pm-fill-snow" cx="71.2" cy="101" rx="3.6" ry="5" transform="rotate(-24 71.2 101)"/>',
    '        </g>',
    '      </g>',
    '      <g class="pm-eye">',
    '        <ellipse class="pm-fill-snow" cx="164" cy="107" rx="18" ry="17"/>',
    '        <g class="pm-pupil">',
    '          <ellipse class="pm-fill-ink" cx="164" cy="107" rx="11" ry="13"/>',
    '          <ellipse class="pm-fill-snow" cx="159.2" cy="101" rx="3.6" ry="5" transform="rotate(-24 159.2 101)"/>',
    '        </g>',
    '      </g>',

    '      <path class="pm-beak" d="M99 120 C101 111 110 107 120 107 C130 107 139 111 141 120 C141 132 132 150 120 157 C108 150 99 132 99 120 Z"/>',
    '      <path class="pm-beak-shade" d="M120 109 C129 109 137 113 139 120 C139 131 131 148 120 155 Z"/>',

    // las patillas van antes que la vincha y las copas: tienen que desaparecer
    // detrás del auricular, al revés que los lentes
    '      <g class="pm-frame">',
    '        <path d="M28 84 L13 95"/>',
    '        <path d="M212 84 L227 95"/>',
    '      </g>',

    '      <path class="pm-band-out" d="M30 106 C30 -10 210 -10 210 106"/>',
    '      <path class="pm-band" d="M30 106 C30 -10 210 -10 210 106"/>',
    '      <path class="pm-band-line" d="M38 106 C38 4 202 4 202 106"/>',

    '      <rect class="pm-cup" x="13" y="84" width="37" height="68" rx="18"/>',
    '      <rect class="pm-cup-line" x="21" y="93" width="21" height="50" rx="10"/>',
    '      <rect class="pm-cup" x="190" y="84" width="37" height="68" rx="18"/>',
    '      <rect class="pm-cup-line" x="198" y="93" width="21" height="50" rx="10"/>',

    // Los lentes van últimos, por delante de las copas. Trapecio de base plana,
    // no un óvalo: es lo que les da la forma de pasta cuadrada.
    '      <g class="pm-frame">',
    '        <path d="M26 88 C26 78 32 74 48 74 L100 74 C110 74 114 80 114 91 C114 106 112 120 108 127 C104 134 92 137 72 137 C50 137 36 134 31 126 C27 119 26 97 26 88 Z"/>',
    '        <path d="M214 88 C214 78 208 74 192 74 L140 74 C130 74 126 80 126 91 C126 106 128 120 132 127 C136 134 148 137 168 137 C190 137 204 134 209 126 C213 119 214 97 214 88 Z"/>',
    '        <path d="M114 85 C117 81 123 81 126 85"/>',
    '      </g>',
    '    </g>',

    // La notebook mira al pingüino, así que de este lado se ve el DORSO de la
    // tapa: más ancha arriba (se abre hacia atrás) y el teclado tapado atrás,
    // no adelante. Abajo asoma apenas el canto de la base, y las aletas entran
    // por los costados. Sólo visible en working / thinking.
    // Las manos son del avatar; la máquina no. El avatar sólo deja el hueco y
    // las pone en los anclajes de PetBody para que caigan sobre el teclado.
    '    <g class="pm-laptop" clip-path="url(#pm-crop-__UID__)" aria-hidden="true">',
    '      <ellipse class="pm-hand pm-hand-l" cx="__HLX__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '      <ellipse class="pm-hand pm-hand-r" cx="__HRX2__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '      <g class="pm-device"></g>',
    '    </g>',

    '    <g aria-hidden="true">',
    '      <text class="pm-note pm-note-a" x="16" y="70">&#9834;</text>',
    '      <text class="pm-note pm-note-b" x="206" y="78" style="--pm-nx: 12px">&#9835;</text>',
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
    if (!host) throw new Error('PenguinMascot.mount: no encontre el contenedor.');
    options = options || {};

    injectStyle(host.ownerDocument || document);

    // La geometría del cuerpo no se copia: se pide. Así ningún avatar puede
    // desviarse del torso canónico por transcribirlo mal.
    var B = window.PetBody;
    if (!B) throw new Error('PenguinMascot: falta pet-body.js');

    host.innerHTML = MARKUP
      .replace(/__UID__/g, String(++uid))
      .replace('__TORSO__', B.torso)
      .replace('__BELLY__', B.belly)
      .replace(/__HLX__/g, B.HANDS.left.x)
      .replace(/__HRX2__/g, B.HANDS.right.x)
      .replace(/__HY__/g, B.HANDS.left.y)
      .replace(/__HRX__/g, B.HANDS.rx)
      .replace(/__HRY__/g, B.HANDS.ry);

    var svg = host.querySelector('.pm');
    var head = svg.querySelector('.pm-head');
    var body = svg.querySelector('.pm-body');
    var pupils = svg.querySelectorAll('.pm-pupil');
    var deviceSlot = svg.querySelector('.pm-device');

    // La notebook la dibuja el device, entera. El avatar sólo le presta el
    // hueco y le pasa el borde para que la línea combine con el dibujo.
    function applyDevice(dev) {
      if (!window.PetDevices) { deviceSlot.innerHTML = ''; return; }
      window.PetDevices.injectStyle(host.ownerDocument || document);
      svg.style.setProperty('--pd-edge', 'var(--pm-frame)');
      window.PetDevices.applyTo(svg, dev);
      deviceSlot.innerHTML = window.PetDevices.markup(dev);
    }
    applyDevice(options.device);

    svg.setAttribute('aria-label', options.label || 'Pingüino con anteojos y auriculares. Sigue el cursor.');
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

    // pointer: 'manual' desactiva el listener global — la posición del cursor
    // la inyecta quien monta, con .look(). Lo usa el pet de escritorio, que
    // recibe el cursor de toda la pantalla desde el proceso principal.
    var manualPointer = options.pointer === 'manual';
    if (!manualPointer) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', aim, { passive: true });
      window.addEventListener('resize', aim, { passive: true });
    }

    var state = 'idle';

    // La ventana es transparente, así que cada repintado le cuesta al
    // compositor mezclar con el escritorio. Dos frenos: pisamos el bucle a
    // ~33 ms y, sobre todo, no tocamos el DOM si el valor redondeado no cambió
    // — con la deriva lenta del estado en reposo, eso es la enorme mayoría de
    // los cuadros.
    var STEP_MS = 33;
    var lastFrameAt = 0;
    var lastHead = '', lastBody = '', lastPupil = '';

    function q(v) { return (Math.round(v * 2) / 2).toFixed(1); }

    var raf = 0;
    function frame(now) {
      if (!alive) return;
      // A la deriva nada se mueve rápido: 10 cuadros por segundo alcanzan y de
      // paso el bucle deja de existir para el procesador el resto del tiempo.
      var drifting = (state === 'idle' && now - lastMoveAt > 2600) || state === 'sleeping';
      if (now - lastFrameAt < (drifting ? 100 : STEP_MS)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrameAt = now;

      if (state === 'working') {
        // clavado en el teclado, con micro-movimiento para que no parezca congelado
        tx = Math.sin(now / 700) * 0.12;
        ty = 0.88;
      } else if (state === 'thinking') {
        // mirando arriba a un costado, como buscando la idea
        tx = 0.55 + Math.sin(now / 1900) * 0.14;
        ty = -0.5 + Math.sin(now / 2600) * 0.08;
      } else if (state === 'sleeping') {
        // no sigue el cursor: está durmiendo, no distraído
        tx = 0.06;
        ty = 0.55;
      } else if (state === 'waiting') {
        // te busca a vos y se queda ahí: si derivara parecería distraído, y es
        // justo el estado en el que necesita que lo mires
        ty = Math.min(ty, 0.25);
      } else if (now - lastMoveAt > 2600) {
        // sin cursor cerca: deriva lenta, mirando alrededor
        tx = Math.sin(now / 2400) * 0.45;
        ty = Math.sin(now / 3700) * 0.28 - 0.05;
      }

      sx += (tx - sx) * 0.14;
      sy += (ty - sy) * 0.14;

      // Media unidad del viewBox es menos de medio píxel en pantalla, así que
      // cuantizar ahí no se ve — y corta de raíz los repintados de la deriva,
      // que si no cambiaría de valor en cada cuadro para siempre.
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
      // 'idle' | 'working' | 'thinking' | 'waiting' | 'sleeping'. working
      // teclea, thinking mira al techo, waiting suelta el teclado y te busca a
      // vos, sleeping cierra los ojos y deja de seguir el cursor.
      setState: function (next) {
        state = next || 'idle';
        svg.classList.toggle('is-working', state === 'working');
        svg.classList.toggle('is-thinking', state === 'thinking');
        svg.classList.toggle('is-waiting', state === 'waiting');
        svg.classList.toggle('is-sleeping', state === 'sleeping');
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
    var nodes = document.querySelectorAll(selector || '[data-penguin-mascot]');
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
