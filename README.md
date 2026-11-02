# sdoc-web

Sitio escolar de Secure Documents (C709, Selected Topics in Cryptography, 7CM1):
arquitectura, mecanismos criptográficos, primitivas y descargas.
Repositorio local, sin remoto. El sistema visual está en `DESIGN.md`.

## Uso

```sh
pnpm install
pnpm dev          # o: pnpm build && pnpm preview
```

Node 22.22 o superior. Astro queda fijo en 7.4.1 porque 7.4.2 ya pide Node 22.23.

## Publicación

El sitio se publica en <https://sdocs.app> con `.github/workflows/despliegue.yml` al
hacer push a `main`. Necesita los secretos `CLOUDFLARE_API_TOKEN` y
`CLOUDFLARE_ACCOUNT_ID`.

Los descargables no se versionan: viven en el bucket R2 `sdoc-artefactos`, servido en
<https://descargas.sdocs.app>.

```sh
pnpm artefactos         # reúne los archivos en .artefactos/ y regenera los hashes
pnpm artefactos:subir   # baja los clientes del release y sube todo a R2
```

`pnpm artefactos` lee los repositorios hermanos, así que sólo funciona en la máquina
de desarrollo. Súbelos antes de hacer push si cambió alguno.

## Láminas

`pnpm laminas` (Python con numpy y Pillow) dibuja los grises en `public/laminas/`.
El tramado ordenado se hace en el navegador (`src/scripts/raster.ts`) al tamaño
exacto de pantalla. El plugin propio de Tailwind está en `src/styles/patina.js`.

El fondo es el shader de Figma «Patina», portado en `src/scripts/patina.ts`. Sus
parámetros están en la constante `PARAMETROS`.
