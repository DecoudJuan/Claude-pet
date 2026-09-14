# Avatares

El pet no sabe dibujar. Sabe una sola cosa: en qué estado está Claude Code. Se
lo cuenta a un **avatar**, y el avatar decide cómo se ve eso.

Esa separación es a propósito. El pingüino es el primero, no el único, y nada
del pet lo menciona por nombre: lo encuentra en un registro.

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
  mount: function (host, opts) {
    return MiZorro.mount(host, opts);
  }
});
```

`mount(host, opts)` recibe el `<div>` donde dibujar y estas opciones:

| Opción | |
|---|---|
| `palette` | El id de paleta elegido, o `null` si el avatar no declara ninguna. |
| `device` | La notebook elegida — `{ id, name, lid, badge, badgeColor }` — o `null`. Ver abajo. |
| `pointer` | Siempre `'manual'`. El avatar **no** debe escuchar el mouse por su cuenta: la posición se la inyecta el pet con `look()`, porque es la del cursor en toda la pantalla, no la de la ventana. |
| `interactive` | Siempre `false`. El click y el arrastre los maneja el pet. |
| `label` | Texto para el `aria-label`. |

Y tiene que devolver un handle con estos cuatro métodos. Son obligatorios:

| Método | Cuándo lo llama el pet |
|---|---|
| `setState(estado)` | `'idle'` · `'working'` · `'thinking'` |
| `look(x, y)` | Cada 80 ms con la posición del cursor **relativa a la ventana**. Puede ser negativa o mayor que la ventana: el cursor está en cualquier parte de la pantalla. |
| `poke()` | Cuando lo tocan, y cuando termina un turno. |
| `destroy()` | Al cambiar de avatar. Soltá timers, listeners y `requestAnimationFrame`. |

Opcional:

| | |
|---|---|
| `setPalette(id)` | Cambiar de tinta sin remontar. Si no está, el pet remonta el avatar entero. |
| `setDevice(dev)` | Cambiar de notebook sin remontar. Si no está, el pet remonta. |
| `element` | El nodo raíz, cómodo para tests. |

### La notebook no es del avatar

La máquina viene de un registro aparte (`PetDevices`) y la elige el usuario, así
que un avatar nuevo hereda las diez que ya existen sin escribir una línea. El
avatar dibuja **la silueta**; el device pone la tapa y el logo:

```js
svg.style.setProperty('--mi-tapa', dev.lid);
slot.innerHTML = window.PetDevices.badgeMarkup(dev, cx, cy);
```

Si tu avatar no usa notebook — un robot que *es* la computadora, por ejemplo —
ignorá `device` y no expongas `setDevice`.

### Los tres estados

- **`idle`** — no hay nada corriendo. Es el estado donde el avatar debería
  seguir el cursor y hacer su vida: parpadear, mirar alrededor.
- **`working`** — Claude Code está iterando. Que se note que está ocupado.
- **`thinking`** — sigue trabajando, pero el pet alterna a este estado cada
  tanto (4–9 s tecleando, 2–4 s pensando) para que no parezca un loop. Es el
  mismo trabajo, otra pose.

El pet no le manda `waiting` ni `done` al avatar: eso lo cuenta el globo de
diálogo, que es del pet, no del avatar. En `done` sí le pega un `poke()`.

---

## Sumar uno

**1. El archivo.** `pet/avatars/zorro.js`, con el `register()` de arriba.

**2. El `<script>`.** En `pet/pet.html`, junto a los otros:

```html
<script src="avatars.js"></script>
<script src="avatars/penguin.js"></script>
<script src="avatars/zorro.js"></script>   <!-- el tuyo -->
```

**3. Listo.** El panel de ajustes lee el registro solo: el selector de avatares
se llena con todos los registrados y el de paletas con las del que esté
elegido. Si el avatar declara menos de dos paletas, esa fila no se muestra.

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

## Un ejemplo mínimo

Un avatar que no dibuja nada, sólo cambia de color según el estado. Sirve para
arrancar uno nuevo:

```js
window.PetAvatars.register({
  id: 'semaforo',
  name: 'Semáforo',
  mount: function (host) {
    host.innerHTML = '<div class="sem"></div>';
    var el = host.firstChild;
    el.style.cssText = 'width:100%;aspect-ratio:1;border-radius:50%;transition:background .3s';

    var raf = 0;

    return {
      element: el,
      setState: function (s) {
        el.style.background = s === 'working' ? '#f0951f'
                            : s === 'thinking' ? '#9fd8ff'
                            : '#2b6e4f';
      },
      look: function (x, y) {
        // mirá el cursor si querés; acá no hacemos nada
      },
      poke: function () {
        el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 400);
      },
      destroy: function () {
        cancelAnimationFrame(raf);
        host.innerHTML = '';
      }
    };
  }
});
```

## El pingüino como referencia

`penguin-mascot.js` es la implementación completa del contrato y se puede leer
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
