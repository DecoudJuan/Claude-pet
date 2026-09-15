/*
 * panda-mascot — un busto de panda en SVG que sigue el cursor, parpadea,
 * teclea y se toca la pera cuando piensa. Sin dependencias.
 *
 *   <div id="mascota"></div>
 *   <script src="core/body.js"></script>
 *   <script src="avatars/panda/draw.js"></script>
 *   <script>PandaMascot.mount(document.getElementById('mascota'));</script>
 *
 * El torso sale de PetBody y la notebook la dibuja PetDevices: acá sólo hay
 * cabeza, cara y manos.
 */
(function (root, factory) {
  root.PandaMascot = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var STYLE_ID = 'panda-mascot-style';

  var CSS = [
    // Blanco cálido y manchas oscuras con tinta propia. Separar --pa-black de
    // --pa-line permite levantar las manchas en fondos oscuros sin lavar el
    // contorno de la cara.
    '.pa {',
    '  --pa-fur: #f1eee5;',
    '  --pa-black: #292827;',
    '  --pa-line: #171615;',
    '  --pa-cream: #fffaf0;',
    '  --pa-inner: #4a4947;',
    '  --pa-accent: #6f9b58;',
    '  display: block; width: 100%; height: auto; max-width: 100%;',
    '  overflow: visible; cursor: pointer; touch-action: manipulation;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.pa:focus-visible { outline: 3px solid var(--pa-accent); outline-offset: 8px; border-radius: 14px; }',
    // Las manchas negras necesitan levantarse sobre un escritorio oscuro.
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) .pa { --pa-black: #4b4a48; --pa-inner: #696765; }',
    '}',
    ':root[data-theme="dark"] .pa { --pa-black: #4b4a48; --pa-inner: #696765; }',
    '.pa-fur    { fill: var(--pa-fur); }',
    '.pa-cream  { fill: var(--pa-cream); }',
    '.pa-inner  { fill: var(--pa-inner); }',
    '.pa-dark   { fill: var(--pa-line); }',
    '.pa-mark   { fill: var(--pa-black); stroke: var(--pa-line); stroke-width: 2; }',
    '.pa-mouth  { fill: none; stroke: var(--pa-line); stroke-width: 4; stroke-linecap: round; }',
    '.pa-airpods, .pa-glasses { display: none; pointer-events: none; }',
    '.pa[data-accessory="airpods"] .pa-airpods, .pa[data-accessory="both"] .pa-airpods { display: inline; }',
    '.pa[data-accessory="glasses"] .pa-glasses, .pa[data-accessory="both"] .pa-glasses { display: inline; }',
    '.pa-airpod { fill: #fff; stroke: var(--pa-line); stroke-width: 3; stroke-linejoin: round; }',
    '.pa-glasses-back { fill: none; stroke: var(--pa-cream); stroke-width: 7;',
    '  stroke-linecap: round; stroke-linejoin: round; opacity: .95; }',
    '.pa-glasses-line { fill: none; stroke: var(--pa-line); stroke-width: 4;',
    '  stroke-linecap: round; stroke-linejoin: round; }',
    // --- estados de trabajo: la notebook y el tecleo ---
    '.pa-laptop { opacity: 0; transition: opacity .22s ease; pointer-events: none; }',
    // esperando también muestra la notebook: sigue a mitad de tarea, no terminó
    '.pa.is-working .pa-laptop, .pa.is-thinking .pa-laptop, .pa.is-waiting .pa-laptop { opacity: 1; }',
    // La pata es un grupo: palma con contorno y tres dedos insinuados. Antes
    // era una elipse lisa y a 152 px se leía como un botón suelto.
    '.pa-hand { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    '.pa-paw { fill: var(--pa-black); stroke: var(--pa-line); stroke-width: 3.5; }',
    '.pa-toes { fill: none; stroke: var(--pa-fur); stroke-width: 2.1;',
    '  stroke-linecap: round; opacity: .62; pointer-events: none; }',
    // esperando: las dos manos se sueltan del teclado y suben a la vista, por
    // encima del canto de la tapa. Si sólo se despegan un poco, a 152 px no se
    // distingue de working — y es el estado que no se puede confundir.
    '.pa.is-waiting .pa-hand-l { transform: translate(-7px, -20px); }',
    '.pa.is-waiting .pa-hand-r { transform: translate(7px, -20px); }',
    // pensando: la pata sube a la pera. Es la misma tarea que working, otra
    // pose — la notebook sigue abierta. La pata de la pera es una pieza aparte,
    // dibujada por delante de la máquina: la mano del teclado queda atrás de la
    // tapa y desde ahí no hay forma de que llegue a la cara.
    '.pa-chin { opacity: 0; transition: opacity .25s ease; }',
    '.pa.is-thinking .pa-chin { opacity: 1; }',
    '.pa.is-thinking .pa-hand-r { opacity: 0; }',
    // steps(1) en vez de interpolar: el tecleo salta entre dos posiciones y
    // repinta 8 veces por segundo en lugar de 60. Además se lee más seco.
    '@keyframes pa-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }',
    '.pa.is-working .pa-hand-l { animation: pa-tap .26s steps(1, end) infinite; }',
    '.pa.is-working .pa-hand-r { animation: pa-tap .26s steps(1, end) .13s infinite; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pa.is-working .pa-hand-l, .pa.is-working .pa-hand-r { animation: none; }',
    '  .pa-hand, .pa-ear, .pa-eye { transition: none; }',
    '}',
    '.pa-all { transform-box: fill-box; transform-origin: 50% 96%; }',
    '.pa-eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .12s ease; }',
    '.pa.is-blinking .pa-eye, .pa.is-sleeping .pa-eye { transform: scaleY(.08); }',
    // Esperando conserva el tamaño normal de los ojos, como el pingüino
    // original. La mirada al usuario y las patas levantadas marcan el estado.
    '.pa-ear { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .3s ease; }',
    '.pa.is-waiting .pa-ear { transform: translateY(-4px) scale(1.1); }',
    '.pa.is-sleeping .pa-ear { transform: translateY(3px) scale(.92); }',
    // Durmiendo: una Z que sube. steps(3) — puede quedarse así horas y no vale
    // repintar 60 veces por segundo por un adorno.
    '.pa-zzz { fill: var(--pa-line); font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 26px; font-weight: 600; opacity: 0; pointer-events: none;',
    '  transform-box: fill-box; transform-origin: 50% 50%; }',
    '@keyframes pa-zzz {',
    '  0%   { opacity: .85; transform: translate(0, 0) scale(.8); }',
    '  33%  { opacity: .7;  transform: translate(6px, -14px) scale(1); }',
    '  66%  { opacity: .35; transform: translate(12px, -28px) scale(1.15); }',
    '  100% { opacity: 0;   transform: translate(18px, -40px) scale(1.2); }',
    '}',
    '.pa.is-sleeping .pa-zzz   { animation: pa-zzz 4.2s steps(3, end) infinite; }',
    '.pa.is-sleeping .pa-zzz-b { animation-delay: 2.1s; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pa.is-sleeping .pa-zzz { animation: none; opacity: .6; }',
    '}',
    '@keyframes pa-squash {',
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
    // se cierra: si volviera al centro, el último cuadro sería el panda otra vez
    // entero, justo lo que se acaba de despedir.
    '@keyframes pa-hello {',
    '  0%   { opacity: 0; transform: translateY(150px); }',
    '  55%  { opacity: 1; }',
    '  100% { opacity: 1; transform: translateY(0); }',
    '}',
    '@keyframes pa-bye {',
    '  0%   { opacity: 1; transform: translateY(0); }',
    '  62%  { opacity: 1; transform: translateY(0); }',
    '  100% { opacity: 0; transform: translateY(150px); }',
    '}',
    // Las curvas son las de algo que entra frenando y sale acelerando, sin
    // rebote: `ease-out` para asomar, `ease-in` para hundirse.
    '.pa.is-greeting .pa-all { animation: pa-hello .62s cubic-bezier(.22, .68, .3, 1) both; }',
    '.pa.is-farewell .pa-all { animation: pa-bye 2s cubic-bezier(.5, 0, .9, .35) forwards; }',
    // Sin movimiento no se entra ni se sale volando, pero el saludo sigue
    // existiendo: lo dice el cartel del pet, y acá sólo se está quieta.
    '@media (prefers-reduced-motion: reduce) {',
    '  .pa.is-greeting .pa-all, .pa.is-farewell .pa-all { animation: none; }',
    '}',
    '.pa.is-poked .pa-all  { animation: pa-squash .62s cubic-bezier(.34, 1.36, .5, 1); }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pa.is-poked .pa-all { animation: none; }',
    '  .pa-eye { transition: none; }',
    '}'
  ].join('\n');

  // El busto se corta contra el borde inferior del viewBox: el torso se dibuja
  // más abajo de lo que se ve y se recorta, para no dejar franja al moverse.
  //
  // El panda se reconoce por las orejas, las manchas inclinadas de los ojos y
  // los hombros negros. La lectura no depende de una paleta particular.
  var MARKUP = [
    '<svg class="pa" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">',
    '  <defs>',
    '    <clipPath id="pa-crop-__UID__"><rect x="-120" y="-120" width="480" height="360"/></clipPath>',
    '  </defs>',
    '  <g class="pa-all">',
    // El torso es canónico: misma forma y mismo tamaño en todos los avatares.
    // Viene de PetBody para que no pueda desviarse copiándolo mal.
    '    <g class="pa-body" clip-path="url(#pa-crop-__UID__)">',
    '      <path class="pa-fur" d="__TORSO__"/>',
    '      <path class="pa-cream" d="__BELLY__"/>',
    // Hombros oscuros sobre la silueta canónica, sin cambiar su geometría.
    '      <path class="pa-mark" d="M0 262 C-2 207 27 174 78 165 C62 188 52 218 50 262 Z"/>',
    '      <path class="pa-mark" d="M240 262 C242 207 213 174 162 165 C178 188 188 218 190 262 Z"/>',
    '    </g>',

    // De la clavícula para arriba manda el avatar.
    '    <g class="pa-head">',
    // Orejas grandes detrás del cráneo: son la lectura primaria a 152 px.
    '      <g class="pa-ear">',
    '        <circle class="pa-mark" cx="49" cy="55" r="27"/>',
    '        <circle class="pa-inner" cx="49" cy="55" r="14"/>',
    '      </g>',
    '      <g class="pa-ear">',
    '        <circle class="pa-mark" cx="191" cy="55" r="27"/>',
    '        <circle class="pa-inner" cx="191" cy="55" r="14"/>',
    '      </g>',
    // Cráneo macizo, dentro de B.HEAD (x 28..212, y 30..186).
    '      <path class="pa-fur" d="M120 30 C72 30 36 57 34 104 C32 151 66 186 120 186 C174 186 208 151 206 104 C204 57 168 30 120 30 Z"/>',
    // Manchas diagonales: el rasgo que más separa al panda del oso pardo.
    '      <ellipse class="pa-mark" cx="87" cy="101" rx="20" ry="29" transform="rotate(27 87 101)"/>',
    '      <ellipse class="pa-mark" cx="153" cy="101" rx="20" ry="29" transform="rotate(-27 153 101)"/>',
    '      <ellipse class="pa-cream" cx="120" cy="141" rx="44" ry="34"/>',

    '      <g class="pa-eye">',
    '        <g class="pa-pupil">',
    '          <ellipse class="pa-cream" cx="88" cy="101" rx="10.5" ry="12"/>',
    '          <ellipse class="pa-dark" cx="89" cy="102" rx="6.2" ry="7.8"/>',
    '          <ellipse class="pa-cream" cx="86.5" cy="98.5" rx="2.2" ry="3"/>',
    '        </g>',
    '      </g>',
    '      <g class="pa-eye">',
    '        <g class="pa-pupil">',
    '          <ellipse class="pa-cream" cx="152" cy="101" rx="10.5" ry="12"/>',
    '          <ellipse class="pa-dark" cx="151" cy="102" rx="6.2" ry="7.8"/>',
    '          <ellipse class="pa-cream" cx="148.5" cy="98.5" rx="2.2" ry="3"/>',
    '        </g>',
    '      </g>',

    // Nariz corta y triangular, con boca simple para que no se pierda al achicar.
    '      <path class="pa-dark" d="M102 132 C104 122 111 118 120 118 C129 118 136 122 138 132 C134 140 128 144 120 146 C112 144 106 140 102 132 Z"/>',
    '      <path class="pa-mouth" d="M120 146 L120 155"/>',
    '      <path class="pa-mouth" d="M120 155 C113 164 103 164 98 157"/>',
    '      <path class="pa-mouth" d="M120 155 C127 164 137 164 142 157"/>',
    '      <g class="pa-airpods" transform="translate(0 -24)" aria-hidden="true">',
    '        <path class="pa-airpod" d="M56 84 C62 85 64 90 62 95 C60 100 56 102 51 99 L51 108 C51 113 44 113 44 108 L44 94 C44 87 49 83 56 84 Z"/>',
    '        <path class="pa-airpod" d="M184 84 C178 85 176 90 178 95 C180 100 184 102 189 99 L189 108 C189 113 196 113 196 108 L196 94 C196 87 191 83 184 84 Z"/>',
    '      </g>',
    '      <g class="pa-glasses" aria-hidden="true">',
    '        <path class="pa-glasses-back" d="M56 96 C56 82 65 77 84 77 C103 77 110 84 110 99 C110 115 102 122 85 122 C67 122 56 114 56 96 Z M184 96 C184 82 175 77 156 77 C137 77 130 84 130 99 C130 115 138 122 155 122 C173 122 184 114 184 96 Z M110 91 C116 87 124 87 130 91"/>',
    '        <path class="pa-glasses-line" d="M56 96 C56 82 65 77 84 77 C103 77 110 84 110 99 C110 115 102 122 85 122 C67 122 56 114 56 96 Z M184 96 C184 82 175 77 156 77 C137 77 130 84 130 99 C130 115 138 122 155 122 C173 122 184 114 184 96 Z M110 91 C116 87 124 87 130 91"/>',
    '      </g>',
    '    </g>',

    // La máquina no es del avatar: acá sólo va el hueco y las manos, que sí son
    // del personaje. Van en los anclajes de PetBody para caer sobre el teclado
    // que dibujó el device. Sólo visible mientras hay trabajo a medio hacer.
    '    <g class="pa-laptop" clip-path="url(#pa-crop-__UID__)" aria-hidden="true">',
    '      <g class="pa-hand pa-hand-l">',
    '        <ellipse class="pa-paw" cx="__HLX__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '        <path class="pa-toes" d="M18 208 Q21 204 24 208 M26 206 Q29 202 32 206 M34 207 Q37 203 40 207"/>',
    '      </g>',
    '      <g class="pa-hand pa-hand-r">',
    '        <ellipse class="pa-paw" cx="__HRX2__" cy="__HY__" rx="__HRX__" ry="__HRY__"/>',
    '        <path class="pa-toes" d="M200 207 Q203 203 206 207 M208 206 Q211 202 214 206 M216 208 Q219 204 222 208"/>',
    '      </g>',
    '      <g class="pa-device"></g>',
    // la inclinación va en un <g> propio: sobre la elipse sería un transform
    // CSS y el transform-box de .pa-hand la re-basaría contra su propia caja,
    // que la manda a cualquier lado.
    '      <g class="pa-chin" transform="rotate(-24 168 148)">',
    '        <ellipse class="pa-paw" cx="168" cy="148" rx="15" ry="11"/>',
    '        <path class="pa-toes" d="M157 146 Q160 142 163 146 M165 144 Q168 140 171 144 M173 145 Q176 141 179 145"/>',
    '      </g>',
    '    </g>',

    '    <g aria-hidden="true">',
    '      <text class="pa-zzz pa-zzz-a" x="178" y="58">z</text>',
    '      <text class="pa-zzz pa-zzz-b" x="198" y="40">z</text>',
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
    if (!host) throw new Error('PandaMascot.mount: no encontre el contenedor.');
    options = options || {};

    injectStyle(host.ownerDocument || document);

    // La geometría del cuerpo no se copia: se pide.
    var B = window.PetBody;
    if (!B) throw new Error('PandaMascot: falta core/body.js');

    host.innerHTML = MARKUP
      .replace(/__UID__/g, String(++uid))
      .replace('__TORSO__', B.torso)
      .replace('__BELLY__', B.belly)
      .replace(/__HLX__/g, B.HANDS.left.x)
      .replace(/__HRX2__/g, B.HANDS.right.x)
      .replace(/__HY__/g, B.HANDS.left.y)
      .replace(/__HRX__/g, B.HANDS.rx)
      .replace(/__HRY__/g, B.HANDS.ry);

    var svg = host.querySelector('.pa');
    var head = svg.querySelector('.pa-head');
    var body = svg.querySelector('.pa-body');
    var pupils = svg.querySelectorAll('.pa-pupil');
    var deviceSlot = svg.querySelector('.pa-device');

    // La notebook la dibuja el device, entera. El avatar sólo le presta el
    // hueco y le pasa su contorno para que la línea combine con el dibujo.
    function applyDevice(dev) {
      if (!window.PetDevices) { deviceSlot.innerHTML = ''; return; }
      window.PetDevices.injectStyle(host.ownerDocument || document);
      svg.style.setProperty('--pd-edge', 'var(--pa-line)');
      window.PetDevices.applyTo(svg, dev);
      deviceSlot.innerHTML = window.PetDevices.markup(dev);
    }
    applyDevice(options.device);

    svg.setAttribute('aria-label', options.label || 'Panda. Sigue el cursor.');
    svg.setAttribute('data-accessory', options.accessory || 'none');
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
      setAccessory: function (name) { svg.setAttribute('data-accessory', name || 'none'); },
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
    var nodes = document.querySelectorAll(selector || '[data-panda-mascot]');
    return Array.prototype.map.call(nodes, function (n) {
      var opts = {
        accessory: n.getAttribute('data-accessory') || (options || {}).accessory,
        label: n.getAttribute('data-label') || (options || {}).label
      };
      return mount(n, opts);
    });
  }

  return { mount: mount, mountAll: mountAll };
});
