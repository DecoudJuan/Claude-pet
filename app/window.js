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
  var btnSes  = document.getElementById('btn-ses');
  var pgSet   = document.getElementById('page-settings');
  var pgSes   = document.getElementById('page-sessions');
  var pgSetup = document.getElementById('page-setup');
  var setupNote = document.getElementById('setup-note');
  var sesList = document.getElementById('ses-list');
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

  // Una caja, dos páginas. `page` dice cuál, y volver a apretar el mismo botón
  // la cierra — como hacía el de ajustes cuando era el único.
  var page = 'settings';

  function togglePanel(open, which) {
    var next = open === undefined ? (panel.hidden || which !== page) : open;
    if (next && which) page = which;
    panel.hidden = !next;
    pgSet.hidden = page !== 'settings';
    pgSes.hidden = page !== 'sessions';
    pgSetup.hidden = page !== 'setup';
    stage.classList.toggle('open', next);
    btnMenu.setAttribute('aria-expanded', String(next && page === 'settings'));
    btnSes.setAttribute('aria-expanded', String(next && page === 'sessions'));
    if (next) {
      hush();
      if (page === 'settings') renderPanel();
      else if (page === 'sessions') renderSessions();
      // El paso que falta no se va solo: tiene su ✕ y se queda hasta que
      // decidas. Los otros dos son consultas de pasada.
      if (page !== 'setup') armAutoClose();
    } else {
      cancelAutoClose();
    }
  }

  /* ---------- el panel abandonado ---------- */

  /*
   * Abrís el panel de un click, ves lo que querías ver y volvés a lo tuyo sin
   * cerrarlo. Como se abre hacia arriba y mide 254 px, queda una caja blanca
   * flotando sobre el escritorio hasta que te acordás de sacarla.
   *
   * Así que si en tres segundos no pasaste el mouse por encima, se apaga y se
   * cierra. Mientras el mouse está adentro no se va: lo estás usando, y cerrarte
   * el panel mientras elegís avatar sería peor que dejarlo abierto.
   *
   * La primera versión cancelaba PARA SIEMPRE al entrar, y eso lo rompía en el
   * caso más común de todos: el panel abre justo arriba del botón, así que al
   * volver a lo tuyo le pasás por encima sí o sí — y ahí quedaba abierto para
   * la eternidad, que es exactamente lo que esto venía a arreglar. Ahora al
   * salir se rearma.
   *
   * La excepción es el <select>: su desplegable lo dibuja el sistema operativo
   * FUERA de la ventana, así que abrirlo se ve igual que irse del panel.
   * Mientras uno tenga el foco no se rearma nada, o el fade te cerraría el
   * panel con la lista de avatares desplegada encima.
   */
  var closeTimer = 0;
  var fadeTimer = 0;

  function cancelAutoClose() {
    clearTimeout(closeTimer); closeTimer = 0;
    clearTimeout(fadeTimer); fadeTimer = 0;
    panel.classList.remove('fading');
  }

  function armAutoClose() {
    cancelAutoClose();
    closeTimer = setTimeout(function () {
      panel.classList.add('fading');
      fadeTimer = setTimeout(function () {
        togglePanel(false);
        panel.classList.remove('fading');
        // Nadie está encima: la ventana vuelve a dejar pasar los clicks del
        // escritorio en vez de quedarse atajándolos.
        setInteractive(false);
        hot(false);
      }, 340);
    }, 3000);
  }

  // Mientras el mouse está adentro el panel no se va; cuando sale, vuelve a
  // contar. Que se rearme es lo que hace que pasarle por encima al irte no lo
  // deje abierto para siempre.
  function rearmIfAway() {
    if (panel.hidden || page === 'setup') return;
    // Con el desplegable abierto la lista está fuera de la ventana: para el DOM
    // el mouse se fue, pero lo estás usando.
    if (picking) return;
    // Salió el foco pero el mouse volvió a entrar: no hay nada que rearmar.
    try { if (panel.matches(':hover')) return; } catch (e) { /* da igual */ }
    armAutoClose();
  }

  /*
   * El desplegable abierto, y sólo ése.
   *
   * Antes esto se preguntaba mirando si el <select> tenía el foco, y ahí estaba
   * el error que hacía que el panel se quedara abierto para siempre justo
   * después de cambiar de avatar: elegir una opción NO le saca el foco al
   * select y tampoco dispara blur. O sea que el mouse se iba, rearmIfAway veía
   * un select enfocado, y no contaba nunca más. Cambiar algo — que es cuando ya
   * terminaste con el panel — era la única forma de dejarlo pegado.
   *
   * Lo que hace falta saber no es quién tiene el foco sino si la lista del
   * sistema está abierta encima. Se abre con el mousedown y se cierra sola; que
   * se haya cerrado se nota porque la página vuelve a recibir movimientos del
   * mouse — mientras la lista está arriba, no llega ninguno.
   */
  var picking = false;

  function endPick() {
    if (!picking) return;
    picking = false;
    rearmIfAway();
  }

  [selAv, selPal, selDev].forEach(function (el) {
    el.addEventListener('mousedown', function () { picking = true; cancelAutoClose(); });
    // Elegiste. Si el mouse ya no está encima, el panel empieza a contar; si
    // todavía está, cuenta cuando lo saques. Es lo mismo que pasa al abrirlo.
    el.addEventListener('change', endPick);
    el.addEventListener('blur', endPick);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab') endPick();
    });
  });

  // La red de seguridad: si la página recibe un movimiento del mouse es porque
  // la lista del sistema ya no está arriba, sea porque elegiste o porque la
  // cerraste con Escape en una tecla que no vimos pasar.
  document.addEventListener('pointermove', function () { if (picking) endPick(); });

  panel.addEventListener('pointerenter', cancelAutoClose);
  panel.addEventListener('pointerleave', rearmIfAway);

  /* ---------- el paso que falta ---------- */

  /*
   * La única página que se abre sola. El resto del pet espera a que pases por
   * encima, porque el resto del pet es opcional; sin los hooks puestos no hay
   * nada que mirar, y el que lo bajó de un .exe no tiene por qué deducir que la
   * respuesta está abajo del botón derecho.
   *
   * Una vez que están, no vuelve a aparecer nunca.
   */
  function note(text, kind) {
    setupNote.textContent = text || '';
    setupNote.hidden = !text;
    setupNote.className = kind || '';
  }

  window.pet.onSetup(function (s) {
    var r = s.result;

    if (r) {
      if (!r.ok) {
        note(r.error === 'roto'
          ? 'Tu settings.json tiene un error de sintaxis. No lo tocamos.'
          : 'No se pudo escribir el archivo.', 'bad');
      } else if (r.delegated) {
        note('Listo. Tu statusLine no se tocó: el nuestro se lo delega.', 'good');
      } else {
        note(r.changed ? 'Listo. Abrí una terminal nueva.' : 'Ya estaban puestos.', 'good');
      }
    }

    if (s.installed) {
      // Con el aviso recién dado se deja leer un momento antes de cerrarse; sin
      // aviso (arrancó con todo puesto) no hay nada que cerrar.
      if (r && r.ok) setTimeout(function () { if (page === 'setup') togglePanel(false); }, 2600);
      else if (page === 'setup') togglePanel(false);
      return;
    }

    if (s.broken) note('Tu settings.json no se puede leer. Revisalo y probá de nuevo.', 'bad');
    togglePanel(true, 'setup');
    // El panel abierto no sirve si la ventana sigue ignorando el mouse: los
    // botones no se podrían apretar hasta que muevas el puntero por encima.
    setInteractive(true);
  });

  document.getElementById('btn-install').addEventListener('click', function (e) {
    e.stopPropagation();
    note('Instalando…');
    window.pet.installHooks();
  });

  document.getElementById('btn-copy').addEventListener('click', function (e) {
    e.stopPropagation();
    window.pet.copyHooks();
    window.pet.revealSettings();
    note('Copiado. Pegalo dentro de settings.json.', 'good');
  });

  /*
   * El check de las versiones nuevas. Viene marcado —es el default— pero acá lo
   * ve, que es el punto: el chequeo es lo único que el pet manda a la red y el
   * único momento en que tiene la atención del usuario es este panel. Que se
   * entere leyendo el README después del primer pedido no es enterarse.
   *
   * Se guarda al toque, sin esperar a que apriete ningún botón: desmarcarlo y
   * cerrar el panel con la ✕ tiene que alcanzar.
   */
  var chkUp = document.getElementById('chk-updates');
  var fldUp = document.getElementById('fld-updates');

  chkUp.addEventListener('change', function () {
    window.pet.setUpdates(chkUp.checked);
  });

  // Lo tocaron del otro lado — el menú del botón derecho — o es el estado
  // guardado que llega al arrancar.
  window.pet.onUpdatesPref(function (on) { chkUp.checked = !!on; });

  // Cerrarlo sin instalar nada es una respuesta válida. Vuelve en el próximo
  // arranque porque el paso sigue faltando, pero no te lo discute ahora.
  document.getElementById('btn-setup-close').addEventListener('click', function (e) {
    e.stopPropagation();
    togglePanel(false);
    setInteractive(false);
    hot(false);
  });

  /* ---------- la lista de sesiones ---------- */

  var roster = [];   // lo último que mandó el proceso principal

  /*
   * El avatar muestra una sola sesión — la que manda — y eso está bien para
   * mirarlo de reojo. Esta lista es para cuando querés saber el resto: quiénes
   * están, en qué anda cada una y desde cuándo.
   *
   * Sin innerHTML, igual que el globo: los nombres salen del cwd de un hook.
   */
  function renderSessions() {
    sesList.textContent = '';

    if (!roster.length) {
      sesList.appendChild(row('is-empty', '', 'Ninguna abierta', ''));
      return;
    }

    var now = Date.now();
    roster.forEach(function (s) {
      sesList.appendChild(row(
        'is-' + s.state,
        s.state,
        s.project || 'claude code',
        detail(s, now)
      ));
    });
  }

  function detail(s, now) {
    if (s.state === 'waiting') return 'te espera';
    if (s.state === 'limited') return 'sin tokens';
    // Cuánto hace que labura es el dato que no está en ningún otro lado: el
    // globo lo cuenta recién cuando termina.
    if (s.state === 'working') return human(Math.max(0, now - s.since));
    return 'en reposo';
  }

  function row(cls, state, who, what) {
    var li = document.createElement('li');
    li.className = 'ses ' + cls;

    if (state) {
      var dot = document.createElement('span');
      dot.className = 'dot';
      li.appendChild(dot);
    }

    var name = document.createElement('span');
    name.className = 'who';
    name.textContent = who;
    li.appendChild(name);

    if (what) {
      var d = document.createElement('span');
      d.className = 'what';
      d.textContent = what;
      li.appendChild(d);
    }
    return li;
  }

  // El reloj de «hace cuánto» corre acá: el proceso principal manda el instante
  // en que arrancó y no lo reenvía cada segundo, así que si esto no se redibuja
  // el número queda clavado mientras mirás.
  setInterval(function () {
    if (!panel.hidden && page === 'sessions') renderSessions();
  }, 1000);

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
    // El globo de siempre NO atrapa el mouse: es un cartel que se lee, y está
    // arriba del avatar tapando un pedazo grande de escritorio. El del aviso de
    // versión sí, porque es lo único en lo que se puede hacer clic — sin esto
    // la ventana sigue siendo click-through ahí y el clic se lo come la ventana
    // que haya atrás.
    var b = el && el.closest('#bubble');
    var over = !!(el && (el.closest('#chrome') || el.closest('#mascot') ||
                         (b && b.classList.contains('news'))));
    setInteractive(over);
    hot(over);
  });

  document.addEventListener('mouseleave', function () {
    if (panel.hidden && !down) { setInteractive(false); hot(false); }
  });

  btnMenu.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(undefined, 'settings'); });
  btnSes.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(undefined, 'sessions'); });
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
    // El aviso de versión viste distinto al globo de siempre. Se saca acá para
    // que el globo siguiente —«terminó», «te espera»— no herede el color.
    bubble.classList.remove('news', 'insist');
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
    bubble.classList.remove('show', 'news', 'insist');
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

  /* ---------- salió una versión nueva ---------- */

  /*
   * La primera versión de esto decía el aviso una vez por versión, doce
   * segundos, y no volvía nunca. Probándolo quedó claro que eso es lo mismo que
   * no avisar: si en esos doce segundos no estabas mirando la esquina, te
   * enterabas de la versión nueva jamás.
   *
   * Ahora insiste, pero con techo. El chequeo ya está limitado a uno por día,
   * así que colgarse de él da la cadencia sola: como mucho un globo por día
   * hasta que actualices. Eso es un recordatorio; todos los arranques sería
   * hostigamiento, y el pet arranca cada vez que abrís una terminal.
   *
   * Y se hace ver. El globo va en color de acento —no es un estado de Claude
   * Code, es otra cosa—, cabecea como el de «te espera» y el avatar pega el
   * salto, que es el gesto que este proyecto usa para «mirame».
   *
   * Lo que no cambió: no se dice con el panel abierto ni si hay algo que contar
   * del turno. Una versión nueva puede esperar a que el pet no tenga nada mejor
   * que decir.
   */
  var pendingUpdate = null;

  window.pet.onUpdate(function (u) {
    if (!u || !u.version) return;
    pendingUpdate = u;
    tellUpdate();
  });

  function tellUpdate() {
    if (!pendingUpdate) return;
    if (!panel.hidden) return;
    if (phase !== 'idle' && phase !== 'sleeping') return;   // hay algo más importante
    // Saludando, el globo no sale: se reintenta en vez de perderse.
    if (greeting) { setTimeout(tellUpdate, 1200); return; }
    var u = pendingUpdate;
    pendingUpdate = null;

    newsUrl = u.url;
    say('Salió la ' + u.version, [{ text: 'clic acá para bajarla', strong: true }], 30000);
    bubble.classList.add('news', 'insist');
    // El salto es el mismo gesto que usa «terminó»: cuesta nada y es lo que
    // hace que se note de reojo.
    if (avatar && !greeting) avatar.poke();
  }

  /*
   * Un solo handler para siempre, en vez de uno por aviso. Colgar el listener
   * adentro de tellUpdate y sacarlo al hacer clic dejaba uno pegado cada vez que
   * el globo se vencía sin que lo tocaras — y al segundo día abría la página de
   * releases dos veces.
   */
  var newsUrl = null;

  bubble.addEventListener('click', function () {
    if (!newsUrl || !bubble.classList.contains('news')) return;
    window.pet.openReleases(newsUrl);
    newsUrl = null;
    hush();
  });

  // La ✕ del globo: cerrarlo sin ir a bajar nada. Va adentro del globo, así que
  // hay que frenar el clic antes de que llegue al globo y abra el navegador.
  document.getElementById('btn-bubble-close').addEventListener('click', function (e) {
    e.stopPropagation();
    newsUrl = null;
    hush();
  });

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
    // El check viene marcado en el HTML porque ése es el default, pero lo que
    // manda es lo que elegiste la vez pasada.
    chkUp.checked = c.updates !== false;
    if (c.updatesLocked) {
      // La variable de ambiente ya decidió: se muestra, no se toca.
      chkUp.disabled = true;
      fldUp.classList.add('locked');
      fldUp.title = 'Apagado por CLAUDE_PET_NO_UPDATE_CHECK';
    }
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
    roster = s.list || [];
    if (!panel.hidden && page === 'sessions') renderSessions();
    if (!avatar) return;

    // La pose es del conjunto y el aviso es de una sesión: mientras una labura,
    // otra puede haber terminado. Por eso el globo se resuelve aparte y el
    // avatar sigue tecleando mientras cuenta que la otra terminó.
    if (s.phase === 'working') {
      if (was !== 'working') { swap = 0; swapAt = Date.now(); }
      bubble.classList.remove('insist');
      if (s.notice) done(s.notice);
      else hush();
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
      var espera = s.project ? [{ text: 'en ' }, { text: s.project, strong: true }]
                             : [{ text: 'claude code' }];
      // Contestar la que el globo nombra y que aparezca una segunda sin
      // haberla visto venir es peor que saber desde el principio que estaba.
      if (s.others) espera.push({ text: ' · y ' + s.others + ' más' });
      say(s.message || 'Necesita que le contestes.', espera);
      // deja de cabecear a los 40 s, pero el globo se queda: el turno sigue
      // frenado hasta que contestes, y eso no deja de ser cierto por esperar
      if (s.insist) bubble.classList.add('insist');
    } else if (s.notice) {
      if (!greeting) avatar.poke();   // el saludo tiene su propia animación
      done(s.notice);
    } else {
      hush();
      // Con el turno quieto y nada que contar, recién ahí cabe el aviso de la
      // versión nueva. Si llegó mientras estabas laburando, esperó hasta acá.
      tellUpdate();
    }
  });

  // «Terminó» tiene que decir CUÁL terminó y si queda alguien laburando. Con
  // una sola sesión daba igual; con tres, «terminó» a secas se lee como
  // «terminó todo», que es exactamente lo que no pasó.
  function done(n) {
    var parts = n.project ? [{ text: n.project, strong: true }]
                          : [{ text: 'claude code' }];
    if (n.took) parts.push({ text: ' · ' + human(n.took) });
    if (n.rest) parts.push({ text: ' · sigue' + (n.rest > 1 ? 'n ' + n.rest : ' 1') });
    say('Terminó.', parts);
  }

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
