# Roadmap

En qué orden se construyó esto, y qué falta. Sirve para entender por qué el
código está como está: casi todas las decisiones raras son cicatrices de algo
que se rompió.

---

## Hecho

### 1. El dibujo

- **Pingüino en SVG, a mano.** La idea original venía de una skill que genera
  mascotas con una API de imágenes; sin clave para eso, se dibujó a mano. El
  resultado pesa menos que una foto y se recolorea con variables CSS.
- **Sigue el cursor.** Paralaje en tres capas: las pupilas se mueven más que la
  cabeza y la cabeza más que el cuerpo. Es lo único que hace que parezca que
  *mira* en vez de rotar.
- **Parpadea y salta.** Parpadeo irregular (2,2–6,4 s, a veces doble) y
  squash-and-stretch al tocarlo.
- **Deriva.** Sin cursor cerca, mira despacio alrededor con dos senos
  desfasados para que no se note el ciclo.
- **Tres paletas** desde variables CSS, sin redibujar nada.
- **Tema oscuro.** La tinta del cuerpo se levanta sobre fondo oscuro, y el
  marco de los anteojos tiene tinta propia más oscura para no fundirse con la
  piel.
- **Varias vueltas de dibujo** hasta que el pingüino quedó: busto en vez de
  cuerpo entero, anteojos de aro fino en vez de masa negra, base plana del
  lente, patillas por detrás del auricular, silueta un 5% más angosta.

### 2. La ventana

- **Electron transparente**, sin marco, siempre encima, apoyada sobre la barra
  de tareas y arrastrable a cualquier lado. Se acuerda de dónde la dejaste.
- **Sigue el mouse de toda la pantalla**, no sólo el de su ventana: el proceso
  principal le pasa la posición global del cursor.

### 3. El puente con Claude Code

- **Hooks → archivo → ventana.** Sin red, sin puertos, sin leer el transcript.
- **Cinco eventos**: `SessionStart`, `UserPromptSubmit`, `Notification`,
  `Stop`, `SessionEnd`.
- **`PreToolUse` descartado a propósito**: con `matcher: "*"` lanzaría un
  proceso Node por cada llamada a herramienta de cada sesión.
- **Varias sesiones a la vez**: alcanza con que una esté laburando.

### 4. Los estados

- **Trabajando**: notebook abierta, tecleo con las dos aletas, ojos clavados en
  el teclado.
- **Pensando**: levanta la vista. Alterna solo con el anterior, con tiempos
  irregulares.
- **Terminó**: globo de diálogo con el proyecto y cuánto tardó, más un salto.
- **Te espera**: globo cuando Claude Code pidió permiso y el turno está frenado.

### 5. El ciclo de vida

- **Lo abre `SessionStart`** y se cierra solo 25 s después de que se va la
  última sesión — nunca mientras está mostrando el globo de «terminó».
- **`working` y `waiting` también lo levantan**, por si se cayó o por si
  agregaste los hooks con una sesión ya abierta.
- **Cerrarlo a mano lo silencia** hasta la próxima sesión: si lo cerraste vos,
  el hook no te lo devuelve en el prompt siguiente.
- **Un `pet.lock` con el PID** evita levantar un Electron al pedo por cada
  sesión nueva.

### 6. Notebooks intercambiables

- **Registro aparte del de avatares.** La máquina sobre la que trabaja el
  avatar es un dato del usuario, no del dibujo: un avatar nuevo hereda las diez
  que existen sin escribir una línea.
- **Son colores, no siluetas.** A 60 px de tapa, lo que distingue una MacBook
  de una ThinkPad es el color y el logo. Por eso sumar «la HP gris» cuesta una
  línea, y por eso si alguna vez hace falta una silueta propia conviene que sea
  un avatar, no un device.
- Diez de fábrica: MacBook en tres colores, ThinkPad, IdeaPad, HP en dos,
  Samsung, Dell y una sin marca.

### 7. Skills para diseñar

- **`avatar-designer`** y **`device-designer`** en `.claude/skills/`. Cuando
  otro usa Claude Code para dibujar un avatar, su Claude lee qué tiene que
  comunicar cada estado — no sólo qué métodos exponer — y los errores de dibujo
  que rompen la ventana.

### 8. El sistema de avatares

- **Registro con contrato** (`setState` / `look` / `poke` / `destroy`). El pet
  no menciona a ningún avatar por nombre en ningún lado.
- **El panel se llena solo** desde el registro: avatares y paletas.
- Documentado en [AVATARS.md](AVATARS.md).

### 9. Los controles

- **Aparecen al pasar por encima del dibujo**, no del rectángulo de la ventana.
- **Panel de ajustes** con tamaño, avatar y paleta. Mide siempre lo mismo en
  los tres tamaños, y abre arriba del pingüino para no tapar los botones.
- **Click-through**: la ventana ignora el mouse salvo sobre algo pintado, así
  que no tapa clicks del escritorio.

### 10. El cuerpo canónico y los módulos

- **El device se dibuja solo.** Antes aportaba color y logo pero la silueta la
  dibujaba el avatar, así que cada avatar nuevo tenía que inventar su propia
  notebook. Ahora la máquina es un objeto entero y el avatar sólo le presta el
  hueco; lo único suyo son las manos.
- **El cuerpo es canónico.** De la clavícula para abajo todos los avatares son
  idénticos, servidos por `core/body.js`. La geometría se pide, no se copia.
  Eso es lo que permite que cualquier máquina calce en cualquier avatar.
- **La cabeza tiene caja y los accesorios tienen techo.** La forma del cráneo
  es libre; el tamaño no. Orejas, cuernos o colas pueden salirse, hasta el
  borde del viewBox.
- **Cinco módulos** con las dependencias en un solo sentido: `core` no sabe de
  nadie, `avatars` y `devices` dependen de `core`, `app` los usa a los tres y es
  el único que sabe de Claude Code, `demo` monta un avatar suelto.

### 11. Durmiendo por límite de uso

- **La hora sale del statusline, y de ningún otro lado.** Ningún hook la trae y
  Claude Code no la guarda: el dato aparece una sola vez, en el JSON que le
  pasa al comando de statusline. Por eso el pet trae el suyo, que publica la
  cuota y delega en el que ya tenías.
- **Sin statusline se entera a medias.** Si Claude Code menciona el límite en
  el texto de un aviso, el pet se duerme igual pero muestra «OOT» sin hora. No
  la inventa.
- **Tiene prioridad sobre todo lo demás**: si no hay tokens, no está
  trabajando ni terminó — está dormido.

### 12. El latido del turno

- **Ctrl+C no dispara ningún hook.** Ni `Stop` ni `StopFailure`: la sesión
  quedaba marcada como trabajando y el avatar tecleaba para siempre.
- **El transcript es el único rastro.** La primera versión miraba el silencio:
  25 s sin que el archivo creciera y el turno se daba por muerto.
- **El silencio confundía dos cosas distintas.** Un turno cortado y un turno
  pensando se ven igual desde afuera: un bloque de razonamiento largo no
  escribe una línea en minutos, y el pet anunciaba «Terminó» en medio del turno
  para después volver a teclear.
- **Ahora la señal es el corte explícito.** Al interrumpir, Claude Code cierra
  el transcript con una entrada `[Request interrupted by user]`. Eso no se
  presta a confusión y no hay que esperar nada para verlo.
- **El silencio quedó de red, a 3 minutos.** Es mejor teclear de más un rato
  que anunciar un final que no pasó: el globo de fin es lo único que el usuario
  lee como un hecho.

### 13. Empaquetado y release

- **Instaladores para los tres sistemas**: `.exe` e instalador para Windows,
  `.dmg` para macOS en Apple Silicon e Intel, `.AppImage` y `.deb` para Linux.
- **Cada plataforma se compila en la suya.** Un `.dmg` necesita macOS: no es
  una limitación del proyecto sino del formato. Por eso el release se arma en
  GitHub Actions con un runner por sistema.
- **El paquete se movió a la raíz.** electron-builder no puede empaquetar nada
  fuera de su directorio, y la app usa `core/`, `avatars/` y `devices/`.
- **El hook encuentra la app instalada** por un `app-path.json` que la ventana
  escribe en cada arranque: empaquetada no hay `node_modules` al lado del hook.
- **Botón derecho → copiar configuración de hooks.** Instalada desde un `.exe`
  nadie sabe dónde quedó `hook.js`; la app arma el bloque con sus propias rutas.
- **Electron al día.** La versión que traíamos tenía avisos de severidad alta;
  actualizar a la última los deja en cero. Es la dependencia que define la
  superficie de ataque del proyecto.

---

## Falta

### Más avatares

El sistema está listo, documentado y con skills que lo enseñan, pero por ahora
hay un avatar solo. El pingüino es la prueba de que el contrato alcanza.

### Ideas sueltas

- Que el globo diga qué herramienta está usando. `hook.js tool` ya lee
  `tool_name`; es sumar el evento sabiendo lo que cuesta en procesos.
- Un desplegable propio en el panel: el del `<select>` lo dibuja el sistema
  operativo y no sigue el estilo de la ventana.
- Contador de sesiones cuando hay más de una laburando.
