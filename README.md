<div align="center">

# Claude Pet

**Una mascota de escritorio que sabe qué está haciendo Claude Code. Teclea
mientras itera, levanta la vista cuando piensa, y te saca un globo de diálogo
cuando termina — así dejás de mirar la terminal para ver si ya está.**

[![License: MIT](https://img.shields.io/badge/license-MIT-d9b45f)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20·%20macOS%20·%20Linux-1f2430)](#instalar)
[![Runtime](https://img.shields.io/badge/runtime-Electron-4a6fa5)](pet/package.json)
[![Dependencias del dibujo](https://img.shields.io/badge/dependencias%20del%20dibujo-0-2b6e4f)](penguin-mascot.js)

</div>

## El problema

Le mandás un prompt a Claude Code y te vas a otra ventana. Cinco minutos
después volvés a mirar: seguía trabajando. Volvés otra vez: había terminado
hace tres minutos, o peor, te está esperando desde hace tres minutos porque
pidió permiso para algo.

La terminal ya te lo dice, pero sólo si la estás mirando. Este pingüino vive en
una esquina del escritorio y te lo dice sin que la mires.

## Qué hace

- **Teclea mientras Claude Code itera.** Saca una notebook, clava los ojos en
  el teclado y tipea con las dos aletas.
- **Levanta la vista cuando piensa.** Cada tanto deja de tipear y mira al techo,
  como si estuviera buscando la idea. Alterna solo, con tiempos irregulares.
- **Te avisa cuando termina** con un globo de diálogo: el proyecto y cuánto
  tardó. Y pega un salto, por si no lo estabas mirando.
- **Te avisa cuando te espera**, que es el caso que más caro sale: el turno está
  frenado hasta que contestes. El globo dice *qué* está pidiendo — «Claude needs
  your permission to use Bash» — y cabecea cada tantos segundos para que se note
  de reojo. El pingüino no guarda la notebook: sigue a mitad de tarea, despega
  las aletas del teclado y te busca a vos.
- **Sigue el mouse por toda la pantalla** cuando no está laburando. No sólo
  dentro de su ventana: el proceso principal le pasa la posición global del
  cursor, así que te mira desde la esquina.
- **Parpadea**, y una de cada cinco veces parpadea dos veces seguidas.
- **Se deja tocar.** Un click y salta.
- **Vive lo que dura Claude Code.** Lo abre el hook `SessionStart` y se cierra
  solo 25 segundos después de que se va la última sesión. No arranca con
  Windows ni queda dando vueltas.

Con varias sesiones abiertas alcanza con que una esté laburando para que
teclee; avisa cuando se apaga la última.

## Cómo se entera

No lee el transcript, no abre puertos, no habla con nadie por la red. Los
**hooks** de Claude Code dejan el estado de cada sesión en un archivo y la
ventana lo vigila:

```
Claude Code ──hook──> %LOCALAPPDATA%\claude-pets\sessions\<session_id>.json ──> pet
```

Cada evento escribe un `state` (`working`, `waiting`, `idle`) más el `cwd` y
los tiempos. El proceso principal poll­ea ese directorio cada 400 ms, proyecta
todas las sesiones a un único estado y se lo manda a la ventana.

`hook.js` sale siempre con código 0 y sin escribir nada en stdout, incluso si
falla. El pet es decorativo: no tiene por qué romperte un turno.

**A propósito no hay hook de `PreToolUse`.** Con `matcher: "*"` lanzaría un
proceso Node en cada llamada a herramienta de cada sesión — decenas por turno,
unos 50 ms de arranque cada uno. Para saber si está laburando alcanza con el
par `UserPromptSubmit` / `Stop`.

## Instalar

**No es un `.exe`.** Todavía no: hoy corre con Electron desde el repo. Empaquetarlo
está en el [roadmap](ROADMAP.md).

```bash
git clone https://github.com/DecoudJuan/Claude-pet.git
cd Claude-pet/pet
npm install
```

Necesita Node 18+. `npm install` baja Electron, que son unos 200 MB.

Para probarlo suelto, sin Claude Code:

```bash
npm start
```

Arrancado así se queda hasta que lo cierres vos. Lanzado por el hook se cierra
solo cuando no quedan sesiones.

## Configurar

Los hooks van en `~/.claude/settings.json` y afectan a todas tus sesiones.
Cambiá la ruta por la tuya:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/pet/hook.js\" start",   "async": true, "timeout": 10 }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/pet/hook.js\" working", "async": true, "timeout": 5 }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/pet/hook.js\" waiting", "async": true, "timeout": 5 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/pet/hook.js\" done",    "async": true, "timeout": 5 }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node \"C:/ruta/a/Claude-pet/pet/hook.js\" end",     "async": true, "timeout": 5 }] }
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

## Manejarlo

| | |
|---|---|
| **Arrastrar** | Lo llevás a cualquier lado. Se acuerda de dónde lo dejaste. |
| **Click** sin arrastrar | Lo tocás y salta. |
| **Hover sobre el dibujo** | Aparecen dos botones apilados al costado. |
| **⋯** | Panel de ajustes: tamaño, avatar y paleta. |
| **✕** | Lo cierra. Vuelve en la próxima sesión, no en el próximo prompt. |
| **Botón derecho** | Menú nativo: volver abajo a la izquierda, sacar el «siempre encima», abrir la carpeta de estado, salir. |

Los botones van a la izquierda y saltan a la derecha si la ventana quedó pegada
al borde izquierdo de la pantalla. El panel abre **arriba** del pingüino para no
taparlos, y mide siempre lo mismo (228 × 208) en los tres tamaños.

### Por qué no te come los clicks

La ventana es un rectángulo transparente bastante más grande que el dibujo. Si
atajara el mouse en toda su superficie taparía clicks del escritorio y se
activaría con sólo pasar cerca. Así que vive ignorando el mouse
(`setIgnoreMouseEvents(true, { forward: true })`) y el renderer la despierta
sólo cuando el puntero está sobre algo **pintado**: la caja del avatar tiene
`pointer-events: none` y los trazos del SVG `visiblePainted`, así que
`elementFromPoint` devuelve al pingüino únicamente si estás encima de él.

## Avatares

El pet no sabe dibujar. Le pide a un **avatar** que se monte y le avisa en qué
estado está Claude Code; el avatar decide cómo se ve eso. Sumar uno nuevo es un
archivo que se registra y cuatro métodos que cumplir.

**→ [Cómo crear e importar avatares](AVATARS.md)**

## Estructura

```
Claude-pet/
├── penguin-mascot.js     El dibujo. Un SVG a mano, sin dependencias, sin API de
│                         imágenes. Sabe seguir el cursor, parpadear, saltar y
│                         ponerse a tipear. Sirve solo en cualquier página web.
├── index.html            Demo del componente suelto: las tres paletas y cómo
│                         montarlo en tu propia página.
├── AVATARS.md            El contrato de avatares y cómo sumar uno.
├── ROADMAP.md            En qué orden se construyó esto y qué falta.
└── pet/
    ├── main.js           Proceso principal de Electron. La ventana transparente,
    │                     el arrastre, el vigía del directorio de estado, el
    │                     ciclo de vida y el click-through.
    ├── preload.js        El puente con contextIsolation. La única superficie
    │                     que la ventana ve del proceso principal.
    ├── pet.html          La ventana: estados del avatar, globo de diálogo,
    │                     controles del hover y panel de ajustes.
    ├── hook.js           Lo que ejecuta Claude Code. Escribe el estado de la
    │                     sesión y, si hace falta, levanta el pet.
    ├── avatars.js        El registro de avatares y su contrato.
    ├── avatars/
    │   └── penguin.js    El pingüino, envuelto como avatar.
    └── package.json
```

`penguin-mascot.js` no depende de nada del pet: se puede usar en una página
cualquiera con un `<div>` y dos líneas. El pet es un consumidor más.

## Licencia

MIT.
