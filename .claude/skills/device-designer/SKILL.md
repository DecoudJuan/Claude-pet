---
name: device-designer
description: Agregar o ajustar notebooks para Claude Pet — la máquina sobre la que trabaja el avatar. Usala cuando alguien pida "quiero una MacBook midnight", "agregá una Dell", "hacé la HP en gris", "add a laptop", "otra notebook negra", o cuando haya que cambiar los colores o el logo de una existente. Las notebooks son un registro aparte del de avatares, así que cualquier avatar hereda todas.
---

# Agregar una notebook a Claude Pet

La máquina sobre la que trabaja el avatar es un dato aparte del avatar. El
mismo pingüino puede estar sobre una MacBook o sobre una ThinkPad, y un avatar
nuevo hereda todas las registradas sin escribir una línea.

## Por qué son sólo colores

A 152–224 px de alto, la tapa de una notebook ocupa unos 60 px. **Las siluetas
no se distinguen a ese tamaño**: lo que distingue una MacBook de una ThinkPad
es el color de la tapa y la forma del logo, no el radio de las esquinas.

Así que un device es exactamente eso, y por eso agregar uno cuesta una línea.
Si alguna vez hace falta una silueta propia, ahí sí conviene que sea un avatar
nuevo, no un device.

## Registrar una

En `devices/laptops.js`:

```js
{ id: 'macbook-midnight', name: 'MacBook · Midnight',
  lid: '#2b3442', badge: 'glow', badgeColor: '#c3ccd8' }
```

| Campo | |
|---|---|
| `id` | Único y estable. Se guarda en la configuración del usuario: si lo cambiás, el que lo tenía elegido vuelve al default. |
| `name` | Lo que se lee en el panel. Para variantes de color usá `Marca · Color` — el panel es angosto y así se agrupan al ordenar. |
| `lid` | El dorso de la tapa. Es el color que se ve. |
| `badge` | `glow` (círculo lleno, tipo manzana) · `bar` (barrita, tipo Lenovo/Samsung) · `ring` (anillo, tipo HP/Dell) · `none` (sin marca). |
| `badgeColor` | El logo. |

Listo. El selector del panel se llena solo desde el registro.

## Elegir los colores

**La tapa tiene que contrastar con el cuerpo del avatar.** El pingüino es gris
oscuro: una tapa `#1f252d` sobre él es una mancha sin forma. Si la notebook es
oscura, subí el contorno; si es clara, no hace falta.

**El logo tiene que contrastar con la tapa, pero poco.** Un logo blanco puro
sobre una tapa oscura grita. En las reales el logo es apenas más claro o más
oscuro que la tapa — ese es el efecto que buscás.

**No copies el color exacto de la marca.** Es una caricatura de 60 px: el gris
de una MacBook real sale gris sucio a ese tamaño. Subí la saturación y el
contraste hasta que se lea, no hasta que sea exacto.

## Probar

```bash
cd app && npm start
```

Hover sobre el dibujo → **⋯** → el selector **Notebook**. Cambia en caliente,
sin remontar el avatar.

Si no aparece, revisá que `app/window.html` cargue tu archivo:

```html
<script src="../core/devices.js"></script>
<script src="../devices/laptops.js"></script>
```

## Checklist

- [ ] La tapa se despega del cuerpo del avatar, no es una mancha.
- [ ] El logo se lee pero no grita.
- [ ] Se ve bien sobre un escritorio claro y sobre uno oscuro.
- [ ] El `id` es estable y el `name` sigue `Marca · Color` si es una variante.
