import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://sdocs.app",
  // La compresión borra el espacio cuando un salto de línea precede a <code> o <em>.
  compressHTML: false,
  image: { service: { entrypoint: "astro/assets/services/noop" } },
  vite: { plugins: [tailwindcss()] },
});
