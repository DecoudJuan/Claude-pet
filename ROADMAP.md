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

### 14. Doce mascotas y el armazón compartido

- **De tres a doce.** A pingüino, nutria y oso se sumaron cangrejo, hámster,
  topo, ratita, pulpo, gato, búho, murciélago y una taza de café. Tres de ellos
  probaron que el contrato daba para más de lo previsto: el pulpo teclea con
  cuatro brazos en contratiempo, la taza no es un animal —el sistema nunca pidió
  un bicho— y apaga el vapor cuando no hay tokens, y el murciélago se envuelve
  en las alas para dormir.
- **`core/rig.js`.** Eran 250 de las ~490 líneas de cada avatar, escritas una
  vez por avatar: el bucle, la mirada, el parpadeo, el tecleo, entrar y salir.
  Un avatar nuevo son ahora 130 a 180 líneas de dibujo.

### 15. Varias sesiones, contadas de verdad

- **`app/sessions.js`.** La proyección de N sesiones a una escena, fuera de
  Electron. El test que la cubría copiaba a mano los selectores de `main.js` y
  avisaba en un comentario que era un espejo; ahora usa los de verdad.
- **La pose es del conjunto y el aviso es de una.** La sesión que terminaba
  mientras otra seguía laburando no lo anunciaba nunca.
- **El panel de sesiones**: todas las abiertas, en qué anda cada una y desde
  cuándo.

### 16. El paso que falta

- **El problema no era técnico.** El que bajaba el `.exe` tenía un pingüino que
  no se enteraba de nada, y la única forma de resolverlo era saber que los hooks
  existían, encontrar `settings.json` y fusionar JSON a mano. Mucha gente
  terminaba pidiéndole a Claude que se lo instalara — que funciona, pero es una
  respuesta rara para un adorno.
- **Ahora el pet lo pregunta solo.** Sin los hooks puestos abre un panel con el
  paso que falta y un botón que lo hace. `app/setup.js` fusiona: deja backup, no
  pisa hooks ajenos, no toca un `statusLine` propio —lo envuelve y se lo
  delega— y aborta si el JSON está roto, porque pisarlo sería borrar a ciegas.
- **Reconocerse por la forma y no por la ruta.** Instalación movida de una copia
  del repo a un `.exe`: el bloque viejo no coincidía con la ruta nueva y
  quedaban los dos puestos, disparando todo dos veces. Ahora también se reconoce
  la forma del comando.
- **Los paneles se cierran solos.** Abiertos de un click y abandonados, se
  quedaban tapando media ventana. A los tres segundos sin que pases por encima,
  fade y afuera. El de *Falta un paso* tiene su ✕ en vez de eso: no es una
  consulta de pasada.

### 17. Avisar que salió una versión nueva

- **Estabas en la 1.0.0 y no lo sabías.** El release se publica en GitHub desde
  la 1.0.0, pero nada en la app lo miraba: la única forma de enterarse era ir a
  buscarlo.
- **Se eligió el camino barato a propósito.** `electron-updater` sólo sirve en
  Windows y en el AppImage —el `.deb` no soporta auto-update y macOS necesita
  firma—, así que el chequeo simple había que escribirlo igual para dos de los
  cinco canales. Un solo camino de código, cero dependencias nuevas, y funciona
  en los cinco.
- **Y se apaga de verdad.** Es la primera vez que el proyecto toca la red, y
  `SECURITY.md` decía «ni una petición». Apagado son cero llamados, no un
  llamado descartado: hay un test que lo verifica contando invocaciones.
- **La primera versión del aviso no servía, y se vio recién en pantalla.** Doce
  segundos de globo blanco y negro, una sola vez por versión y para siempre: si
  en esos doce segundos no estabas mirando la esquina, te enterabas nunca. Y el
  globo decía «clic acá para bajarla» con el clic muerto — la ventana sólo se
  vuelve interactiva sobre lo pintado del avatar, así que ahí seguía siendo
  click-through y el clic se lo comía la ventana de atrás. El arreglo fue que SE
  VEA, no que insista: color de acento, cabeceo, el avatar pega el salto,
  treinta segundos y su propia ✕ — y se sigue diciendo una sola vez por versión.
  El globo de siempre sigue sin atrapar el mouse: es un cartel que se lee, y
  está arriba del avatar tapando un pedazo grande de escritorio.

### 18. Tests y CI

- **La suite corría cuando alguien se acordaba.** Desde que `core/rig.js` es el
  armazón de los doce avatares, romperlo los rompe a todos de una. Ahora corre
  en cada push, en los tres sistemas, sin bajar el binario de Electron.
- **Tres archivos nuevos**, y los dos primeros cubren lo que más caro sale
  equivocar: `setup.test.js` (lo que NO hay que pisar del settings.json ajeno),
  `update.test.js` (que 1.10.0 sea mayor que 1.9.0, y que apagado sean cero
  pedidos) y `quota.test.js` (un archivo que escribe otro proceso y puede llegar
  viejo, a medio escribir o con formas imprevistas).

---

## Falta

### Ideas sueltas

- Que el globo diga qué herramienta está usando. `hook.js tool` ya lee
  `tool_name`; es sumar el evento sabiendo lo que cuesta en procesos.
- Un desplegable propio en el panel: el del `<select>` lo dibuja el sistema
  operativo y no sigue el estilo de la ventana.
- **Firmar los instaladores.** Hoy Windows muestra SmartScreen y macOS
  Gatekeeper a todo el que los baje. Es plata —99 USD al año de Apple, unos 200
  de Windows— y es la barrera número uno para el que no te conoce.
- **Auto-update de verdad**, si alguna vez hay firma: la mitad del trabajo
  —comparar versiones, el interruptor, la política de no molestar— ya está
  hecha en `app/update.js`.
