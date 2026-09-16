# Aportar

Gracias por pasar. Lo más importante es también lo más corto:

> **Este repo acepta mascotas y notebooks. Lo demás, casi seguro que no.**

No es desconfianza ni ganas de cerrarle la puerta a nadie. El pet es un adorno
chico a propósito, lo mantiene una sola persona, y casi todo lo que parece raro
adentro del código es la cicatriz de algo que se rompió — está contado en
[ROADMAP.md](ROADMAP.md). Un PR que toca esas partes cuesta más de revisar que
de escribir, y no quiero que pierdas la tarde para recibir un «no».

El sistema de avatares existe justamente para que eso no sea un problema: **un
avatar nuevo no toca ni una línea del pet**. Ahí sí, todo lo que traigas entra.

---

## Lo que sí

- **Una mascota nueva.** Es el aporte estrella y el que el repo está armado
  para recibir.
- **Arreglar o mejorar una que ya está.** Que el gato parpadee mejor, que al
  pulpo le calce la notebook, lo que veas.
- **Una notebook nueva**, o una variante de color de las que hay.
- **Erratas y documentación.** Si algo de los `.md` miente o quedó viejo,
  mandalo.

## Lo que probablemente no

- **Funciones nuevas del pet** (la ventana, los hooks, los globos, el panel).
- **Reescrituras, cambios de estilo, tipar todo, sumar un framework o una
  dependencia.** El proyecto tiene una sola dependencia de runtime —Electron— y
  esa es la idea.
- **Empaquetado, CI, configuración.**

**¿Encontraste un bug?** Abrí un [issue](https://github.com/DecoudJuan/Claude-pet/issues),
no un PR. Si ya sabés cómo arreglarlo, mejor todavía: contalo en el issue. Si el
diagnóstico cierra te digo que sí ahí mismo y recién entonces escribís el
código, sabiendo que se va a mergear.

---

## Sumar una mascota

El paso a paso largo, con el contrato y el esqueleto que anda, está en
[AVATARS.md](AVATARS.md). Resumido:

```bash
git clone https://github.com/DecoudJuan/Claude-pet.git
cd Claude-pet && npm install
```

1. **Una carpeta**: `avatars/<id>/draw.js` (el dibujo, que no sabe que el pet
   existe) y `avatars/<id>/avatar.js` (el `register()`).
2. **Dos `<script>`** en `app/window.html`, en la sección de catálogo.
3. **Iterá el dibujo en `demo/index.html`**, que lo monta suelto, sin Electron
   ni hooks.
4. **`npm start`** para verlo en la ventana de verdad, con los estados reales.

No hay paso 5: el panel se llena solo desde el registro.

Si trabajás con Claude Code, el repo trae la skill **`avatar-designer`**, que le
explica qué tiene que *comunicar* cada estado —no sólo qué métodos exponer— y
qué errores de dibujo rompen la ventana.

### Antes de abrir el PR

- [ ] **El dibujo es tuyo.** Nada de personajes con dueño: ni Pikachu, ni Mario,
      ni el logo de nadie. Lo que entra queda bajo MIT, y con un personaje ajeno
      eso no se puede hacer.
- [ ] **Los siete estados hacen algo distinto** y se entienden sin leyenda:
      `idle`, `working`, `thinking`, `waiting`, `sleeping`, `greeting`,
      `farewell`.
- [ ] **Cuadrado, apoyado abajo, escalable.** Se monta a 152 y a 224 px sin
      retocar nada, y el aire va arriba, no abajo.
- [ ] **`destroy()` suelta todo**: timers, `requestAnimationFrame`, listeners.
      Cambiar de avatar veinte veces no puede dejar veinte bucles corriendo.
- [ ] **Sin dependencias, sin listeners globales, sin red.**
- [ ] **`npm test` en verde.**
- [ ] Probado en `demo/index.html` **y** en `npm start`.

## Sumar una notebook

Una línea en `devices/laptops.js`: un `id`, un nombre, el color de la tapa y el
logo. Nada más — cualquier avatar hereda todas las notebooks sin escribir una
línea. La skill **`device-designer`** hace justo esto.

---

## Cómo se escribe acá

Mirá el archivo de al lado y escribí como él. Lo que no se negocia:

- **Cero dependencias de runtime.** Si necesitás una librería para dibujar una
  mascota, probablemente la mascota sea demasiado.
- **La ventana corre con una CSP sin `unsafe-inline` y `connect-src 'none'`.**
  Nada de `innerHTML` con datos, nada de `eval`, `Function()` o `import()`
  dinámico, nada de `fetch`. Un avatar no necesita nada de eso, y lo que lo
  necesite no entra.
- **Los comentarios explican el *porqué*, no el qué.** Vas a ver comentarios
  largos por todos lados: no son adorno, son la razón por la que ese código es
  raro. Si sacás una cicatriz, contá cuál.
- **En castellano**, comentarios y mensajes de commit. El código en inglés,
  como está.
- **Commits tipo `feat(avatar): el zorro`** o `fix(avatar): al gato se le iba
  la pupila`. Primera línea corta; abajo, qué se rompía.

## Probar

```bash
npm test      # la suite entera, sin bajar Electron
npm start     # la ventana de verdad
npm run dist  # tu propio instalador, con tu avatar adentro
```

## Licencia

Mandando un PR aceptás que tu aporte se publique bajo la
[licencia MIT](LICENSE) del proyecto.

## Y lo obvio

Vale para issues, PRs y comentarios: el
[código de conducta](CODE_OF_CONDUCT.md). Es el estándar de siempre y se resume
en tratar bien a la gente.
