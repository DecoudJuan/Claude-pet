---
name: avatar-designer
description: Diseñar e implementar un avatar nuevo para Claude Pet — la mascota de escritorio que refleja el estado de Claude Code. Usala cuando alguien pida "creá un avatar", "quiero un zorro/gato/robot para el pet", "add an avatar", "hacé una mascota nueva", "diseñá un personaje para claude-pet", o cuando haya que dibujar/ajustar los estados (idle, working, thinking, waiting) o la notebook de un avatar existente. Cubre el contrato que tiene que cumplir, qué significa cada estado, cómo se registra y qué errores de dibujo rompen la ventana.
---

# Diseñar un avatar para Claude Pet

Claude Pet es una mascota de escritorio que refleja el estado de Claude Code.
El pet **no sabe dibujar**: sabe en qué estado está la sesión y se lo cuenta a
un avatar. Vos escribís el avatar.

Leé `AVATARS.md` del repo para el contrato completo. Esta skill es el criterio
de diseño: qué tiene que *comunicar* cada estado, no sólo qué métodos exponer.

## Antes de dibujar: qué comunica cada estado

Un avatar que no diferencia los estados no sirve para nada — el pet existe
para que no tengas que mirar la terminal. Estos cuatro **tienen que
distinguirse de un vistazo, de reojo, a 150 px**.

### `idle` — no hay nada corriendo

Vivo pero desocupado. Sigue el cursor, parpadea, mira alrededor. Sin la
computadora a la vista.

> El error a evitar: que `idle` y `done` se vean igual. Cuando termina un turno
> el pet vuelve a `idle`, así que el estado tiene que leerse como «acá estoy»,
> no como «terminé» — de eso se encarga el globo.

### `working` — Claude Code está iterando

**Acá va la computadora.** Que se note que está ocupado y que la atención está
en la máquina, no en vos: manos en el teclado, mirada en la pantalla, algo que
se mueva rítmicamente.

> El error a evitar: una pose estática. Si no se mueve nada, a los diez
> segundos parece colgado.

### `thinking` — sigue trabajando, pero levanta la vista

El pet alterna solo entre `working` y `thinking` (4–9 s tecleando, 2–4 s
pensando) para que no parezca un loop. **Es el mismo trabajo, otra pose.** La
computadora sigue ahí; lo que cambia es el cuerpo: deja de teclear, mira para
otro lado, se toca la pera.

> El error a evitar: que `thinking` parezca que terminó. Si guardás la
> computadora, mentiste.

### `waiting` — te está esperando

El más importante y el que casi todos resuelven mal. Claude Code pidió permiso
y **el turno está frenado hasta que contestes**.

Tiene que leerse como una interrupción, no como un final:

- **La computadora sigue abierta.** Está a mitad de tarea.
- **Las manos se despegan del teclado.** Dejó de trabajar.
- **Te mira a vos.** Es el único estado donde el avatar busca al usuario en vez
  de a su pantalla.

> El error a evitar: mandarlo a `idle`. Se ve igual que cuando terminó, que es
> exactamente el mensaje contrario.

El pet pone el texto («Claude needs your permission to use Bash») en un globo
que es suyo, no tuyo. Vos ponés el lenguaje corporal.

## El contrato, corto

```js
window.PetAvatars.register({
  id: 'zorro',
  name: 'Zorro',
  palettes: [{ id: 'colour', name: 'Colour' }],
  mount: function (host, opts) {
    // opts: { palette, device, pointer: 'manual', interactive: false, label }
    return {
      setState: function (s) { /* 'idle' | 'working' | 'thinking' | 'waiting' */ },
      look:     function (x, y) { /* cursor relativo a la ventana */ },
      poke:     function () { /* lo tocaron, o terminó un turno */ },
      destroy:  function () { /* soltar timers, listeners y rAF */ },

      setPalette: function (id) {},   // opcional
      setDevice:  function (dev) {}   // opcional, ver abajo
    };
  }
});
```

Archivo en `pet/avatars/<id>.js` y un `<script>` en `pet/pet.html`. Nada más:
el panel de ajustes lee el registro solo.

**Dónde va el dibujo.** Si el avatar es chico, todo en ese mismo archivo. Si es
grande, separalo como está el pingüino: el dibujo en un archivo propio en la
raíz — reutilizable en cualquier página web, sin nada del pet — y en
`pet/avatars/<id>.js` sólo el `register()` que lo envuelve. Son dos `<script>`
en vez de uno.

## La notebook es un dato aparte

La máquina no es del avatar: viene de `PetDevices` y el usuario la elige. Llega
en `opts.device` y puede cambiar en caliente por `setDevice(dev)`.

```js
{ id: 'macbook-midnight', name: 'MacBook · Midnight',
  lid: '#2b3442', badge: 'glow', badgeColor: '#c3ccd8' }
```

Tu avatar dibuja **la silueta** de la notebook y le pide al device la tapa y el
logo:

```js
svg.style.setProperty('--mi-tapa', dev.lid);
slot.innerHTML = window.PetDevices.badgeMarkup(dev, cx, cy);
```

Si el avatar no usa notebook (un robot que es la computadora, por ejemplo),
ignorá `device` y no expongas `setDevice`.

## Reglas de dibujo que no son negociables

Romper cualquiera de estas se nota en la ventana, no en el código:

| | |
|---|---|
| **Cuadrado** | El pet reserva una caja cuadrada (152, 182 o 224 px). Un dibujo más alto que ancho se ve corrido. |
| **Apoyado abajo** | El borde inferior se apoya sobre la barra de tareas. El aire va arriba, nunca abajo. |
| **Escalable** | Se monta a 152 y a 224 px sin retocar. SVG, o canvas que lea su tamaño. |
| **Transparente de verdad** | Las partes vacías tienen que dejar pasar el mouse. En SVG sale gratis (`visiblePainted`); en canvas el rectángulo entero ataja el puntero y el hover se activa pasando cerca. |
| **Sin listeners globales** | Con `pointer: 'manual'` el avatar no escucha el mouse. Si igual lo hace, pelea con el pet por el arrastre. |
| **Legible en oscuro y en claro** | La ventana es transparente: el fondo es el escritorio del usuario, y no lo controlás. Cualquier avatar cuyo color se acerque al del fondo se convierte en una mancha sin forma, así que el dibujo tiene que detectar el tema y ajustar su propia tinta — o llevar un contorno que funcione contra los dos. |

## Cómo dibujar

**SVG a mano, no una imagen generada.** Pesa menos, escala sin perder nada, se
recolorea con variables CSS y se anima por partes. El pingüino de referencia no
tiene ni un color escrito adentro del SVG: todo sale de variables.

**Un solo `requestAnimationFrame`.** Interpolá hacia un objetivo y que los
estados escriban ese objetivo, en vez de que cada estado anime por su cuenta.
Es la diferencia entre un personaje y una secuencia de poses.

**Paralaje para la mirada.** Si el avatar tiene ojos: que las pupilas se muevan
más que la cabeza y la cabeza más que el cuerpo. Es lo único que hace que
parezca que *mira* en vez de rotar.

**Ritmos irregulares.** Parpadeo cada 2–6 s, a veces doble. Un ciclo regular se
nota y molesta.

**Cuidá el procesador: es un adorno que corre todo el día.** La ventana es
transparente, así que cada repintado le cuesta al compositor mezclar con el
escritorio, y eso se paga en batería. Tres cosas que bajaron el consumo del
pingüino de 56 % de un núcleo a 13 %:

- **Animá a pasos, no interpolando,** cuando el movimiento es seco. Un tecleo
  con `steps(1)` repinta 8 veces por segundo en vez de 60, y además se ve mejor.
- **No toques el DOM si el valor redondeado no cambió.** Cuantizá a media
  unidad del viewBox: es menos de medio píxel en pantalla y corta de raíz los
  repintados de cualquier movimiento lento.
- **30 cuadros por segundo alcanzan.** Nadie mira de cerca un dibujo de 180 px.

## Cómo probarlo

`index.html` en la raíz monta el avatar suelto en una página, sin Electron ni
hooks — es el lugar para iterar el dibujo. Para probar los estados de verdad:

```bash
node pet/hook.js working  < payload.json    # teclea
node pet/hook.js waiting  < payload.json    # te espera
node pet/hook.js done     < payload.json    # globo de fin
```

donde `payload.json` es `{"session_id":"test","cwd":"/ruta/al/proyecto"}`.

## Checklist antes de dar por terminado

- [ ] Los cuatro estados se distinguen a 152 px, de reojo.
- [ ] `waiting` no se parece a `idle`.
- [ ] `thinking` no parece que terminó.
- [ ] Nada se mueve en loop perfectamente regular.
- [ ] `destroy()` suelta el `requestAnimationFrame` y todos los timers.
- [ ] Las zonas vacías dejan pasar el mouse.
- [ ] Se ve bien sobre un fondo claro y sobre uno oscuro.
