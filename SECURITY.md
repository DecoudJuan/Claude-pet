# Seguridad

Claude Pet es un adorno que mira archivos locales. Esa frase es casi toda la
postura de seguridad, pero «casi» no alcanza cuando algo corre siempre encima
de tu escritorio y lee el estado de tus sesiones de trabajo. Esto es lo que
hace, lo que guarda y lo que decidimos cerrar.

---

## Lo corto

- **No habla con la red.** Ni una petición. No hay `fetch`, ni WebSocket, ni
  cliente HTTP, ni SDK de analítica en el árbol de dependencias del runtime.
- **No hace tracking.** No hay identificadores, ni telemetría, ni «uso
  anónimo», ni un endpoint al que mandar nada.
- **No lee tus conversaciones.** Nunca abre el transcript de Claude Code.
- **No corre nada que venga de afuera.** Los únicos procesos que lanza son
  Electron (el suyo) y lo que vos pusiste en tus hooks.

Lo único que sale de tu máquina es lo que vos subas a un repositorio.

---

## Qué guarda, dónde y por cuánto

| | |
|---|---|
| `%LOCALAPPDATA%\claude-pets\sessions\<id>.json` | Una línea por sesión de Claude Code abierta: el id de sesión, el directorio de trabajo, el estado, el nombre de la última herramienta y el texto de la notificación. |
| `%LOCALAPPDATA%\claude-pets\pet.lock` | El PID de la ventana, para no abrir dos. |
| `%LOCALAPPDATA%\claude-pets\muted` | Una marca de «lo cerré a mano». |
| `%APPDATA%\claude-pet\pet.json` | Tus preferencias: posición, tamaño, avatar, paleta y notebook. |
| `~/.claude/quota-status/current.json` | Lo escribe el statusline, no el pet: el porcentaje de uso y a qué hora vuelve. El pet sólo lo lee. Sin secretos ni contenido de tus conversaciones. |

**Retención.** El archivo de una sesión se borra cuando la sesión termina
(`SessionEnd`). Los que quedan huérfanos — porque cerraste la terminal de
cuajo — se borran solos a las 6 horas. Nada se acumula.

**Lo más sensible que hay ahí es la ruta de tu proyecto** y, si Claude Code
pidió permiso, el texto de esa notificación, que puede nombrar un archivo o un
comando. Todo en texto plano, con los permisos de tu usuario, en tu perfil
local. Si esa ruta ya es sensible para vos, tenelo en cuenta: el pet no la
cifra ni pretende hacerlo.

**Borrar todo:** borrá esas dos carpetas. No queda nada más.

---

## El modelo de amenaza

Un atacante que ya ejecuta código como tu usuario puede leer esos archivos —
igual que puede leer tu proyecto entero, tus llaves SSH y tu historial de
shell. **El pet no cambia ese piso ni intenta defenderlo**, y cualquier
documento que diga lo contrario te está mintiendo.

Lo que sí defendemos son los tres caminos por los que esto *agregaría*
superficie de ataque que antes no tenías:

1. **La ventana.** Es un navegador completo corriendo permanentemente. Si
   interpretara contenido ajeno, sería un problema nuevo.
2. **Los hooks.** Corren dentro de tus turnos de Claude Code. Un hook que falla
   mal podría romperte el trabajo.
3. **Los avatares de terceros.** Es la única parte pensada para ejecutar código
   que no escribimos nosotros. Ver más abajo, es la sección importante.

---

## Lo que cerramos, y por qué

### La ventana no es un navegador abierto

| | |
|---|---|
| `contextIsolation: true` | El código de la página no comparte contexto con el preload. |
| `nodeIntegration: false` | No hay `require` ni `process` en la página. |
| `sandbox: true` | El renderer corre en el sandbox del sistema operativo, sin acceso a Node. |
| `webviewTag: false` | No puede incrustar otra cosa. |
| Content-Security-Policy | `default-src 'none'`, `script-src 'self'`, **`connect-src 'none'`**. Aunque un bug intentara hacer una petición, el navegador la rechaza. |
| `setWindowOpenHandler` → deny | No abre ventanas. |
| `will-navigate` → prevent | No sale de su propia página. |

La CSP sin `unsafe-inline` es la razón de que el código de la ventana viva en
`pet.js` y no adentro del HTML: un script inline no correría. La restricción
está antes que la comodidad, a propósito.

### La superficie del preload es de siete funciones

`preload.js` es lo único que la página ve del proceso principal, y no expone
`ipcRenderer`: expone funciones sueltas. La página no puede emitir un mensaje
IPC arbitrario, sólo los que ahí están declarados.

Del lado que recibe, los mensajes se validan: el tamaño contra una lista
cerrada, los ids contra `[A-Za-z0-9_-]` y 64 caracteres. Nada de eso se
ejecuta ni se interpola en una ruta, pero se acota igual.

### El globo no interpreta HTML

El nombre del proyecto y el texto de la notificación salen del payload de un
hook. Se pintan con `textContent` y nodos creados a mano — **no hay `innerHTML`
con datos** en ninguna parte del renderer. El único `innerHTML` que queda monta
plantillas estáticas del propio código.

### El hook no puede romperte un turno

`hook.js` corre dentro de tus turnos, así que está escrito para desaparecer sin
hacer ruido:

- Sale **siempre** con código 0, incluso si falla.
- No escribe nada en stdout, así que no puede inyectar texto en tu sesión.
- Todo el trabajo va dentro de un `try`.
- Tiene un `setTimeout` de 1 s por si nunca llega stdin.
- Se recomienda configurarlo con `async: true`, así ni siquiera suma latencia.

El id de sesión se sanea antes de tocar el sistema de archivos
(`[^A-Za-z0-9_-]` fuera, máximo 64 caracteres), así que no hay forma de que un
payload raro escriba fuera de su carpeta.

El único proceso que lanza es el Electron del propio repo, con `spawn` y una
lista de argumentos fija. **No pasa por una shell**, así que no hay inyección
de comandos posible.

---

## Avatares de terceros: acá está el riesgo real

Un avatar es **JavaScript que corre en la ventana**. Instalar uno de otra
persona es correr su código, igual que instalar cualquier dependencia.

El sandbox acota el daño posible: sin Node, sin red (`connect-src 'none'`), sin
poder navegar ni abrir ventanas, sin acceso al disco. **No puede sacar nada de
tu máquina**, porque no hay por dónde — aunque leyera algo, no tiene a quién
mandárselo.

Lo que sí puede, y cuánto te importe depende de dónde lo corras:

- **Consumir CPU** sin techo. En una desktop enchufada es ruido de ventilador;
  en una notebook a batería es otra cosa. Esto **no se puede acotar por
  diseño**: un avatar corre en el mismo hilo que la ventana, y no hay forma de
  ponerle un presupuesto de procesador desde adentro. Lo que sí se puede es
  notarlo — ver *Consumo* abajo — y cerrarlo con la ✕.
- **Dibujar cualquier cosa** dentro de su cuadrado, en una ventana que está
  siempre encima de todo lo demás. Incluido texto que parezca decir algo que no
  dice.
- **Colgarse**, y con él la ventana. Se cierra con la ✕ y no vuelve hasta la
  próxima sesión, pero hay que darse cuenta.

Ninguna de las tres toca tus archivos ni tus datos. Eso no las vuelve
irrelevantes: las vuelve acotadas.

Aun así, antes de instalar uno que no escribiste:

- Leelo. Son cien líneas, no cien mil.
- Desconfiá de cualquier `eval`, `Function()`, `fetch` o `import()` dinámico:
  un avatar no necesita nada de eso.
- Desconfiá de un archivo minificado. No hay razón para minificar esto.

Los colores que declara un device se validan contra un patrón de color antes de
entrar a una custom property, para que no se cuele otra cosa por ahí.

---

## Consumo

Un adorno que corre todo el día tiene que costar poco, y el punto de partida no
era bueno: **56 % de un núcleo en reposo**. Hoy está en torno al **13 %**,
tecleando o quieto, medido sobre los tres procesos de Electron.

Lo que lo bajó, por orden de impacto:

- **El tecleo salta en vez de interpolar** (`steps(1)`). Antes recorría sesenta
  posiciones por segundo y repintaba el SVG entero en cada una; ahora salta
  entre dos. De paso se lee mejor: un tecleo es un movimiento seco.
- **No se toca el DOM si el valor redondeado no cambió.** La ventana es
  transparente, así que cada repintado le cuesta al compositor mezclar con el
  escritorio. Cuantizar a media unidad del viewBox — menos de medio píxel en
  pantalla — corta de raíz los repintados de la deriva del reposo.
- **El bucle va a 30 cuadros por segundo**, no a 60.
- **El cursor se sondea más lento cuando está lejos**, y no se manda nada si no
  se movió.

Si te importa el número, medilo vos: `Get-Process electron` y mirá
`TotalProcessorTime` antes y después de diez segundos. Es la misma cuenta que
usamos acá.

Que un avatar propio pueda volver a subirlo es esperable — el presupuesto es de
quien lo escribe. La skill `avatar-designer` lo dice.

---

## Sobre el OWASP Top 10

Es una lista pensada para aplicaciones web con servidor, usuarios y sesiones.
Acá **no hay backend, ni autenticación, ni base de datos, ni multi-usuario**, y
la mitad de las categorías simplemente no tienen dónde aplicarse. Marcarlas
todas en verde sería teatro. Lo que sí aplica:

| Categoría | Cómo queda |
|---|---|
| **A01 Control de acceso** | No hay roles ni recursos compartidos. Los archivos quedan con los permisos de tu usuario; el pet no los afloja. |
| **A02 Fallas criptográficas** | No hay criptografía porque no hay secretos ni tránsito. Los datos son locales y en claro, y está documentado arriba. |
| **A03 Inyección** | Sin SQL y sin shell: `spawn` con argumentos fijos. XSS cerrado por CSP y por no usar `innerHTML` con datos. Path traversal cerrado saneando el id de sesión. |
| **A04 Diseño inseguro** | El pet no puede bloquear ni modificar un turno: sólo lee archivos y dibuja. Ese límite es de diseño, no una configuración. |
| **A05 Configuración incorrecta** | Es lo que más trabajo llevó: sandbox, aislamiento de contexto, CSP y bloqueo de navegación, todo explícito arriba. |
| **A06 Componentes vulnerables** | Una sola dependencia de runtime: Electron. Es la que hay que mantener al día — ver abajo. |
| **A07 Identificación y autenticación** | No aplica: no hay login. |
| **A08 Integridad de software y datos** | Sin actualizaciones automáticas ni carga remota de código: lo que corre es lo que clonaste. Los avatares de terceros son la excepción, y tienen su sección. |
| **A09 Registro y monitoreo** | Se registran errores del renderer en la consola del proceso, nada más. No hay logs persistentes ni telemetría. |
| **A10 SSRF** | No aplica: no hay peticiones salientes de ningún tipo. |

**La superficie real es A06.** Electron trae Chromium, y Chromium tiene
vulnerabilidades. Si vas a dejar esto corriendo todo el día, mantenelo al día:

```bash
cd app
npm audit
npm update electron
```

---

## Reportar algo

Si encontrás un problema de seguridad, abrilo como
[issue](https://github.com/DecoudJuan/Claude-pet/issues) — el proyecto es
público y no maneja datos de terceros, así que no hay nada que coordinar en
privado. Si preferís avisar primero sin publicar, escribí al mail del perfil.
