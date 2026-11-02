/*
 * Sube a R2 los archivos de .artefactos/ y comprueba que quedaron íntegros. Los clientes
 * se bajan del release y su SHA-256 se compara con artefactos.json antes de publicarlos.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carpeta = join(raiz, ".artefactos");
const { archivos, clientes } = JSON.parse(readFileSync(join(raiz, "src/data/artefactos.json"), "utf8"));
const BUCKET = "sdoc-artefactos";
const REPOSITORIO = "eddndev/securing-documents-in-a-law-firm";
const TIPOS = { ".pdf": "application/pdf", ".zip": "application/zip", ".py": "text/x-python; charset=utf-8" };

const faltantes = clientes.paquetes.filter((p) => !existsSync(join(carpeta, p.archivo)));
if (faltantes.length) {
  execFileSync("gh", ["release", "download", clientes.etiqueta, "-R", REPOSITORIO, "-D", carpeta, "--clobber", "-p", "secure-documents-*.zip"], {
    stdio: "inherit",
  });
}

for (const entrada of [...archivos, ...clientes.paquetes]) {
  const ruta = join(carpeta, entrada.archivo);
  const contenido = readFileSync(ruta);
  const algoritmo = entrada.algoritmo === "SHA3-256" ? "sha3-256" : "sha256";
  const hash = createHash(algoritmo).update(contenido).digest("hex");
  if (hash !== entrada.hash || contenido.length !== entrada.bytes) throw new Error(`No coincide: ${entrada.archivo}`);

  const inline = extname(ruta) === ".pdf";
  execFileSync(
    "pnpm",
    [
      "exec", "wrangler", "r2", "object", "put", `${BUCKET}/${entrada.archivo}`, "--remote", "--file", ruta,
      "--content-type", TIPOS[extname(ruta)],
      "--content-disposition", `${inline ? "inline" : "attachment"}; filename="${entrada.archivo}"`,
      "--cache-control", "public, max-age=3600",
    ],
    { cwd: raiz, stdio: ["ignore", "ignore", "inherit"] },
  );
  console.log(`subido ${entrada.archivo}`);
}
