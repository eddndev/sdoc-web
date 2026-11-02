/*
 * Plugin «pátina» de Tailwind. Reúne las superficies del sitio: el metal oxidado que
 * pinta src/scripts/patina.ts, los velos que permiten leer sobre él y las láminas.
 * Los colores viven en @theme (global.css); aquí sólo se consumen.
 */
import plugin from "tailwindcss/plugin";

/* Velo del metal base. Baja la oxidación clara lo necesario para leer cuerpo de texto. */
const VELO = "rgb(25 47 50 / 0.66)";

export default plugin(({ addBase, addUtilities, addComponents }) => {
  addBase({
    ":root": {
      "--raster-tinta": "var(--color-tinta)",
      "--raster-medio": "var(--color-verdin)",
      "--raster-luz": "var(--color-verdin-palido)",
    },
  });

  addUtilities({
    /* El metal oxidado, fijo detrás de todo. Sin WebGL2 queda una captura del shader. */
    ".placa-metal": {
      "background-color": "var(--color-metal)",
      color: "var(--color-claro)",
    },
    ".velo": { "background-color": VELO },
    /* La portada deja ver el shader completo y sólo oscurece donde hay texto. */
    ".velo-portada": {
      "background-image": `linear-gradient(to bottom, rgb(25 47 50 / 0.5), transparent 9rem), linear-gradient(to bottom, transparent 42%, ${VELO} 78%)`,
    },
    /* Bronce: el metal casi limpio, para las piezas que necesitan más separación. */
    ".placa-bronce": {
      "background-color": "rgb(16 34 35 / 0.82)",
      color: "var(--color-claro)",
    },
  });

  addComponents({
    ".lamina": {
      position: "relative",
      overflow: "hidden",
      "& > img": {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        "object-fit": "cover",
      },
      "& > canvas": { position: "absolute", top: "0", left: "0", "image-rendering": "pixelated" },
      "&[data-listo] > img": { visibility: "hidden" },
    },
  });
});
