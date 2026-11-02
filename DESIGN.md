# Sistema de diseño de sdoc-web

Sitio escolar de Secure Documents (C709, Selected Topics in Cryptography, 7CM1).
No vende nada: explica arquitectura y mecanismos, y ofrece los entregables.

## Idea

La página es metal oxidado que funciona como atlas de láminas. El fondo es el shader
de Figma «Patina», portado a WebGL2 en `src/scripts/patina.ts` con sus valores
exactos. Cada dibujo se rasteriza con tramado ordenado, sale de datos reales del
proyecto y parece impreso sobre el metal. Todo lo demás se queda quieto.

## Tokens

Definidos en `src/styles/global.css`, consumidos por el plugin `src/styles/patina.js`.

| Token | Valor | Uso |
| --- | --- | --- |
| `metal` | `#192f32` | Metal base del shader y velos |
| `oxido` | `#4f8275` | Oxidación del shader |
| `mineral` | `#947557` | Acento mineral del shader |
| `claro` | `#e6f1eb` | Texto |
| `verdin` | `#8dbfae` | Cuerpo del tramado, bordes |
| `verdin-palido` | `#c4e0d3` | Brillos del tramado, líneas |
| `tinta` | `#0b1c1e` | Sombras del tramado, texto sobre rellenos claros |
| `cobre-vivo` | `#f0b384` | Acento y foco |

Shader: cobertura 52 %, escala de manchas 44 %, suavidad 18 %, detalle 72 %,
contraste 1.03, semilla 41, desplazamiento 50/50. Se dibuja una vez, fijo detrás del
contenido, y se repite sólo al cambiar el tamaño. Sin WebGL2 queda
`public/laminas/patina.webp`, una captura del shader.

Legibilidad: sobre la oxidación clara ningún color de texto alcanza 4.5:1. Por eso la
portada muestra el shader completo y oscurece sólo donde hay texto, y `main` lleva
`.velo`, el metal base al 66 %. Medido píxel a píxel, el peor caso es 4.8:1 en el
acento y 7.5:1 en el texto; en la portada, 5:1. Si cambias el velo, vuelve a medir.

Tipografía: Piazzolla con eje óptico para todo el texto, en 800 o 900 para títulos.
Sometype Mono sólo para bytes, hexadecimal, identificadores y nombres de formato
(`SDEV`, `0x11b`, `SDOC-LOGIN-SIGNATURE-v1`), nunca para etiquetas decorativas.

## Reglas

- Texto alineado a la izquierda, 62 a 72 caracteres por línea. En bloque de texto
  usar `max-w-[38rem]`.
- Márgenes de sección: `px-4 sm:px-8 lg:px-12`, los mismos de la portada.
- Sin tarjetas con borde y sombra, sin esquinas redondeadas, sin degradados.
- Sin etiquetas en mayúsculas sobre los títulos, sin cadenas `A · B · C`, sin `→`
  al final de enlaces y sin numeración decorativa. Numerar sólo una secuencia real.
- La estructura se resuelve con espacio y con la lámina. Una línea sólo si separa
  datos, por ejemplo filas de una tabla.
- Movimiento: la portada emerge una vez, de sombras a brillos. La dona, la cadena y
  el estado de AES responden al puntero: se inclinan hacia él; las dos primeras giran y el
  tercero corre sus rondas. Al salir vuelven a su pose de reposo. Fuera de ahí,
  sólo responde a acciones de la persona. Nada de entradas al hacer scroll.
- Respetar `prefers-reduced-motion`, foco visible y teclado en todo control.
- Funcionar desde 360 px sin desplazamiento horizontal.

## Láminas

Componente `src/components/Lamina.astro`, con `nombre`, `alt`, `celda` y `discreta`.
Las imágenes se generan con `pnpm laminas`, llevan transparencia y se traman en el
navegador a tres tintas (`--raster-tinta`, `--raster-medio`, `--raster-luz`).

| Lámina | Dato real |
| --- | --- |
| `hero` | Puntos de y² = x³ + 7 sobre F_1021 (1036 con el infinito) |
| `dona` | Toro, respaldo sin WebGL2 de la escena `DONA` de `src/scripts/escenas.ts` |
| `aes` | Estado de AES-256 sobre un bloque de GCM. Respaldo de la escena `AES`; las rondas están en `src/data/aes-rondas.json` |
| `keccak` | Estado de SHA3-256 tras absorber `SDOC`; primeras 22 rebanadas de 64 |
| `gf256` | Tabla de multiplicar de GF(2⁸) con `0x11b` |
| `ulam` | Espiral de Ulam de 201 × 201, sólo en los perfiles de firma |
| `cadena` | Tres eslabones: raíz, emisor y dispositivo. Respaldo de la escena `CADENA` |

## Voz

Se aplica `plantilla/VOICE/VOICE.md`: primera persona del plural, concreta, sobria,
sin raya decorativa y sin cierres simétricos. Nunca decir «valor legal pleno»: la
CA es de laboratorio, no e.firma ni PSC.
