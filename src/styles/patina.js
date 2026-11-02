/*
 * Plugin «pátina» de Tailwind. Reúne lo que hace que el sitio parezca una placa de
 * cobre oxidada: las superficies, el moteado del verdín y el marco de las láminas.
 * Los colores viven en @theme (global.css); aquí sólo se consumen.
 */
import plugin from "tailwindcss/plugin";

const MOTEADO = "url('/laminas/moteado.webp')";

export default plugin(({ addBase, addUtilities, addComponents }) => {
  addBase({
    ":root": { "--raster-tinta": "var(--color-tinta)", "--raster-luz": "var(--color-verdin-palido)" },
  });

  addUtilities({
    /* Verdín: el cobre oxidado al aire. Es el fondo por omisión de la página. */
    ".placa-verdin": {
      "background-color": "var(--color-verdin)",
      "background-image": MOTEADO,
      "background-size": "720px 720px",
      color: "var(--color-tinta)",
      "--raster-tinta": "var(--color-tinta)",
      "--raster-luz": "var(--color-verdin-palido)",
    },
    /* Bronce: la misma placa, ennegrecida. Invierte tinta y brillo. */
    ".placa-bronce": {
      "background-color": "var(--color-bronce)",
      color: "var(--color-verdin-palido)",
      "--raster-tinta": "var(--color-verdin)",
      "--raster-luz": "var(--color-verdin-palido)",
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
        "mix-blend-mode": "multiply",
      },
      "& > canvas": { position: "absolute", top: "0", left: "0", "image-rendering": "pixelated" },
      "&[data-listo] > img": { visibility: "hidden" },
    },
  });
});
