<div align="center">

# Claude Pet

**Una mascota de escritorio que sabe qué está haciendo Claude Code. Teclea
mientras itera, levanta la vista cuando piensa, y te saca un globo de diálogo
cuando termina — así dejás de mirar la terminal para ver si ya está.**

**El avatar es tuyo.** Viene con un pingüino, una nutria y un oso, pero el
dibujo es un módulo aparte: cualquiera puede escribir el suyo y elegirlo desde el panel.

[![License: MIT](https://img.shields.io/badge/license-MIT-d9b45f)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20·%20macOS%20·%20Linux-1f2430)](#instalar)
[![Runtime](https://img.shields.io/badge/runtime-Electron-4a6fa5)](pet/package.json)
[![Dependencias del dibujo](https://img.shields.io/badge/dependencias%20del%20dibujo-0-2b6e4f)](avatars/penguin/draw.js)
[![Red](https://img.shields.io/badge/red-cero%20peticiones-2b6e4f)](SECURITY.md)

</div>

## 🐧 Mandá un PR con tu propia mascota

El pingüino, la nutria y el oso son los primeros, no los únicos. **Si dibujaste
una y anda, mandala**: es una carpeta en `avatars/`, dos `<script>` en
`app/window.html` y nada más — el pet no menciona a ninguna por nombre, las
encuentra en un registro, así que no hay que tocarlo.

Y no empezás de cero: el repo trae una skill que le explica a Claude Code el
contrato, qué tiene que comunicar cada estado y qué errores de dibujo rompen la
ventana.

**→ [Cómo crear un avatar](AVATARS.md)** · [abrir un
PR](https://github.com/DecoudJuan/Claude-pet/compare)

## El problema

Le mandás un prompt a Claude Code y te vas a otra ventana. Cinco minutos
después volvés a mirar: seguía trabajando. Volvés otra vez: había terminado
hace tres minutos, o peor, te está esperando desde hace tres minutos porque
pidió permiso para algo.

La terminal ya te lo dice, pero sólo si la estás mirando. Esta mascota vive en
una esquina del escritorio y te lo dice sin que la mires.

## Qué hace

- **Teclea mientras Claude Code itera.** Saca la notebook, clava los ojos en el
  teclado y tipea.
- **Levanta la vista cuando piensa.** Cada tanto deja de tipear y mira al techo,
  como si estuviera buscando la idea. Alterna solo, con tiempos irregulares.
- **Te avisa cuando termina** con un globo de diálogo: el proyecto y cuánto
  tardó. Y pega un salto, por si no lo estabas mirando.
- **Te avisa cuando te espera**, que es el caso que más caro sale: el turno está
  frenado hasta que contestes. El globo dice *qué* está pidiendo — «Claude needs
  your permission to use Bash» — y cabecea cada tantos segundos para que se note
  de reojo. Y no guarda la notebook: sigue a mitad de tarea, despega las manos
  del teclado y te busca a vos.
- **Sigue el mouse por toda la pantalla** cuando no está laburando. No sólo
  dentro de su ventana: el proceso principal le pasa la posición global del
  cursor, así que te mira desde la esquina.
- **Se duerme cuando te quedás sin tokens.** Cierra los ojos, guarda la
  notebook y avisa a qué hora vuelve. Es el caso donde más molestaba lo
  contrario: seguir tecleando delante de una terminal que no puede avanzar.
- **Saluda al llegar y se despide al irse.** Asoma desde abajo con un «Hi!» y,
  antes de cerrarse, dice «Bye!» y se hunde por donde vino. Dos segundos cada
  uno: el pet aparece y desaparece solo, y así se nota que fue él.
- **Se deja tocar.** Un click y salta.
- **Se elige todo desde el panel**: el avatar, su paleta, la notebook sobre la
  que trabaja y el tamaño.
- **Vive lo que dura Claude Code.** Lo abre el hook `SessionStart` y se cierra
  solo 25 segundos después de que se va la última sesión. No arranca con
  Windows ni queda dando vueltas.

### Con varias sesiones abiertas

Es el caso normal — dos o tres terminales a la vez — y el pet es uno solo, así
que tiene que resumir sin borrar lo que importa. Separa dos cosas:

- **La pose es del conjunto.** Si alguna espera, el pet espera; si alguna
  labura, teclea. Manda la que no puede avanzar sola: un permiso sin contestar
  le gana a cualquier cosa, y de dos permisos abiertos habla el que espera hace
  más rato — no el que quedó primero en el directorio.
- **El aviso es de una.** «Terminó» dice **cuál** terminó, cuánto tardó y
  cuántas siguen laburando. Sale aunque las otras sigan: el avatar teclea y el
  globo cuenta el final ajeno.

Dos terminales en el mismo repo se distinguen por la rama, y si también es la
misma, por orden de antigüedad (`claude-pets #1`, `claude-pets #2`).

Y si querés ver a todas y no sólo a la que manda, el botón de la lista abre el
panel de **sesiones**: una fila por cada una, con el punto lleno si avanza y
hueco si no, y desde cuándo labura.

```
SESIONES
● darwin-errors                 te espera
● claude-pets #1               1 min 35 s
● claude-pets #2                      8 s
○ prompt-me                     en reposo
```

Una sesión que se queda sin tokens no duerme al pet si otra está laburando —
con dos cuentas abiertas lo normal es justamente eso.

## Cómo se entera

No lee el transcript, no abre puertos, no habla con nadie por la red. Los
**hooks** de Claude Code dejan el estado de cada sesión en un archivo y la
ventana lo vigila:

```
Claude Code ──hook──> %LOCALAPPDATA%\claude-pets\sessions\<session_id>.json ──> pet
```

Cada evento escribe un `state` (`working`, `waiting`, `idle`) más el `cwd` y
los tiempos. El proceso principal poll­ea ese directorio cada 600 ms y le pasa
lo que encuentra a `app/sessions.js`, que proyecta las N sesiones a una pose y
un aviso. Esa proyección vive fuera de Electron a propósito: es la regla que
más se rompe y así se puede testear sin levantar la app.

`hook.js` sale siempre con código 0 y sin escribir nada en stdout, incluso si
falla. El pet es decorativo: no tiene por qué romperte un turno.

**A propósito no hay hook de `PreToolUse`.** Con `matcher: "*"` lanzaría un
proceso Node en cada llamada a herramienta de cada sesión — decenas por turno,
unos 50 ms de arranque cada uno. Para saber si está laburando alcanza con el
par `UserPromptSubmit` / `Stop`.

## Instalar

### Con el instalador

Bajá el de tu sistema desde
[**releases**](https://github.com/DecoudJuan/Claude-pet/releases/latest):

| | |
|---|---|
| **Windows** | `Claude Pet Setup x.y.z.exe` — instalador. O `Claude Pet x.y.z.exe`, portable, que no instala nada. |
| **macOS** | `.dmg` — hay uno para Apple Silicon (arm64) y otro para Intel (x64). |
| **Linux** | `.AppImage` para cualquier distro, o `.deb` para Debian y Ubuntu. |

**No están firmados**, porque firmar cuesta plata: un certificado de Apple son
99 USD al año y uno de Windows unos 200. Así que el sistema te va a avisar la
primera vez.

- **Windows** — «Windows protegió tu PC» → *Más información* → *Ejecutar de
  todas formas*.
- **macOS** — click derecho sobre la app → *Abrir* → *Abrir*. Con doble click
  no te deja; con click derecho sí.
- **Linux** — al AppImage hay que darle permiso: `chmod +x Claude*.AppImage`.

Si eso te incomoda, compilalo vos: las instrucciones están abajo y el resultado
es el mismo binario.

### Desde el código

```bash
git clone https://github.com/DecoudJuan/Claude-pet.git
cd Claude-pet
npm install
npm start
```

Necesita Node 18+. `npm install` baja Electron, que son unos 200 MB.

Arrancado así se queda hasta que lo cierres vos. Lanzado por el hook se cierra
solo cuando no quedan sesiones.

### Compilar tu propio ejecutable

Es lo que vas a querer si le agregás un avatar:

```bash
npm run dist          # el de tu sistema operativo
npx electron-builder --win     # o el que quieras, con sus límites
```

Los binarios salen en `release/`.

**Cada sistema compila el suyo.** Un `.dmg` necesita macOS y un `.AppImage`
necesita Linux — no es una limitación nuestra sino de los formatos. Por eso los
releases se arman en GitHub Actions, una plataforma por runner: está en
`.github/workflows/release.yml` y se dispara con un tag `v*`.

## Configurar

Los hooks van en `~/.claude/settings.json` y afectan a todas tus sesiones.

**Si lo instalaste, no busques la ruta a mano:** botón derecho sobre el pet →
*Copiar configuración de hooks*. La app arma el bloque con sus propias rutas y
te lo deja en el portapapeles, listo para pegar.

Si trabajás desde el repo, cambiá la ruta por la tuya:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" start",   "async": true, "timeout": 10 }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" working", "async": true, "timeout": 5 }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" waiting", "async": true, "timeout": 5 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" done",    "async": true, "timeout": 5 }] }
    ],
    "StopFailure": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" done",    "async": true, "timeout": 5 }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/app/hook.js\" end",     "async": true, "timeout": 5 }] }
    ]
  }
}
```

`async: true` es importante: así el hook no le suma latencia a ningún turno.

Si agregás los hooks con una sesión ya abierta, esa sesión no los va a tomar.
Abrí `/hooks` una vez (recarga la config) o arrancá una nueva.

Para sacarlo, borrás el bloque `"hooks"`. El estado queda en
`%LOCALAPPDATA%\claude-pets\` y la configuración de la ventana en
`%APPDATA%\claude-pet\pet.json`.

## El límite de uso

Para que el pet sepa que te quedaste sin tokens hace falta un paso más, y vale
explicar por qué.

**Ningún hook trae ese dato.** Claude Code tampoco lo guarda en ningún archivo.
Aparece una sola vez: en el JSON que Claude Code le pasa al comando de
statusline, como `rate_limits.five_hour.resets_at`. Así que el pet tiene que
estar en esa cadena.

En `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"C:/ruta/a/Claude-pet/app/statusline.js\""
  }
}
```

**No perdés el statusline que ya tenías.** Pasalo como argumento y el del pet
se lo delega, con el mismo stdin:

```json
"command": "node \"C:/ruta/a/Claude-pet/app/statusline.js\" -- bash ~/.claude/mi-statusline.sh"
```

Sin esto el pet funciona igual, sólo que se entera del límite a medias: si
Claude Code lo menciona en el texto de un aviso, se duerme igual pero muestra
**«OOT — Out of Tokens»** sin hora, porque no la tiene. No inventa una.

## Manejarlo

| | |
|---|---|
| **Arrastrar** | Lo llevás a cualquier lado. Se acuerda de dónde lo dejaste. |
| **Click** sin arrastrar | Lo tocás y salta. |
| **Hover sobre el dibujo** | Aparecen tres botones apilados al costado. |
| **☰** | Panel de sesiones: todas las abiertas, en qué anda cada una y desde cuándo. |
| **⋯** | Panel de ajustes: tamaño, avatar, paleta y notebook. |
| **✕** | Lo cierra. Vuelve cuando arranques de cero, no en el próximo prompt ni porque abras otra terminal al lado. |
| **Botón derecho** | Menú nativo: volver abajo a la izquierda, sacar el «siempre encima», abrir la carpeta de estado, salir. |

Los botones van a la izquierda y saltan a la derecha si la ventana quedó pegada
al borde izquierdo de la pantalla. El panel abre **arriba** del avatar para no
taparlos, y mide siempre lo mismo (228 × 254) en los tres tamaños.

### Por qué no te come los clicks

La ventana es un rectángulo transparente bastante más grande que el dibujo. Si
atajara el mouse en toda su superficie taparía clicks del escritorio y se
activaría con sólo pasar cerca. Así que vive ignorando el mouse
(`setIgnoreMouseEvents(true, { forward: true })`) y el renderer la despierta
sólo cuando el puntero está sobre algo **pintado**: la caja del avatar tiene
`pointer-events: none` y los trazos del SVG `visiblePainted`, así que
`elementFromPoint` devuelve al avatar únicamente si estás encima de él.

## Un avatar propio, y tu propio ejecutable

El circuito completo, que es la razón por la que el repo importa tanto como el
instalador:

```bash
git clone https://github.com/DecoudJuan/Claude-pet.git
cd Claude-pet && npm install

# 1. tu avatar: una carpeta con el dibujo y su registro
#    avatars/<id>/draw.js  y  avatars/<id>/avatar.js
# 2. los dos <script> en app/window.html
# 3. probalo suelto, sin Electron, abriendo demo/index.html
npm start             # 4. y en la ventana de verdad

npm run dist          # 5. tu propio instalador, con tu avatar adentro
```

El paso 1 no lo hacés a ciegas: el repo trae una skill que le explica a Claude
Code qué tiene que comunicar cada estado y qué reglas de dibujo rompen la
ventana. Ver [AVATARS.md](AVATARS.md).

## Avatares y notebooks

El pet no sabe dibujar. Le pide a un **avatar** que se monte y le avisa en qué
estado está Claude Code; el avatar decide cómo se ve eso. El pingüino, la
nutria y el oso son los que vienen incluidos, no los únicos: en el código del pet no
aparece ninguno por nombre, los encuentra en un registro.

Sumar uno es un archivo que se registra y cuatro métodos que cumplir
(`setState`, `look`, `poke`, `destroy`). El panel se llena solo. Los estados
que recibe son siete: los cinco de la sesión —`idle`, `working`, `thinking`,
`waiting`, `sleeping`— más la entrada y la salida, `greeting` y `farewell`.

La **notebook** es un objeto aparte, no un adorno del avatar: **se dibuja
sola**. El avatar deja un hueco y el device se pinta adentro — tapa, logo y
todo. Vienen diez: MacBook en tres colores, ThinkPad, IdeaPad, HP, Dell,
Samsung y una sin marca.

Eso funciona porque **el cuerpo es canónico**: de la clavícula para abajo todos
los avatares son idénticos, misma forma y mismo tamaño, así que cualquier
máquina calza en cualquier avatar sin que ninguno sepa del otro. Lo que cambia
de un avatar a otro es la cabeza, la cara, los colores y los accesorios.

**→ [Cómo crear e importar avatares](AVATARS.md)**

Si vas a diseñar uno con Claude Code, el repo trae dos skills que le explican
los estados, el contrato y los errores que rompen la ventana:

```
.claude/skills/avatar-designer/    diseñar un avatar
.claude/skills/device-designer/    agregar una notebook
```

## Estructura

```
Claude-pet/
│
├── core/                 El contrato. Lo único que todos comparten.
│   ├── body.js           El cuerpo canónico: el torso que usan todos los
│   │                     avatares y los anclajes de la notebook y las manos.
│   ├── avatars.js        El registro de avatares.
│   ├── devices.js        El registro de notebooks, y la silueta que dibujan.
│   └── greeting.js       El saludo: «Hi!», «Bye!» y cuánto duran. Lo miran la
│                         ventana, cada avatar y el proceso principal, que tiene
│                         que esperar a que el adiós se vea antes de cerrar.
│
├── avatars/              Los personajes. Una carpeta por avatar.
│   ├── penguin/
│   │   ├── draw.js       El dibujo: SVG a mano, sin API de imágenes. Sirve en
│   │   │                 cualquier página web, sin nada del resto.
│   │   └── avatar.js     El register() que lo declara ante el sistema.
│   └── otter/            Igual que el anterior: dibujo y registro.
│
├── devices/              Las máquinas.
│   └── laptops.js        Las diez que vienen de fábrica.
│
├── app/                  La aplicación de escritorio.
│   ├── main.js           Proceso principal: la ventana transparente, el
│   │                     arrastre, el vigía del estado, el ciclo de vida y el
│   │                     click-through.
│   ├── preload.js        El puente con contextIsolation.
│   ├── window.html       El marcado y el estilo de la ventana.
│   ├── window.js         Estados, globo, controles del hover y ajustes. Vive
│   │                     afuera del HTML porque la CSP no admite scripts
│   │                     inline.
│   ├── hook.js           Lo que ejecuta Claude Code en cada evento.
│   ├── statusline.js     El statusline del pet: publica la cuota y delega en
│   │                     el tuyo. Es la única puerta por la que entra el
│   │                     límite de uso — ningún hook lo trae.
│   ├── quota.js          Lee esa cuota y decide si hay que dormir.
│   ├── turn.js           El latido del turno. Ctrl+C no dispara ningún hook,
│   │                     así que se confirma contra el transcript: mientras
│   │                     crece, el turno vive.
│   └── package.json
│
├── demo/
│   └── index.html        El avatar suelto en una página, sin Electron ni
│                         hooks. El lugar para iterar un dibujo.
│
├── AVATARS.md            El contrato de avatares y cómo sumar uno.
├── ROADMAP.md            En qué orden se construyó esto y qué falta.
├── SECURITY.md           Qué guarda, qué no, y por qué está cerrado como está.
└── .claude/skills/       Skills para diseñar avatares y notebooks con Claude.
```

**Las dependencias van en un solo sentido.** `core` no sabe de nadie.
`avatars` y `devices` dependen sólo de `core`. `app` los usa a los tres y es la
única pieza que sabe que Claude Code existe — el dibujo de un avatar se puede
poner en cualquier página web con un `<div>` y dos líneas.

## Seguridad y privacidad

No habla con la red, no hace tracking y no lee tus conversaciones. Lo único que
guarda es, por sesión abierta, el directorio del proyecto y el estado — en tu
perfil local, y se borra cuando la sesión termina.

La ventana corre con sandbox, aislamiento de contexto y una CSP con
`connect-src 'none'`, así que ni un bug podría hacer una petición. El hook sale
siempre con 0 y sin escribir en stdout, para no poder romperte un turno.

**→ [Postura completa, qué se guarda y el repaso del OWASP Top 10](SECURITY.md)**

## Licencia

MIT.
