/*
 * bear-mascot — un busto de oso en SVG que sigue el cursor, parpadea,
 * teclea y se toca la pera cuando piensa. Sin dependencias.
 *
 *   <div id="mascota"></div>
 *   <script src="core/body.js"></script>
 *   <script src="avatars/bear/draw.js"></script>
 *   <script>BearMascot.mount(document.getElementById('mascota'));</script>
 *
 * El torso sale de PetBody y la notebook la dibuja PetDevices: acá sólo hay
 * cabeza, cara y manos.
 */
(function (root, factory) {
  root.BearMascot = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var STYLE_ID = 'bear-mascot-style';

  var CSS = [
    // Pardo cálido y contorno muy oscuro: el oso tiene que conservar la
    // silueta tanto sobre un escritorio claro como sobre uno oscuro.
    '.br {',
    '  --br-fur: #76513b;',
    // el contorno tiene tinta propia, más oscura que el pelo: la nariz y el
    // hocico se pierden si comparten el gris del cuerpo.
    '  --br-line: #2d1c14;',
    '  --br-cream: #e7c79b;',
    '  --br-inner: #ad7658;',
    '  --br-accent: #d99a3d;',
    '  display: block; width: 100%; height: auto; max-width: 100%;',
    '  overflow: visible; cursor: pointer; touch-action: manipulation;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.br[data-palette="miel"] {',
    '  --br-fur: #b87834; --br-line: #3b2412; --br-cream: #ffe0a3;',
    '  --br-inner: #d59a55; --br-accent: #4f8b62;',
    '}',
    '.br[data-palette="polar"] {',
    '  --br-fur: #e6edf0; --br-line: #27343c; --br-cream: #fffaf0;',
    '  --br-inner: #bdcbd1; --br-accent: #4f9db7;',
    '}',
    '.br:focus-visible { outline: 3px solid var(--br-accent); outline-offset: 8px; border-radius: 14px; }',
    // La ventana es transparente: sobre un escritorio oscuro un marrón medio se
    // apaga hasta ser una mancha. Se levanta el pelo lo justo para que la
    // silueta siga leyéndose, sin tocar el contorno.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .br { --br-fur: #9b6a4d; --br-inner: #c18a68; }',
    '  :root:not([data-theme="light"]) .br[data-palette="miel"] { --br-fur: #ce8b45; --br-inner: #e4aa67; }',
    '  :root:not([data-theme="light"]) .br[data-palette="polar"] { --br-fur: #eef4f6; --br-inner: #cbd7dc; }',
    '}',
    ':root[data-theme="dark"] .br { --br-fur: #9b6a4d; --br-inner: #c18a68; }',
    ':root[data-theme="dark"] .br[data-palette="miel"] { --br-fur: #ce8b45; --br-inner: #e4aa67; }',
    ':root[data-theme="dark"] .br[data-palette="polar"] { --br-fur: #eef4f6; --br-inner: #cbd7dc; }',
    '.br-fur    { fill: var(--br-fur); }',
    '.br-cream  { fill: var(--br-cream); }',
    '.br-inner  { fill: var(--br-inner); }',
    '.br-dark   { fill: var(--br-line); }',
    '.br-mouth  { fill: none; stroke: var(--br-line); stroke-width: 4; stroke-linecap: round; }',
    // --- estados de trabajo: la notebook y el tecleo ---
    '.br-laptop { opacity: 0; transition: opacity .22s ease; pointer-events: none; }',
    // esperando también muestra la notebook: sigue a mitad de tarea, no terminó
    '.br.is-working .br-laptop, .br.is-thinking .br-laptop, .br.is-waiting .br-laptop { opacity: 1; }',
    // La pata es un grupo: palma con contorno y tres dedos insinuados. Antes
    // era una elipse lisa y a 152 px se leía como un botón suelto.
    '.br-hand { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    '.br-paw { fill: var(--br-fur); stroke: var(--br-line); stroke-width: 3.5; }',
    '.br-toes { fill: none; stroke: var(--br-line); stroke-width: 2.1;',
    '  stroke-linecap: round; opacity: .62; pointer-events: none; }',
    // esperando: las dos manos se sueltan del teclado y suben a la vista, por
    // encima del canto de la tapa. Si sólo se despegan un poco, a 152 px no se
    // distingue de working — y es el estado que no se puede confundir.
    '.br.is-waiting .br-hand-l { transform: translate(-7px, -20px); }',
    '.br.is-waiting .br-hand-r { transform: translate(7px, -20px); }',
    // pensando: la pata sube a la pera. Es la misma tarea que working, otra
    // pose — la notebook sigue abierta. La pata de la pera es una pieza aparte,
    // dibujada por delante de la máquina: la mano del teclado queda atrás de la
    // tapa y desde ahí no hay forma de que llegue a la cara.
    '.br-chin { opacity: 0; transition: opacity .25s ease; }',
    '.br.is-thinking .br-chin { opacity: 1; }',
    '.br.is-thinking .br-hand-r { opacity: 0; }',
    // steps(1) en vez de interpolar: el tecleo salta entre dos posiciones y
    // repinta 8 veces por segundo en lugar de 60. Además se lee más seco.
    '@keyframes br-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }',
    '.br.is-working .br-hand-l { animation: br-tap .26s steps(1, end) infinite; }',
    '.br.is-working .br-hand-r { animation: br-tap .26s steps(1, end) .13s infinite; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .br.is-working .br-hand-l, .br.is-working .br-hand-r { animation: none; }',
    '  .br-hand, .br-ear, .br-eye { transition: none; }',
    '}',
    '.br-all { transform-box: fill-box; transform-origin: 50% 96%; }',
    '.br-eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .12s ease; }',
    '.br.is-blinking .br-eye, .br.is-sleeping .br-eye { transform: scaleY(.08); }',
    // Esperando conserva el tamaño normal de los ojos, como el pingüino
    // original. La mirada al usuario y las patas levantadas marcan el estado.
    '.br-ear { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .3s ease; }',
    '.br.is-waiting .br-ear { transform: translateY(-4px) scale(1.1); }',
    '.br.is-sleeping .br-ear { transform: translateY(3px) scale(.92); }',
    // Durmiendo: una Z que sube. steps(3) — puede quedarse así horas y no vale
    // repintar 60 veces por segundo por un adorno.
    '.br-zzz { fill: var(--br-line); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 26px; font-weight: 600; opacity: 0; pointer-events: none;',
    '  transform-box: fill-box; transform-origin: 50% 50%; }',
    '@keyframes br-zzz {',
    '  0%   { opacity: .85; transform: translate(0, 0) scale(.8); }',
    '  33%  { opacity: .7;  transform: translate(6px, -14px) scale(1); }',
    '  66%  { opacity: .35; transform: translate(12px, -28px) scale(1.15); }',
    '  100% { opacity: 0;   transform: translate(18px, -40px) scale(1.2); }',
    '}',
    '.br.is-sleeping .br-zzz   { animation: br-zzz 4.2s steps(3, end) infinite; }',
    '.br.is-sleeping .br-zzz-b { animation-delay: 2.1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .br.is-sleeping .br-zzz { animation: none; opacity: .6; }',
    '}',
    '@keyframes br-squash {',
    '  0%   { transform: translateY(0) scale(1, 1); }',
    '  20%  { transform: translateY(9px) scale(1.08, .9); }',
    '  48%  { transform: translateY(-9px) scale(.95, 1.07); }',
    '  72%  { transform: translateY(3px) scale(1.03, .975); }',
    '  100% { transform: translateY(0) scale(1, 1); }',
    '}',
    // --- entrar y salir ---
    // Sube desde abajo del cuadro, como si asomara por detrás de la barra de
    // tareas, y se queda quieto arriba mientras dura el saludo. Al irse es el
    // camino inverso. Derecho, sin balanceo: entra y sale una vez por sesión,
    // y un personaje que se tambalea al aparecer se lee como un tropiezo, no
    // como un saludo — el saludo lo dice el globo.
    //
    // Se queda abajo al final (`forwards`) porque después de esto la ventana
    // se cierra: si volviera al centro, el último cuadro sería el oso otra vez
    // entero, justo lo que se acaba de despedir.
    '@keyframes br-hello {',
    '  0%   { opacity: 0; transform: translateY(150px); }',
    '  55%  { opacity: 1; }',
    '  100% { opacity: 1; transform: translateY(0); }',
    '}',
    '@keyframes br-bye {',
    '  0%   { opacity: 1; transform: translateY(0); }',
    '  62%  { opacity: 1; transform: translateY(0); }',
    '  100% { opacity: 0; transform: translateY(150px); }',
    '}',
    // Las curvas son las de algo que entra frenando y sale acelerando, sin
    // rebote: `ease-out` para asomar, `ease-in` para hundirse.
    '.br.is-greeting .br-all { animation: br-hello .62s cubic-bezier(.22, .68, .3, 1) both; }',
    '.br.is-farewell .br-all { animation: br-bye 2s cubic-bezier(.5, 0, .9, .35) forwards; }',
    // Sin movimiento no se entra ni se sale volando, pero el saludo sigue
    // existiendo: lo dice el cartel del pet, y acá sólo se está quieta.
    '@media (prefers-reduced-motion: reduce) {',
    '  .br.is-greeting .br-all, .br.is-farewell .br-all { animation: none; }',
    '}',
    '.br.is-poked .br-all  { animation: br-squash .62s cubic-bezier(.34, 1.36, .5, 1); }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .br.is-poked .br-all { animation: none; }',
    '  .br-eye { transition: none; }',
    '}'
  ].join('\n');

  // El busto se corta contra el borde inferior del viewBox: el torso se dibuja
  // más abajo de lo que se ve y se recorta, para no dejar franja al moverse.
  //
  // El oso se reconoce por la cabeza maciza, las orejas redondas bien visibles
  // y el hocico claro proyectado hacia adelante. Ninguno depende del color.
  var MARKUP = [
    '<svg class="br" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">',
    '  <defs>',
    '    <clipPath id="br-crop-__UID__"><rect x="-120" y="-120" width="480" height="360"/></clipPath>',
    '  </defs>',
    '  <g class="br-all">',
    // El torso es canónico: misma forma y mismo tamaño en todos los avatares.
    // Viene de PetBody para que no pueda desviarse copiándolo mal.
    '    <g class="br-body" clip-path="url(#br-crop-__UID__)">',
    '      <path class="br-fur" d="__TORSO__"/>',
    '      <path class="br-cream" d="__BELLY__"/>',
    '    </g>',

    // De la clavícula para arriba manda el avatar.
    '    <g class="br-head">',
    // Orejas grandes detrás del cráneo: son la lectura primaria a 152 px.
    '      <g class="br-ear">',
    '        <circle class="br-fur" cx="49" cy="55" r="27"/>',
    '        <circle class="br-inner" cx="49" cy="55" r="14"/>',
    '      </g>',
    '      <g class="br-ear">',
    '        <circle class="br-fur" cx="191" cy="55" r="27"/>',
    '        <circle class="br-inner" cx="191" cy="55" r="14"/>',
    '      </g>',
    // Cráneo macizo, dentro de B.HEAD (x 28..212, y 30..186).
    '      <path class="br-fur" d="M120 30 C72 30 36 57 34 104 C32 151 66 186 120 186 C174 186 208 151 206 104 C204 57 168 30 120 30 Z"/>',
    // Hocico amplio y adelantado, sin el antifaz característico de la nutria.
    '      <ellipse class="br-cream" cx="120" cy="139" rx="50" ry="39"/>',

    '      <g class="br-eye">',
    '        <g class="br-pupil">',
    '          <ellipse class="br-dark" cx="88" cy="101" rx="11.5" ry="12.5"/>',
    '          <ellipse class="br-cream" cx="84" cy="96" rx="3.4" ry="4.4" transform="rotate(-24 84 96)"/>',
    '        </g>',
    '      </g>',
    '      <g class="br-eye">',
    '        <g class="br-pupil">',
    '          <ellipse class="br-dark" cx="152" cy="101" rx="11.5" ry="12.5"/>',
    '          <ellipse class="br-cream" cx="148" cy="96" rx="3.4" ry="4.4" transform="rotate(-24 148 96)"/>',
    '        </g>',
    '      </g>',

    // Nariz corta y triangular, con boca simple para que no se pierda al achicar.
    '      <path class="br-dark" d="M100 128 C102 117 110 113 120 113 C130 113 138 117 140 128 C136 138 129 143 120 145 C111 143 104 138 100 128 Z"/>',
    '      <path class="br-mouth" d="M120 145 L120 154"/>',
    '      <path class="br-mouth" d="M120 154 C113 164 102 164 97 156"/>',
    '      <path class="br-mouth" d="M120 154 C127 164 138 164 143 156"/>',
    '    </g>',

    // La máquina no es del avatar: acá sólo va el hueco y las manos, que sí son
    // del personaje. Van en los anclajes de PetBody para caer sobre el teclado
    // que dibujó el device. Sólo visible mientras hay trabajo a medio hacer.
    '    <g class="br-laptop" clip-path="url(#br-crop-__UID__)" aria-hidden="true">',
    '      <g class="br-hand br-hand-l">',
    '        <ellipse class="br-paw" cx="__HLX__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '        <path class="br-toes" d="M18 208 Q21 204 24 208 M26 206 Q29 202 32 206 M34 207 Q37 203 40 207"/>',
    '      </g>',
    '      <g class="br-hand br-hand-r">',
    '        <ellipse class="br-paw" cx="__HRX2__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '        <path class="br-toes" d="M200 207 Q203 203 206 207 M208 206 Q211 202 214 206 M216 208 Q219 204 222 208"/>',
    '      </g>',
    '      <g class="br-device"></g>',
    // la inclinación va en un <g> propio: sobre la elipse sería un transform
    // CSS y el transform-box de .br-hand la re-basaría contra su propia caja,
    // que la manda a cualquier lado.
    '      <g class="br-chin" transform="rotate(-24 168 148)">',
    '        <ellipse class="br-paw" cx="168" cy="148" rx="15" ry="11"/>',
    '        <path class="br-toes" d="M157 146 Q160 142 163 146 M165 144 Q168 140 171 144 M173 145 Q176 141 179 145"/>',
    '      </g>',
    '    </g>',

    '    <g aria-hidden="true">',
    '      <text class="br-zzz br-zzz-a" x="178" y="58">z</text>',
    '      <text class="br-zzz br-zzz-b" x="198" y="40">z</text>',
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
    if (!host) throw new Error('BearMascot.mount: no encontre el contenedor.');
    options = options || {};

    injectStyle(host.ownerDocument || document);

    // La geometría del cuerpo no se copia: se pide.
    var B = window.PetBody;
    if (!B) throw new Error('BearMascot: falta core/body.js');

    host.innerHTML = MARKUP
      .replace(/__UID__/g, String(++uid))
      .replace('__TORSO__', B.torso)
      .replace('__BELLY__', B.belly)
      .replace(/__HLX__/g, B.HANDS.left.x)
      .replace(/__HRX2__/g, B.HANDS.right.x)
      .replace(/__HY__/g, B.HANDS.left.y)
      .replace(/__HRX__/g, B.HANDS.rx)
      .replace(/__HRY__/g, B.HANDS.ry);

    var svg = host.querySelector('.br');
    var head = svg.querySelector('.br-head');
    var body = svg.querySelector('.br-body');
    var pupils = svg.querySelectorAll('.br-pupil');
    var deviceSlot = svg.querySelector('.br-device');

    // La notebook la dibuja el device, entera. El avatar sólo le presta el
    // hueco y le pasa su contorno para que la línea combine con el dibujo.
    function applyDevice(dev) {
      if (!window.PetDevices) { deviceSlot.innerHTML = ''; return; }
      window.PetDevices.injectStyle(host.ownerDocument || document);
      svg.style.setProperty('--pd-edge', 'var(--br-line)');
      window.PetDevices.applyTo(svg, dev);
      deviceSlot.innerHTML = window.PetDevices.markup(dev);
    }
    applyDevice(options.device);

    svg.setAttribute('aria-label', options.label || 'Oso pardo. Sigue el cursor.');
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
        // clavado en el teclado, con micro-movimiento para que no parezca colgado
        tx = Math.sin(now / 700) * 0.12;
        ty = 0.88;
      } else if (state === 'thinking') {
        // levanta la vista y mira al costado, con la pata en la pera
        tx = -0.55 + Math.sin(now / 1900) * 0.14;
        ty = -0.5 + Math.sin(now / 2600) * 0.08;
      } else if (state === 'sleeping') {
        // no sigue el cursor: está durmiendo, no distraído
        tx = 0.06;
        ty = 0.55;
      } else if (state === 'greeting' || state === 'farewell') {
        // saludando te mira a vos, no a la pantalla: un saludo al vacío no es
        // un saludo. Quieto, de frente — nada de barrer la mirada de un lado a
        // otro, que es justo lo que haría parecer que se tambalea.
        tx = 0;
        ty = -0.12;
      } else if (state === 'waiting') {
        // te busca a vos y se queda ahí: si derivara parecería distraído, y es
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
    var nodes = document.querySelectorAll(selector || '[data-bear-mascot]');
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
