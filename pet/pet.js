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

    avatar.setState(phase === 'working' ? 'working' : 'idle');
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
    clearTimeout(bubbleTimer);
    bubble.classList.remove('show');
  }

  function human(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min ' + (s % 60) + ' s';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }

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

    avatar.setState('idle');
    bubble.classList.remove('insist');

    if (s.phase === 'waiting') {
      avatar.setState('waiting');
      // el mensaje del hook dice QUÉ pide; sin él sólo podríamos decir "te espera"
      say(
        s.message || 'Necesita que le contestes.',
        s.project ? [{ text: 'en ' }, { text: s.project, strong: true }]
                  : [{ text: 'claude code' }]
      );
      bubble.classList.add('insist');
    } else if (s.phase === 'done') {
      avatar.poke();
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
    if (phase !== 'working' || !avatar) return;
    var now = Date.now();
    if (now < swapAt) return;
    swap = swap ? 0 : 1;
    swapAt = now + (swap ? 2000 + Math.random() * 2000 : 4000 + Math.random() * 5000);
    avatar.setState(swap ? 'thinking' : 'working');
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
  setTimeout(function () { if (!avatar) mountAvatar(); }, 600);
})();
