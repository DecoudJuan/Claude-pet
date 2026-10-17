# Claude Pet

Mascota de escritorio (Electron) que refleja el estado de Claude Code: teclea mientras trabaja, avisa cuando termina o
cuando espera una respuesta, y se duerme si se acaba la cuota. El avatar es un módulo intercambiable.

## Stack
- Electron `^44`, Node 18+ (CI en Node 20), JavaScript CommonJS sin framework ni bundler.
- electron-builder para los instaladores (Windows, macOS, Linux).

## Comandos
```bash
npm install     # baja Electron (~200 MB)
npm start       # abre la mascota
npm test        # node test/run.js: un proceso por test/*.test.js, sin Electron
npm run pack    # electron-builder --dir
npm run dist    # instaladores en release/ (cada sistema compila el suyo)
```
Abrir `demo/index.html` en el navegador muestra un avatar suelto, sin Electron: sirve para iterar un dibujo.

## Estructura
- `core/` contrato compartido: `body.js`, `avatars.js`, `devices.js`, `greeting.js`, `rig.js`.
- `avatars/<id>/` `draw.js` (SVG a mano) + `avatar.js` (`register()`). Doce avatares.
- `devices/laptops.js` notebooks.
- `app/` Electron: `main.js`, `preload.js`, `window.html`/`window.js`, `hook.js`, `statusline.js`, `quota.js`,
  `sessions.js`, `setup.js`, `turn.js`, `update.js`.
- `test/` tests en Node pelado. `docs/arquitectura.md` explica el flujo hook -> ventana.
- `.claude/skills/` skills `avatar-designer` y `device-designer`.

## Convenciones
- Dependencias en un solo sentido: `core` no conoce a nadie, `avatars` y `devices` dependen sólo de `core`, `app` usa
  los tres. Un avatar no menciona a otro por nombre: se registra y se encuentra por el registro.
- Sumar un avatar es una carpeta en `avatars/` y dos `<script>` en `app/window.html`; no se toca el pet. Ver `AVATARS.md`.
- La lógica que se rompe (proyección de sesiones, cuota, setup, update) vive en funciones puras fuera de Electron y
  con test en `test/`.
- `hook.js` sale siempre con 0 y sin escribir en stdout. La CSP de la ventana no admite scripts inline.
- Comentarios y textos en español rioplatense. Cambio de comportamiento, test al lado. Versión en `package.json`.
- Sólo se aceptan mascotas y notebooks nuevas; ver `CONTRIBUTING.md`.

## Git
Commits y PRs sin atribución a Claude: nada de `Co-Authored-By: Claude` ni "Generated with Claude Code".
Commits convencionales (`fix(pet): ...`, `chore: 1.4.3`). Un release sale al empujar un tag `v*`.
