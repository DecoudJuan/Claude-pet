# Arquitectura

Claude Pet es una app de escritorio en Electron que muestra una mascota animada con el estado de Claude Code. Este
documento resume cómo está armado el código; el detalle por archivo está en la sección "Estructura" del
[README](../README.md).

## Capas

Las dependencias van en un solo sentido:

```
core/      el contrato compartido (cuerpo, registros, saludo, armazón de animación)
  ^
avatars/   un dibujo por carpeta, depende sólo de core
devices/   las notebooks sobre las que trabaja, depende sólo de core
  ^
app/       la aplicación Electron; usa las tres y es la única que sabe que existe Claude Code
```

- `core/` no conoce a nadie. `core/rig.js` es el armazón que comparten los avatares (bucle, mirada, parpadeo, tecleo,
  entrar y salir); romperlo rompe a todos, por eso la CI lo prueba en tres sistemas.
- `avatars/<id>/` tiene `draw.js` (SVG a mano, sin dependencias, usable en cualquier página) y `avatar.js` (el
  `register()` que lo declara ante el registro de `core/avatars.js`). Sumar un avatar no toca el código del pet; ver
  [AVATARS.md](../AVATARS.md).
- `devices/laptops.js` registra las notebooks y su silueta.
- `demo/index.html` abre un avatar suelto, sin Electron ni hooks, para iterar un dibujo.

## Flujo del estado

```
Claude Code --hook--> <LOCALAPPDATA>/claude-pets/sessions/<session_id>.json --> proceso principal --> ventana
```

1. Claude Code ejecuta `app/hook.js` en cada evento (`SessionStart`, `UserPromptSubmit`, `Notification`, `Stop`,
   `SessionEnd`). El hook escribe un archivo por sesión con `state` (`working`, `waiting`, `idle`), el `cwd` y los
   tiempos. Sale siempre con código 0 y sin escribir en stdout, para no poder romper un turno.
2. El proceso principal (`app/main.js`) lee ese directorio cada 600 ms y pasa lo que encuentra a `app/sessions.js`, que
   proyecta N sesiones abiertas a una sola escena (pose y aviso). Esa lógica vive fuera de Electron para poder testearla.
3. La ventana (`app/window.js`, cargada desde `app/window.html`) pinta la escena. Va en un archivo aparte porque la CSP
   no admite scripts inline. `app/preload.js` es el puente con `contextIsolation`.

Otras piezas del proceso principal:

- `app/turn.js`: Ctrl+C no dispara ningún hook, así que el latido del turno se confirma mirando si el transcript sigue
  creciendo.
- `app/quota.js` y `app/statusline.js`: el statusline del pet publica la cuota de uso y delega en el del usuario;
  `quota.js` decide si la mascota debe dormirse.
- `app/setup.js`: fusiona los hooks en el `settings.json` del usuario sin pisar lo que ya haya.
- `app/update.js`: el chequeo diario de versión contra la API pública de GitHub, con interruptor para apagarlo.

## Ciclo de vida

El hook `SessionStart` abre el pet si no está corriendo; se cierra solo unos segundos después de que se va la última
sesión, y también si el proceso dueño de una sesión ya no existe. No arranca con el sistema operativo.

## Seguridad

La ventana corre con sandbox, aislamiento de contexto y una CSP con `connect-src 'none'`. Lo único que sale a la red es
el chequeo de versión. La postura completa está en [SECURITY.md](../SECURITY.md).

## Tests y release

- `npm test` corre `test/run.js`, que lanza cada `test/*.test.js` en un proceso Node aparte, sin Electron.
- `.github/workflows/test.yml` corre la suite en Ubuntu, Windows y macOS en cada push y pull request.
- `.github/workflows/release.yml` compila con electron-builder en un runner por sistema al empujar un tag `v*` y sube
  los binarios al mismo release de GitHub.
