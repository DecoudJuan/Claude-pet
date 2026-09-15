# Avatares

El pet no sabe dibujar. Sabe una sola cosa: en qué estado está Claude Code. Se
lo cuenta a un **avatar**, y el avatar decide cómo se ve eso.

Esa separación es a propósito. El pingüino es el primero, no el único — la
nutria vino después y las dos conviven en el panel —, y nada del pet las
menciona por nombre: las encuentra en un registro.

---

## El contrato

Un avatar es un objeto con una función `mount()`. Eso es todo lo que el pet
conoce de él.

```js
window.PetAvatars.register({
  id: 'zorro',                    // único y estable: se guarda en la config
  name: 'Zorro',                  // lo que se lee en el panel de ajustes
  palettes: [                     // opcional
    { id: 'colour', name: 'Colour' },
    { id: 'noche',  name: 'Noche' }
  ],
  accessories: [                  // opcional
    { id: 'none', name: 'Ninguno' },
    { id: 'glasses', name: 'Anteojos' }
  ],
  mount: function (host, opts) {
    return MiZorro.mount(host, opts);
  }
});
```

`mount(host, opts)` recibe el `<div>` donde dibujar y estas opciones:

| Opción | |
|---|---|
| `palette` | El id de paleta elegido, o `null` si el avatar no declara ninguna. |
| `accessory` | El id de accesorio elegido, o `null` si el avatar no declara ninguno. |
| `device` | La notebook elegida — `{ id, name, lid, badge, badgeColor }` — o `null`. Ver abajo. |
| `pointer` | Siempre `'manual'`. El avatar **no** debe escuchar el mouse por su cuenta: la posición se la inyecta el pet con `look()`, porque es la del cursor en toda la pantalla, no la de la ventana. |
| `interactive` | Siempre `false`. El click y el arrastre los maneja el pet. |
| `label` | Texto para el `aria-label`. |

Y tiene que devolver un handle con estos cuatro métodos. Son obligatorios:

| Método | Cuándo lo llama el pet |
|---|---|
| `setState(estado)` | `'idle'` · `'working'` · `'thinking'` · `'waiting'` · `'sleeping'` · `'greeting'` · `'farewell'` |
| `look(x, y)` | Cada 80 ms con la posición del cursor **relativa a la ventana**. Puede ser negativa o mayor que la ventana: el cursor está en cualquier parte de la pantalla. |
| `poke()` | Cuando lo tocan, y cuando termina un turno. |
| `destroy()` | Al cambiar de avatar. Soltá timers, listeners y `requestAnimationFrame`. |

Opcional:

| | |
|---|---|
| `setPalette(id)` | Cambiar de tinta sin remontar. Si no está, el pet remonta el avatar entero. |
| `setAccessory(id)` | Mostrar otra combinación de accesorios sin remontar. Si no está, el pet remonta. |
| `setDevice(dev)` | Cambiar de notebook sin remontar. Si no está, el pet remonta. |
| `element` | El nodo raíz, cómodo para tests. |

### La notebook no es del avatar

La máquina se dibuja sola. Tu avatar **no dibuja ninguna computadora**: deja un
`<g>` vacío y el device se pinta adentro.

```js
window.PetDevices.injectStyle(document);
window.PetDevices.applyTo(svg, dev);      // los colores, por custom properties
slot.innerHTML = window.PetDevices.markup(dev);   // tapa y logo, enteros
```

Lo único tuyo son **las manos**, porque son del personaje. Van en
`PetBody.HANDS`, que es donde el device dibujó el teclado.

Si tu avatar no usa notebook — un robot que *es* la computadora, por ejemplo —
ignorá `device`, no dejes el hueco y no expongas `setDevice`.

---

## El cuerpo es canónico

**De la clavícula para abajo, todos los avatares son idénticos.** Misma forma,
mismo tamaño, mismos anclajes. Lo que cambia es de ahí para arriba: cabeza,
cara, colores, accesorios.

No es una regla estética. Es lo que permite que la notebook sea un objeto
aparte: con un torso fijo, cualquier máquina calza en cualquier avatar sin que
ninguno de los dos sepa nada del otro. Si cada uno dibujara su propio torso, el
device tendría que adivinar dónde apoyarse y las manos no llegarían al teclado.

La geometría **no se copia, se pide** — así no puede desviarse por transcribirla
mal:

```js
var B = window.PetBody;

B.torso        // el path de la silueta
B.belly        // el path del frente
B.TORSO_TOP    // 162 — de acá para abajo es de todos
B.HEAD         // la caja del cráneo: cx, top, bottom, width
B.LIMITS       // hasta dónde puede llegar un accesorio
B.DEVICE       // dónde se dibuja la máquina
B.HANDS        // dónde van tus manos sobre el teclado
B.clipRect     // el recorte contra el borde de abajo
```

### La cabeza también tiene caja

**La forma es tuya; el tamaño no.** El cráneo entra en `B.HEAD` — 184 de ancho,
de y 30 a 186 — y puede ser redondo, cuadrado, alargado o triangular adentro de
esa caja. Lo que no puede es ser del doble de ancho que el de otro avatar: se
dejarían de leer como parte de la misma familia, y encima taparía la notebook.

Y el alto tampoco es libre. El pet reserva un cuadrado: una cabeza que se
estire sin límite o se sale del cuadro, o achica todo lo demás hasta que no se
vea nada.

### Los accesorios sí pueden salirse del cráneo

Orejas altas, cuernos, una cola, una vincha, un sombrero: **eso vive afuera de
`B.HEAD` y está bien**. El único techo es `B.LIMITS` — x 8 a 232, y de 8 para
abajo — que es el borde del viewBox con un margen. Más allá, el pet lo recorta
y no se ve.

Como referencia: los auriculares del pingüino usan de 18 a 222, bien adentro
del límite.

El pingüino le aplica un `scale(0.95 1)` a **su cabeza** para verse menos
rechoncho. Al torso no: eso sería desviarse del canon.

### Los estados

- **`idle`** — no hay nada corriendo. Es el estado donde el avatar debería
  seguir el cursor y hacer su vida: parpadear, mirar alrededor.
- **`working`** — Claude Code está iterando. Que se note que está ocupado.
- **`thinking`** — sigue trabajando, pero el pet alterna a este estado cada
  tanto (4–9 s tecleando, 2–4 s pensando) para que no parezca un loop. Es el
  mismo trabajo, otra pose.

- **`sleeping`** — se acabaron los tokens. No es que terminó ni que descansa
  entre turnos: no puede trabajar hasta que se resetee el límite. Ojos
  cerrados, sin computadora, y sin seguir el cursor — está durmiendo, no
  distraído.

- **`greeting`** y **`farewell`** — la entrada y la salida. Ver abajo.

El pet no le manda `done` al avatar: eso lo cuenta el globo de
diálogo, que es del pet, no del avatar. En `done` sí le pega un `poke()`.

### Entrar y salir

El pet aparece cuando arranca una sesión de Claude Code y se va cuando se apaga
la última. Antes las dos cosas pasaban de golpe: la ventana estaba o no estaba.

Ahora hay una entrada y una salida, y son de todos los avatares:

- **`greeting`** — llega una sola vez, apenas se monta el avatar. El dibujo
  **asoma desde abajo del cuadro**, como si subiera desde atrás de la barra de
  tareas, y se queda quieto mirando al frente.
- **`farewell`** — llega una sola vez, **justo antes de que la app se cierre**.
  El dibujo se hunde por el mismo camino y se queda abajo: lo que sigue es que
  la ventana desaparece, así que volver al centro sería mostrarlo entero justo
  después de despedirse.

El «Hi!» y el «Bye!» **no los dibuja el avatar**: los dice el pet, en el mismo
globo con el que cuenta todo lo demás. Vos ponés el cuerpo.

Los dos duran lo mismo, y ese número vive en un solo lugar:

```js
window.PetGreeting.MS        // 2000 — lo que dura el saludo
window.PetGreeting.HELLO     // { text: 'Hi!',  state: 'greeting' }
window.PetGreeting.GOODBYE   // { text: 'Bye!', state: 'farewell' }
```

Está en `core/greeting.js` porque lo comparten tres piezas que no se conocen
entre sí: la ventana lo muestra, cada avatar dibuja la pose, y el **proceso
principal tiene que esperar** a que el «Bye!» termine antes de cerrar la app.
Si esos números se separaran, el adiós se cortaría a la mitad.

`MS` es lo que dura el **estado**, no necesariamente tu animación. Entrando
podés asomar más rápido y quedarte quieto el resto — el pingüino sube en 0,6 s.
Saliendo no: la animación tiene que terminar en `MS`, porque ahí se cierra.

**Sin balanceo.** Entrar y salir es subir y bajar derecho — nada de vaivenes ni
rebotes. Se ve una vez por sesión, y un personaje que se tambalea al aparecer
se lee como un tropiezo, no como un saludo.

> El error a evitar: animar el `farewell` y que termine volviendo al centro. El
> último cuadro que se ve es el que queda, y la app se cierra ahí.

---

## Sumar uno

**1. La carpeta.** `avatars/zorro/`, con el dibujo y el `register()` separados
como en el pingüino:

```
avatars/zorro/
├── draw.js      el dibujo — no sabe que el pet existe
└── avatar.js    el register() de arriba
```

**2. Los `<script>`.** En `app/window.html`, en la sección de catálogo:

```html
<script src="../avatars/penguin/draw.js"></script>
<script src="../avatars/penguin/avatar.js"></script>
<script src="../avatars/zorro/draw.js"></script>     <!-- el tuyo -->
<script src="../avatars/zorro/avatar.js"></script>
```

**3. Listo.** El panel de ajustes lee el registro solo: el selector de avatares
se llena con todos los registrados, el de paletas con las del que esté elegido
y el de accesorios con sus opciones. Las filas con menos de dos alternativas
no se muestran.

No hay paso 4. No hay que tocar `main.js`, ni el panel, ni el CSS.

---

## Qué tiene que respetar el dibujo

- **Cuadrado.** El pet reserva una caja cuadrada de lado `--avatar` (152, 182 o
  224 px según el tamaño elegido) y ancla todo lo demás a ella. Un avatar más
  alto que ancho se va a ver corrido.
- **Apoyado abajo.** El borde inferior del dibujo es el que se apoya sobre la
  barra de tareas. Dejá el aire arriba, no abajo.
- **Escalable.** Se monta a 152 px y a 224 px sin retocar nada: SVG, o canvas
  que lea su propio tamaño.
- **Transparente de verdad.** Las partes vacías tienen que dejar pasar el
  mouse. En SVG sale gratis (`visiblePainted`); si dibujás en canvas, el
  rectángulo entero va a atajar el puntero y el hover se va a activar pasando
  cerca.
- **Sin listeners globales.** Con `pointer: 'manual'` el avatar no escucha el
  mouse. Si igual lo hace, va a pelear con el pet por el arrastre.

## Un esqueleto que funciona

Un avatar completo y mínimo. Cumple las dos reglas — torso canónico y la
máquina dibujada por el device — y responde a los siete estados, la entrada y
la salida incluidas. Copialo y cambiale la cabeza.

```js
window.PetAvatars.register({
  id: 'bloque',
  name: 'Bloque',

  mount: function (host, opts) {
    var B = window.PetBody;       // el cuerpo, servido: no lo copies
    var D = window.PetDevices;    // la máquina, se dibuja sola
    var uid = 'bl' + Math.random().toString(36).slice(2, 8);   // el clip necesita id único

    host.innerHTML =
      '<svg viewBox="' + B.VIEWBOX + '" role="img" aria-label="' + opts.label + '">' +
        '<defs><clipPath id="' + uid + '"><rect x="' + B.clipRect.x + '" y="' + B.clipRect.y +
          '" width="' + B.clipRect.width + '" height="' + B.clipRect.height + '"/></clipPath></defs>' +

        // --- el torso es de todos ---
        '<g clip-path="url(#' + uid + ')">' +
          '<path d="' + B.torso + '" fill="#2b3442"/>' +
          '<path d="' + B.belly + '" fill="#eef2f6"/>' +
        '</g>' +

        // --- de acá para arriba, tuyo ---
        '<g class="head">' +
          '<circle cx="120" cy="96" r="66" fill="#2b3442"/>' +
          '<circle cx="98" cy="92" r="10" fill="#fff"/>' +
          '<circle cx="142" cy="92" r="10" fill="#fff"/>' +
        '</g>' +

        // --- el hueco de la máquina, y tus manos sobre su teclado ---
        '<g class="lap" clip-path="url(#' + uid + ')" opacity="0">' +
          '<ellipse class="hand" cx="' + B.HANDS.left.x + '" cy="' + B.HANDS.left.y +
            '" rx="' + B.HANDS.rx + '" ry="' + B.HANDS.ry + '" fill="#2b3442"/>' +
          '<ellipse class="hand" cx="' + B.HANDS.right.x + '" cy="' + B.HANDS.right.y +
            '" rx="' + B.HANDS.rx + '" ry="' + B.HANDS.ry + '" fill="#2b3442"/>' +
          '<g class="device"></g>' +
        '</g>' +
      '</svg>';

    var svg  = host.firstChild;
    var head = svg.querySelector('.head');
    var lap  = svg.querySelector('.lap');
    var slot = svg.querySelector('.device');
    var state = 'idle', tx = 0, ty = 0, sx = 0, sy = 0, raf = 0;

    function device(dev) {
      if (!D) return;
      D.injectStyle(document);
      D.applyTo(svg, dev);              // los colores, por custom properties
      slot.innerHTML = D.markup(dev);   // tapa y logo, enteros
    }
    device(opts.device);

    (function loop() {
      if (state === 'working')       { tx = 0;    ty = 0.9;  }  // mira el teclado
      else if (state === 'thinking') { tx = 0.5;  ty = -0.4; }  // levanta la vista
      else if (state === 'sleeping') { tx = 0.06; ty = 0.55; }  // duerme: no sigue el cursor
      else if (state === 'greeting' ||
               state === 'farewell') { tx = 0;    ty = -0.1; }  // saluda: de frente y quieto
      sx += (tx - sx) * 0.14;
      sy += (ty - sy) * 0.14;
      head.setAttribute('transform',
        'translate(' + (sx * 8).toFixed(1) + ' ' + (sy * 6).toFixed(1) + ')');
      raf = requestAnimationFrame(loop);
    })();

    return {
      setState: function (s) {
        state = s;
        // la máquina se ve mientras hay trabajo a medio hacer. waiting sigue a
        // mitad de tarea; sleeping no — sin tokens no hay nada que hacer, y
        // entrando o saliendo tampoco: todavía no empezó, o ya terminó.
        var trabajando = (s === 'working' || s === 'thinking' || s === 'waiting');
        lap.setAttribute('opacity', trabajando ? 1 : 0);
        // y en waiting las manos se despegan del teclado
        lap.querySelectorAll('.hand').forEach(function (h) {
          h.setAttribute('transform', s === 'waiting' ? 'translate(0 -7)' : '');
        });
        // entrar y salir: asoma desde abajo del cuadro y se hunde por el mismo
        // camino. Derecho, sin rebote, y el farewell se queda abajo — después
        // de eso la ventana se cierra.
        if (s === 'greeting' || s === 'farewell') {
          var G = window.PetGreeting;
          var desde = s === 'greeting' ? 'translateY(150px)' : 'translateY(0)';
          var hasta = s === 'greeting' ? 'translateY(0)' : 'translateY(150px)';
          svg.animate(
            [{ transform: desde, opacity: s === 'greeting' ? 0 : 1 },
             { transform: hasta, opacity: s === 'greeting' ? 1 : 0 }],
            { duration: s === 'greeting' ? 620 : G.MS, fill: 'forwards',
              easing: s === 'greeting' ? 'cubic-bezier(.22,.68,.3,1)'
                                       : 'cubic-bezier(.5,0,.9,.35)' }
          );
        }
      },
      look: function (x, y) {
        // laburando, durmiendo o saludando no mira el mouse
        if (state !== 'idle' && state !== 'waiting') return;
        var r = svg.getBoundingClientRect();
        var c = function (v) { return Math.max(-1, Math.min(1, v)); };
        tx = c((x - r.left - r.width / 2) / (r.width * 1.4));
        ty = c((y - r.top - r.height * 0.44) / (r.height * 1.1));
      },
      poke: function () {
        svg.animate([{ transform: 'scale(1)' },
                     { transform: 'scale(1.08)' },
                     { transform: 'scale(1)' }], 380);
      },
      destroy: function () { cancelAnimationFrame(raf); host.innerHTML = ''; },
      setDevice: device
    };
  }
});
```

Lo que **no** hace y deberías sumarle: parpadeo, deriva cuando no hay cursor
cerca, tecleo animado en `working`, ojos cerrados en `sleeping` y una tinta que
se levante sobre fondo oscuro. Todo eso está resuelto en `avatars/penguin/draw.js`.

## El pingüino como referencia

`avatars/penguin/draw.js` es la implementación completa del contrato y se puede leer
como ejemplo. Vale la pena mirar tres cosas:

- **Paletas por variables CSS.** El SVG no tiene ni un color escrito adentro:
  todo sale de seis variables. Cambiar de paleta es cambiar un atributo, no
  redibujar.
- **Tinta que se levanta en tema oscuro.** Un pingüino negro sobre un fondo
  negro es una mancha. El componente sube la tinta del cuerpo cuando detecta
  fondo oscuro, y le da al marco de los anteojos una tinta propia más oscura
  para que no se funda con la piel.
- **El bucle.** Un solo `requestAnimationFrame` con interpolación suave hacia
  un objetivo, y los estados escriben ese objetivo en vez de animar cada uno
  por su lado.
