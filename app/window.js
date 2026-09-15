/*
 * pet.js — la ventana.
 *
 * Monta el avatar elegido, traduce el estado que manda el proceso principal a
 * poses y globos, y maneja el arrastre, el hover y el panel de ajustes.
 *
 * Vive afuera del HTML a propósito: la Content-Security-Policy de la ventana
 * es script-src 'self', sin 'unsafe-inline'. Un script inline no correría.
 */
(function () {
  'use strict';

  var stage   = document.getElementById('stage');
  var host    = document.getElementById('mascot');
  var bubble  = document.getElementById('bubble');
  var greetEl = document.getElementById('greet');
  var panel   = document.getElementById('panel');
  var btnMenu = document.getElementById('btn-menu');
  var chromeEl = document.getElementById('chrome');
  var selAv   = document.getElementById('sel-avatar');
  var selPal  = document.getElementById('sel-palette');
  var selDev  = document.getElementById('sel-device');
  var fldPal  = document.getElementById('fld-palette');
  var bTitle  = bubble.querySelector('.title');
  var bMeta   = bubble.querySelector('.meta');

  var SIZES = [
    { id: 's', name: 'Chico' },
    { id: 'm', name: 'Medio' },
    { id: 'l', name: 'Grande' }
  ];

  var conf = { size: 'm', avatar: null, palette: null, device: null };

  // El ancho de la ventana ya no dice de qué tamaño es (es fijo, para que el
  // panel no cambie), así que el tamaño del avatar sale del atributo.
  function applySize(id) {
    conf.size = id;
    document.documentElement.setAttribute('data-size', id);
  }
  var avatar = null;      // handle del avatar montado
  var current = null;     // su definición en el registro

  /* ---------- montar el avatar elegido ---------- */

  function mountAvatar() {
    var def = window.PetAvatars.get(conf.avatar);
    if (!def) return;

    if (avatar && avatar.destroy) avatar.destroy();
    current = def;

    var ok = def.palettes.some(function (p) { return p.id === conf.palette; });
    if (!ok) conf.palette = def.palettes.length ? def.palettes[0].id : null;

    avatar = def.mount(host, {
      pointer: 'manual',
      interactive: false,
      palette: conf.palette,
      device: window.PetDevices.get(conf.device),
      label: def.name + ' de Claude Code'
    });

    // Si estás cambiando de avatar justo mientras saluda, el nuevo entra
    // saludando también: la pose la manda el saludo hasta que se termine.
    avatar.setState(greeting ? greeting.state : poseFor(phase));
  }

  /* ---------- panel ---------- */

  function fillSelect(el, items, activeId) {
    el.textContent = '';
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it.id;
      o.textContent = it.name;
      if (it.id === activeId) o.selected = true;
      el.appendChild(o);
    });
  }

  function renderPanel() {
    var row = document.getElementById('row-size');
    row.textContent = '';
    SIZES.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.name;
      b.setAttribute('aria-pressed', String(it.id === conf.size));
      b.addEventListener("click", function () {
        applySize(it.id);
        window.pet.setSize(it.id);
        renderPanel();
      });
      row.appendChild(b);
    });

    fillSelect(selAv, window.PetAvatars.list(), current && current.id);

    var pals = current ? current.palettes : [];
    fldPal.hidden = pals.length < 2;
    if (!fldPal.hidden) fillSelect(selPal, pals, conf.palette);

    var dev = window.PetDevices.get(conf.device);
    fillSelect(selDev, window.PetDevices.list(), dev && dev.id);
  }

  selAv.addEventListener('change', function () {
    conf.avatar = selAv.value;
    conf.palette = null;
    mountAvatar();
    window.pet.setAvatar({ avatar: conf.avatar, palette: conf.palette });
    renderPanel();
  });

  selPal.addEventListener('change', function () {
    conf.palette = selPal.value;
    if (avatar && avatar.setPalette) avatar.setPalette(conf.palette);
    else mountAvatar();
    window.pet.setAvatar({ avatar: current && current.id, palette: conf.palette });
  });

  selDev.addEventListener('change', function () {
    conf.device = selDev.value;
    var dev = window.PetDevices.get(conf.device);
    if (avatar && avatar.setDevice) avatar.setDevice(dev);
    else mountAvatar();
    window.pet.setAvatar({ avatar: current && current.id, palette: conf.palette, device: conf.device });
  });

  function togglePanel(open) {
    var next = open === undefined ? panel.hidden : open;
    panel.hidden = !next;
    stage.classList.toggle('open', next);
    btnMenu.setAttribute('aria-expanded', String(next));
    if (next) { hush(); renderPanel(); }
  }

  /* ---------- hover sólo sobre el dibujo ---------- */

  // Del avatar al botón se pasa por aire: sin esta demora los controles se
  // apagan justo cuando vas a apretarlos.
  var hotTimer = 0;

  function hot(on) {
    clearTimeout(hotTimer);
    if (on) { stage.classList.add('hot'); return; }
    hotTimer = setTimeout(function () {
      if (panel.hidden) stage.classList.remove('hot');
    }, 420);
  }

  // La ventana ignora el mouse salvo cuando el puntero está sobre algo
  // dibujado. Con pointer-events apagado en la caja del avatar y prendido en
  // los trazos del SVG, elementFromPoint devuelve el avatar sólo si estás
  // realmente sobre él — el resto del rectángulo es aire y los clicks pasan
  // de largo al escritorio.
  var interactive = false;   // arranca igual que main: ignorando el mouse

  function setInteractive(on) {
    if (on === interactive) return;
    interactive = on;
    window.pet.setInteractive(on);
  }

  window.addEventListener('mousemove', function (e) {
    if (!panel.hidden || down) { setInteractive(true); hot(true); return; }
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var over = !!(el && (el.closest('#chrome') || el.closest('#mascot')));
    setInteractive(over);
    hot(over);
  });

  document.addEventListener('mouseleave', function () {
    if (panel.hidden && !down) { setInteractive(false); hot(false); }
  });

  btnMenu.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
  document.getElementById('btn-close').addEventListener('click', function () { window.pet.close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') togglePanel(false); });
  host.addEventListener('pointerdown', function () { togglePanel(false); });

  /* ---------- globo ---------- */

  var bubbleTimer = 0;

  // Sin innerHTML: el proyecto y el mensaje salen del payload de un hook, y
  // aunque hoy sean de confianza, un globo que interpreta HTML es una puerta
  // que no hace falta dejar abierta.
  function say(title, parts, ms) {
    if (!panel.hidden) return;   // no tapar el panel abierto
    // El saludo dura dos segundos y no se comparte con el globo. Pero lo que
    // el globo tenía para decir no se tira: el proceso principal sólo manda un
    // estado cuando cambia, así que descartarlo sería perderlo hasta el
    // siguiente cambio — justo el aviso de «te espera», que es el que importa.
    if (greeting) { pending = { title: title, parts: parts, ms: ms }; return; }
    bTitle.textContent = title;
    bMeta.textContent = '';
    (parts || []).forEach(function (part) {
      var node = document.createElement(part.strong ? 'b' : 'span');
      node.textContent = part.text;
      bMeta.appendChild(node);
    });
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(hush, ms);
  }

  function hush() {
    pending = null;
    clearTimeout(bubbleTimer);
    bubble.classList.remove('show');
  }

  // 19:20, con el formato de reloj del sistema
  function hora(ms) {
    if (!ms) return 'pronto';
    try {
      // 24 h a propósito: "16:57" entra donde "04:57 p. m." se corta
      return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return 'pronto';
    }
  }

  function human(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min ' + (s % 60) + ' s';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }

  /* ---------- el saludo ---------- */

  // «Hi!» cuando aparece y «Bye!» antes de irse. El texto, la pose y los dos
  // segundos salen de core/greeting.js, que es lo mismo que mira el proceso
  // principal para saber cuánto esperar antes de cerrar la app.
  var G = window.PetGreeting;
  var greeting = null;        // el saludo en curso, o null
  var greetTimer = 0;
  var pending = null;         // lo que el globo quiso decir mientras saludaba

  // A qué pose corresponde cada fase. Mientras saluda, esto es justo lo que se
  // ignora — y a lo que se vuelve cuando el saludo termina.
  function poseFor(p) {
    return (p === 'working' || p === 'waiting' || p === 'sleeping') ? p : 'idle';
  }

  // Todo lo que cambia la pose pasa por acá: durante el saludo el estado se
  // sigue anotando en `phase`, pero el dibujo no se toca. Si no, el primer
  // `state` que llega del proceso principal le borra el saludo por arriba.
  function pose(s) {
    if (greeting || !avatar) return;
    avatar.setState(s);
  }

  function greet(g) {
    hush();                    // el saludo no comparte el aire con el globo
    greeting = g;
    greetEl.textContent = g.text;
    greetEl.classList.remove('show');
    void greetEl.offsetWidth;  // reinicia la animación si ya estaba puesta
    greetEl.classList.add('show');
    if (avatar) avatar.setState(g.state);

    clearTimeout(greetTimer);
    greetTimer = setTimeout(function () {
      greeting = null;
      greetEl.classList.remove('show');
      // Al despedirse no se vuelve a ninguna pose ni se destapa nada: lo que
      // sigue es cerrarse.
      if (g === G.GOODBYE) return;
      pose(poseFor(phase));
      if (pending) { var p = pending; pending = null; say(p.title, p.parts, p.ms); }
    }, G.MS);
  }

  // El proceso principal avisa que se va y espera: sin ese aviso el «Bye!» no
  // llegaría a verse nunca, porque la app se cierra antes.
  window.pet.onFarewell(function () { greet(G.GOODBYE); });

  /* ---------- estados ---------- */

  var phase = 'idle';
  var swap = 0;          // alterna teclear / levantar la vista mientras trabaja
  var swapAt = 0;

  window.pet.onConf(function (c) {
    applySize(c.size || "m");
    conf.avatar = c.avatar;
    conf.palette = c.palette;
    conf.device = c.device;
    applySide(c.side);
    mountAvatar();
    // Recién acá: antes de montar no hay a quién ponerle la pose.
    greet(G.HELLO);
  });

  // De qué lado van los controles lo decide el proceso principal, que sabe
  // dónde cayó la ventana en la pantalla.
  function applySide(side) {
    stage.classList.toggle('side-right', side === 'right');
  }
  window.pet.onSide(applySide);

  window.pet.onState(function (s) {
    var was = phase;
    phase = s.phase;
    if (!avatar) return;

    if (s.phase === 'working') {
      if (was !== 'working') { swap = 0; swapAt = Date.now(); }
      hush();
      return;
    }

    bubble.classList.remove('insist');

    if (s.phase === 'sleeping') {
      pose('sleeping');
      // Sólo se afirma la hora si de verdad la sabemos. Sin statusline el pet
      // se entera de que no hay tokens pero no de cuándo vuelven, y ahí decir
      // "vuelve a las tantas" sería inventar.
      if (s.resetsAt) {
        say('Se quedó sin tokens.', [
          { text: 'vuelve ' }, { text: hora(s.resetsAt), strong: true },
          { text: ' · ' + (s.window || '') }
        ]);
      } else {
        say('OOT — Out of Tokens.', [{ text: 'sin statusline no sabe cuándo vuelve' }]);
      }
      return;
    }

    pose('idle');

    if (s.phase === 'waiting') {
      pose('waiting');
      // el mensaje del hook dice QUÉ pide; sin él sólo podríamos decir "te espera"
      say(
        s.message || 'Necesita que le contestes.',
        s.project ? [{ text: 'en ' }, { text: s.project, strong: true }]
                  : [{ text: 'claude code' }]
      );
      // deja de cabecear a los 40 s, pero el globo se queda: el turno sigue
      // frenado hasta que contestes, y eso no deja de ser cierto por esperar
      if (s.insist) bubble.classList.add('insist');
    } else if (s.phase === 'done') {
      if (!greeting) avatar.poke();   // el saludo tiene su propia animación
      var parts = s.project ? [{ text: s.project, strong: true }]
                            : [{ text: 'claude code' }];
      if (s.took) parts.push({ text: ' · ' + human(s.took) });
      say('Terminó.', parts);
    } else {
      hush();
    }
  });

  // mientras trabaja alterna entre teclear (4-9 s) y levantar la vista (2-4 s)
  setInterval(function () {
    if (phase !== 'working' || !avatar) return;   // dormido y esperando no alternan
    var now = Date.now();
    if (now < swapAt) return;
    swap = swap ? 0 : 1;
    swapAt = now + (swap ? 2000 + Math.random() * 2000 : 4000 + Math.random() * 5000);
    pose(swap ? 'thinking' : 'working');
  }, 250);

  /* ---------- el cursor de todo el escritorio ---------- */

  window.pet.onCursor(function (p) {
    if (phase === 'working' || !avatar) return;   // laburando no mira el mouse
    avatar.look(p.x, p.y);
  });

  /* ---------- arrastrar / tocar ---------- */

  var down = null;

  host.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    down = { x: e.screenX, y: e.screenY, t: Date.now(), moved: false };
    stage.classList.add('dragging');
    window.pet.dragStart();
  });

  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    if (Math.abs(e.screenX - down.x) > 3 || Math.abs(e.screenY - down.y) > 3) down.moved = true;
  });

  window.addEventListener('pointerup', function () {
    if (!down) return;
    window.pet.dragEnd();
    stage.classList.remove('dragging');
    if (!down.moved && Date.now() - down.t < 400 && avatar) {   // click sin arrastrar = toque
      avatar.poke();
      hush();
    }
    down = null;
  });

  host.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    window.pet.menu();
  });

  bubble.addEventListener('click', hush);

  // por si 'conf' no llegara (arranque raro): montar igual el primero del registro
  setTimeout(function () { if (!avatar) { mountAvatar(); greet(G.HELLO); } }, 600);
})();
