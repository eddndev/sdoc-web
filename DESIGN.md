# Sistema de diseño de sdoc-web

Sitio escolar de Secure Documents (C709, Selected Topics in Cryptography, 7CM1).
No vende nada: explica arquitectura y mecanismos, y ofrece los entregables.

## Idea

La página es una placa de cobre oxidada que funciona como atlas de láminas. Cada
dibujo se rasteriza con tramado ordenado y sale de datos reales del proyecto. Lo
memorable es el rasterizado; todo lo demás se queda quieto y disciplinado.

## Tokens

Definidos en `src/styles/global.css`, consumidos por el plugin `src/styles/patina.js`.

| Token | Valor | Uso |
| --- | --- | --- |
| `verdin` | `#8dbfae` | Fondo de la página |
| `verdin-palido` | `#c4e0d3` | Brillos del tramado, texto sobre bronce |
| `tinta` | `#0f2a27` | Texto y tramado sobre verdín |
| `bronce` | `#17332e` | Placa ennegrecida, sección de arquitectura |
| `cobre` | `#7a2f0e` | Foco, acento sobre verdín |
| `cobre-vivo` | `#e09a63` | Acento sobre bronce |

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
- Movimiento: la portada se revela una vez y el puntero la bruñe. Fuera de ahí,
  sólo responde a acciones de la persona. Nada de entradas al hacer scroll.
- Respetar `prefers-reduced-motion`, foco visible y teclado en todo control.
- Funcionar desde 360 px sin desplazamiento horizontal.

## Láminas

Componente `src/components/Lamina.astro`, con `nombre`, `alt`, `celda` y `discreta`.
Las imágenes se generan con `pnpm laminas` y se traman en el navegador.

| Lámina | Dato real |
| --- | --- |
| `hero` | Puntos de y² = x³ + 7 sobre F_1021 (1036 con el infinito) y un toro |
| `sbox` | S-box de AES calculada; cada altura es el byte sustituido |
| `keccak` | Estado de SHA3-256 tras absorber `SDOC`; primeras 22 rebanadas de 64 |
| `gf256` | Tabla de multiplicar de GF(2⁸) con `0x11b` |
| `ulam` | Espiral de Ulam de 201 × 201, sólo en los perfiles de firma |
| `cadena` | Tres eslabones: raíz, emisor y dispositivo |

## Voz

Se aplica `plantilla/VOICE/VOICE.md`: primera persona del plural, concreta, sobria,
sin raya decorativa y sin cierres simétricos. Nunca decir «valor legal pleno»: la
CA es de laboratorio, no e.firma ni PSC.
