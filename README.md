# sdoc-web

Sitio escolar de Secure Documents (C709, Selected Topics in Cryptography, 7CM1):
arquitectura, mecanismos criptográficos, primitivas, límites y descargas.
Repositorio local, sin remoto. El sistema visual está en `DESIGN.md`.

## Uso

```sh
pnpm install
pnpm artefactos   # copia los PDF, el kit y el verificador a public/descargas
pnpm dev          # o: pnpm build && pnpm preview
```

Node 22.22 o superior. Astro queda fijo en 7.4.1 porque 7.4.2 ya pide Node 22.23.

`public/descargas/` no se versiona y `pnpm artefactos` regenera
`src/data/artefactos.json` con tamaños y SHA3-256. Vuelve a ejecutarlo si cambia
alguno de los archivos de origen, que están en los repositorios hermanos.

## Láminas

`pnpm laminas` (Python con numpy y Pillow) dibuja los grises en `public/laminas/`.
El tramado ordenado se hace en el navegador (`src/scripts/raster.ts`) al tamaño
exacto de pantalla. El plugin propio de Tailwind está en `src/styles/patina.js`.

## Pendiente de publicar

Los clientes 0.3.5 aparecen sin enlace porque no tienen alojamiento público. No
hay configuración de despliegue. Antes de publicar, revisa que los PDF incluyen
la boleta y los dominios de producción.
