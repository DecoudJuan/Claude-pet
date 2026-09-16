/*
 * rig.js — el armazón que comparten los avatares.
 *
 * Un avatar es dos cosas muy distintas mezcladas en el mismo archivo:
 *
 *   la PIEL       — el cráneo, la cara, los colores, las patas. Es el personaje
 *                   y no se parece en nada a la de al lado.
 *   el ARMAZÓN    — el bucle de animación, la mirada con paralaje, el parpadeo
 *                   irregular, el tecleo, el codazo, el hueco de la máquina,
 *                   entrar y salir, soltar los timers. Es idéntico en todos.
 *
 * El pingüino, la nutria y el oso llevan las dos mitades adentro, y por eso las
 * ~250 líneas del armazón están escritas tres veces. Con tres se aguantaba; con
 * once es una regla de animación que hay que acordarse de cambiar once veces, y
 * el día que se arregle en diez de once nadie lo va a notar hasta que se vea
 * raro en el que faltó.
 *
 * Así que el armazón vive acá y el avatar trae nada más que su piel:
 *
 *   window.PetRig.mount(host, opts, {
 *     ns:    'cr',                  // prefijo de clases y variables
 *     label: 'Cangrejo. Sigue el cursor.',
 *     edge:  'var(--cr-line)',      // con qué contorno se dibuja la notebook
 *     css:   [ ... ],               // paletas y partes: lo que es del personaje
 *     head:  [ ... ],               // el SVG de la cabeza y los accesorios
 *     hands: { left: '...', right: '...', chin: '...' },
 *     aim:   function (state, now, t) { }   // opcional, poses propias
 *   })
 *
 * Esto NO reemplaza al contrato de AVATARS.md: un avatar puede seguir
 * escribiéndose entero a mano — el pingüino lo hace — y el pet no sabe cuál de
 * las dos formas usaste. El armazón es una comodidad, no una obligación.
 *
 * Lo que el armazón espera de la piel son cinco clases, todas opcionales salvo
 * las dos primeras:
 *
 *   .{ns}-head     el grupo que se mueve con la mirada        (obligatoria)
 *   .{ns}-body     el torso, que se mueve menos               (obligatoria)
 *   .{ns}-pupil    lo que se mueve más que la cabeza: paralaje
 *   .{ns}-eye      lo que se achata al parpadear y al dormir
 *   .{ns}-ear      lo que se levanta esperando y cae durmiendo
 */
(function (root) {
  'use strict';

  // Las reglas que no son del personaje sino del sistema: cómo teclea, cómo
  // parpadea, cómo entra y cómo sale. Son las mismas para todos y por eso están
  // acá una sola vez, con el prefijo del avatar puesto al vuelo.
  var RIG_CSS = [
    '.__NS__ {',
    '  display: block; width: 100%; height: auto; max-width: 100%;',
    '  overflow: visible; cursor: pointer; touch-action: manipulation;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.__NS__-all { transform-box: fill-box; transform-origin: 50% 96%; }',

    // --- la máquina ---
    // Se ve mientras hay trabajo a medio hacer. `waiting` también: el turno
    // está frenado, no terminado. `sleeping` no — sin tokens no hay nada que
    // hacer — y entrando o saliendo tampoco.
    '.__NS__-laptop { opacity: 0; transition: opacity .22s ease; pointer-events: none; }',
    '.__NS__.is-working .__NS__-laptop,',
    '.__NS__.is-thinking .__NS__-laptop,',
    '.__NS__.is-waiting .__NS__-laptop { opacity: 1; }',

    // --- las manos ---
    '.__NS__-hand { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .3s ease; }',
    // esperando: las dos manos se sueltan del teclado y suben a la vista, por
    // encima del canto de la tapa. Si sólo se despegan un poco, a 152 px no se
    // distingue de working — y es el estado que no se puede confundir.
    '.__NS__.is-waiting .__NS__-hand-l { transform: translate(-7px, -20px); }',
    '.__NS__.is-waiting .__NS__-hand-r { transform: translate(7px, -20px); }',
    // pensando: una mano sube a la pera. Es la misma tarea que working, otra
    // pose — la notebook sigue abierta. La de la pera es una pieza aparte,
    // dibujada por delante de la máquina: la del teclado queda atrás de la tapa
    // y desde ahí no hay forma de que llegue a la cara.
    '.__NS__-chin { opacity: 0; transition: opacity .25s ease; }',
    '.__NS__.is-thinking .__NS__-chin { opacity: 1; }',
    '.__NS__.is-thinking .__NS__-hand-r { opacity: 0; }',
    // steps(1) en vez de interpolar: el tecleo salta entre dos posiciones y
    // repinta 8 veces por segundo en lugar de 60. Además se lee más seco.
    '@keyframes __NS__-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }',
    '.__NS__.is-working .__NS__-hand-l { animation: __NS__-tap .26s steps(1, end) infinite; }',
    '.__NS__.is-working .__NS__-hand-r { animation: __NS__-tap .26s steps(1, end) .13s infinite; }',

    // --- los ojos ---
    '.__NS__-eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .12s ease; }',
    '.__NS__.is-blinking .__NS__-eye, .__NS__.is-sleeping .__NS__-eye { transform: scaleY(.08); }',
    // Esperando conserva el tamaño normal de los ojos: la mirada al usuario y
    // las manos levantadas ya marcan el estado.
    '.__NS__-ear { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .3s ease; }',
    '.__NS__.is-waiting .__NS__-ear { transform: translateY(-4px) scale(1.1); }',
    '.__NS__.is-sleeping .__NS__-ear { transform: translateY(3px) scale(.92); }',

    // --- durmiendo ---
    // Una Z que sube. steps(3) — puede quedarse así horas y no vale repintar
    // 60 veces por segundo por un adorno.
    '.__NS__-zzz { font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;',
    '  font-size: 26px; font-weight: 600; opacity: 0; pointer-events: none;',
    '  transform-box: fill-box; transform-origin: 50% 50%; }',
    '@keyframes __NS__-zzz {',
    '  0%   { opacity: .85; transform: translate(0, 0) scale(.8); }',
    '  33%  { opacity: .7;  transform: translate(6px, -14px) scale(1); }',
    '  66%  { opacity: .35; transform: translate(12px, -28px) scale(1.15); }',
    '  100% { opacity: 0;   transform: translate(18px, -40px) scale(1.2); }',
    '}',
    '.__NS__.is-sleeping .__NS__-zzz   { animation: __NS__-zzz 4.2s steps(3, end) infinite; }',
    '.__NS__.is-sleeping .__NS__-zzz-b { animation-delay: 2.1s; }',

    // --- el codazo ---
    '@keyframes __NS__-squash {',
    '  0%   { transform: translateY(0) scale(1, 1); }',
    '  20%  { transform: translateY(9px) scale(1.08, .9); }',
    '  48%  { transform: translateY(-9px) scale(.95, 1.07); }',
    '  72%  { transform: translateY(3px) scale(1.03, .975); }',
    '  100% { transform: translateY(0) scale(1, 1); }',
    '}',
    '.__NS__.is-poked .__NS__-all { animation: __NS__-squash .62s cubic-bezier(.34, 1.36, .5, 1); }',

    // --- entrar y salir ---
    // Sube desde abajo del cuadro, como si asomara por detrás de la barra de
    // tareas, y se queda quieto arriba mientras dura el saludo. Al irse es el
    // camino inverso. Derecho, sin balanceo: se ve una vez por sesión, y un
    // personaje que se tambalea al aparecer se lee como un tropiezo.
    //
    // Se queda abajo al final (`forwards`) porque después de esto la ventana se
    // cierra: si volviera al centro, el último cuadro sería el personaje otra
    // vez entero, justo lo que se acaba de despedir.
    '@keyframes __NS__-hello {',
    '  0%   { opacity: 0; transform: translateY(150px); }',
    '  55%  { opacity: 1; }',
    '  100% { opacity: 1; transform: translateY(0); }',
    '}',
    '@keyframes __NS__-bye {',
    '  0%   { opacity: 1; transform: translateY(0); }',
    '  62%  { opacity: 1; transform: translateY(0); }',
    '  100% { opacity: 0; transform: translateY(150px); }',
    '}',
    '.__NS__.is-greeting .__NS__-all { animation: __NS__-hello .62s cubic-bezier(.22, .68, .3, 1) both; }',
    '.__NS__.is-farewell .__NS__-all { animation: __NS__-bye 2s cubic-bezier(.5, 0, .9, .35) forwards; }',

    '@media (prefers-reduced-motion: reduce) {',
    '  .__NS__.is-working .__NS__-hand-l, .__NS__.is-working .__NS__-hand-r { animation: none; }',
    '  .__NS__.is-poked .__NS__-all { animation: none; }',
    '  .__NS__.is-greeting .__NS__-all, .__NS__.is-farewell .__NS__-all { animation: none; }',
    '  .__NS__.is-sleeping .__NS__-zzz { animation: none; opacity: .6; }',
    '  .__NS__-hand, .__NS__-ear, .__NS__-eye { transition: none; }',
    '}'
  ].join('\n');

  var uid = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function injectStyle(doc, skin) {
    var id = 'pet-skin-' + skin.ns;
    if (doc.getElementById(id)) return;
    var el = doc.createElement('style');
    el.id = id;
    el.textContent = (RIG_CSS + '\n' + join(skin.css)).replace(/__NS__/g, skin.ns);
    doc.head.appendChild(el);
  }

  function join(v) { return Array.isArray(v) ? v.join('\n') : (v || ''); }

  // El andamio: torso canónico, la cabeza que trae la piel, el hueco de la
  // máquina con las manos encima y las Z de dormir. El avatar no dibuja el
  // torso ni la notebook — el primero viene de PetBody y la segunda se dibuja
  // sola (ver core/devices.js).
  function scaffold(skin, B, u) {
    var ns = skin.ns;
    var h = skin.hands || {};
    return [
      '<svg class="' + ns + '" viewBox="' + B.VIEWBOX + '" xmlns="http://www.w3.org/2000/svg" role="img">',
      '  <defs><clipPath id="' + ns + '-crop-' + u + '">',
      '    <rect x="' + B.clipRect.x + '" y="' + B.clipRect.y +
           '" width="' + B.clipRect.width + '" height="' + B.clipRect.height + '"/>',
      '  </clipPath></defs>',
      '  <g class="' + ns + '-all">',
      // El busto se corta contra el borde de abajo: el torso se dibuja más
      // abajo de lo que se ve y se recorta, para no dejar franja al moverse.
      '    <g class="' + ns + '-body" clip-path="url(#' + ns + '-crop-' + u + ')">',
      // Lo que va DETRÁS del torso: una cola, un brazo de más, un ala. Va acá y
      // no en la cabeza porque se mueve con el cuerpo — una cola pegada a la
      // cabeza se sacude cada vez que el personaje mira el cursor.
      join(skin.behind),
      '      <path class="' + ns + '-skin" d="' + B.torso + '"/>',
      '      <path class="' + ns + '-belly" d="' + B.belly + '"/>',
      // Lo que va DELANTE del torso pero detrás de la cabeza: un delantal, un
      // chaleco, una mesa. La piel puede pintar el torso de `none` y dibujar
      // acá otra cosa — el path canónico sigue estando y los anclajes de la
      // máquina y de las manos no se mueven, que es lo que la regla protege.
      join(skin.front),
      '    </g>',
      '    <g class="' + ns + '-head">',
      join(skin.head),
      '    </g>',
      '    <g class="' + ns + '-laptop" clip-path="url(#' + ns + '-crop-' + u + ')" aria-hidden="true">',
      '      <g class="' + ns + '-hand ' + ns + '-hand-l">' + (h.left || '') + '</g>',
      '      <g class="' + ns + '-hand ' + ns + '-hand-r">' + (h.right || '') + '</g>',
      '      <g class="' + ns + '-device"></g>',
      // La inclinación va en un <g> propio: sobre la forma sería un transform
      // CSS y el transform-box de la mano la re-basaría contra su propia caja.
      '      <g class="' + ns + '-chin">' + (h.chin || '') + '</g>',
      '    </g>',
      '    <g aria-hidden="true">',
      '      <text class="' + ns + '-zzz ' + ns + '-zzz-a" x="178" y="58">z</text>',
      '      <text class="' + ns + '-zzz ' + ns + '-zzz-b" x="198" y="40">z</text>',
      '    </g>',
      '  </g>',
      '</svg>'
    ].join('\n');
  }

  function mount(host, options, skin) {
    if (typeof host === 'string') host = document.querySelector(host);
    if (!host) throw new Error('PetRig.mount: no encontre el contenedor.');
    options = options || {};

    // La geometría del cuerpo no se copia: se pide.
    var B = root.PetBody;
    if (!B) throw new Error('PetRig: falta core/body.js');

    var doc = host.ownerDocument || document;
    injectStyle(doc, skin);

    var ns = skin.ns;
    host.innerHTML = scaffold(skin, B, ++uid);

    var svg = host.querySelector('.' + ns);
    var head = svg.querySelector('.' + ns + '-head');
    var body = svg.querySelector('.' + ns + '-body');
    var pupils = svg.querySelectorAll('.' + ns + '-pupil');
    var deviceSlot = svg.querySelector('.' + ns + '-device');

    // La notebook la dibuja el device, entera. El avatar sólo le presta el
    // hueco y le pasa su contorno para que la línea combine con el dibujo.
    function applyDevice(dev) {
      if (!root.PetDevices) { deviceSlot.innerHTML = ''; return; }
      root.PetDevices.injectStyle(doc);
      if (skin.edge) svg.style.setProperty('--pd-edge', skin.edge);
      root.PetDevices.applyTo(svg, dev);
      deviceSlot.innerHTML = root.PetDevices.markup(dev);
    }
    applyDevice(options.device);

    svg.setAttribute('aria-label', options.label || skin.label || '');
    if (options.palette) svg.setAttribute('data-palette', options.palette);
    if (options.interactive !== false) svg.setAttribute('tabindex', '0');

    var reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (options.pointer !== 'manual') {
      root.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('scroll', aim, { passive: true });
      root.addEventListener('resize', aim, { passive: true });
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
        // levanta la vista y mira al costado
        tx = -0.55 + Math.sin(now / 1900) * 0.14;
        ty = -0.5 + Math.sin(now / 2600) * 0.08;
      } else if (state === 'sleeping') {
        // no sigue el cursor: está durmiendo, no distraído
        tx = 0.06;
        ty = 0.55;
      } else if (state === 'greeting' || state === 'farewell') {
        // saludando te mira a vos, no a la pantalla: un saludo al vacío no es un
        // saludo. Quieto y de frente — nada de barrer la mirada de un lado a
        // otro, que es justo lo que haría parecer que se tambalea.
        tx = 0;
        ty = -0.12;
      } else if (state === 'waiting') {
        // te busca a vos y se queda ahí: si derivara parecería distraído, y es
        // justo el estado en el que necesita que lo mires
        ty = Math.min(ty, 0.2);
      } else if (now - lastMoveAt > 2600) {
        // sin cursor cerca: deriva lenta, mirando alrededor
        tx = Math.sin(now / 2400) * 0.45;
        ty = Math.sin(now / 3700) * 0.28 - 0.05;
      }

      // La piel puede corregir la pose si su personaje se mueve distinto — el
      // pulpo no tiene cuello, la taza no tiene cara. Devuelve {tx, ty}.
      if (skin.aim) {
        var t = skin.aim(state, now, { tx: tx, ty: ty });
        if (t) { tx = t.tx; ty = t.ty; }
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
    // Ritmo irregular a propósito: un parpadeo cada exactamente N segundos se
    // nota y molesta más que no parpadear.
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

    // 'idle' va en la lista aunque sea el estado por defecto: hay pieles que
    // quieren decir algo en reposo — la taza humea apenas — y sin la clase no
    // tendrían de dónde agarrarse.
    var STATES = ['idle', 'working', 'thinking', 'waiting', 'sleeping', 'greeting', 'farewell'];

    return {
      element: svg,
      poke: poke,
      setState: function (next) {
        state = next || 'idle';
        for (var i = 0; i < STATES.length; i++) {
          svg.classList.toggle('is-' + STATES[i], state === STATES[i]);
        }
        if (skin.onState) skin.onState(state, svg);
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
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('scroll', aim);
        root.removeEventListener('resize', aim);
        host.innerHTML = '';
      }
    };
  }

  // Envuelve una piel y devuelve el objeto que espera avatar.js: así el archivo
  // del avatar se ve igual que el de uno escrito a mano.
  function skin(def) {
    return {
      mount: function (host, options) { return mount(host, options, def); },
      skin: def
    };
  }

  root.PetRig = { mount: mount, skin: skin };
})(window);
