/*
 * Copia los entregables a public/descargas/ y escribe src/data/artefactos.json.
 * El tamaño y el hash se toman de la copia, que es lo que el sitio sirve.
 * Si falta un archivo fuente, se detiene antes de escribir el JSON.
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stic = resolve(raiz, "..");
const destino = join(raiz, "public", "descargas");
const salida = join(raiz, "src", "data", "artefactos.json");

const FORMATOS = { ".pdf": "PDF", ".zip": "ZIP", ".py": "Python" };

const LOCALES = [
  {
    grupo: "documentos",
    nombre: "Arquitectura criptográfica de Secure Documents",
    descripcion: "Reporte técnico del equipo, del sistema a los módulos: flujos, esquemas, primitivas y decisiones.",
    fuente: "arquitectura-criptografica/build/stic-06-arquitectura-criptografica.pdf",
  },
  {
    grupo: "documentos",
    nombre: "Inventario y guía de pruebas",
    descripcion: "66 pruebas con actor, pasos y resultado esperado, con corte del 27 de octubre de 2026.",
    fuente: "07-inventario-pruebas-secure-documents/build/stic-07-inventario-pruebas-secure-documents.pdf",
  },
  {
    grupo: "documentos",
    nombre: "Práctica 05: RSASSA-PSS",
    descripcion: "Reporte individual de Eduardo Alonso Sánchez sobre firmas digitales con RSA.",
    fuente: "05-rsassa-pss/build/stic-05-rsassa-pss.pdf",
  },
  {
    grupo: "herramientas",
    nombre: "Kit de pruebas",
    descripcion: "Guía interactiva en HTML, corpus de 21 archivos y capturas sintéticas de la interfaz.",
    fuente: "07-inventario-pruebas-secure-documents/secure-documents-kit-pruebas.zip",
  },
  {
    grupo: "herramientas",
    nombre: "Verificador de firmas",
    descripcion: "Script que comprueba una firma .sig.json con el CLI de openssl.",
    fuente: "securing-documents-in-a-law-firm/scripts/verify-signature-sidecar.py",
  },
];

/* Los clientes no se copian: el repositorio es privado y los paquetes pesan demasiado. */
const CLIENTES = {
  version: "0.3.5",
  commit: "c53dae6",
  etiqueta: "clients-0.3.5-c53dae6-r40628378756",
  certificadoApk: {
    algoritmo: "SHA-256",
    hash: "0903ffa6288486b3c3e04ad51d5c57da98ff0a6b4842b09df1b9401abd41ea1b",
  },
  paquetes: [
    {
      nombre: "Android",
      archivo: "secure-documents-android.zip",
      formato: "ZIP",
      bytes: 13013475,
      algoritmo: "SHA-256",
      hash: "c8a4a62341c61909eb4581f7e08983af9a5d755e307d8110b626dd439a0d55bd",
      url: null,
    },
    {
      nombre: "Linux",
      archivo: "secure-documents-linux.zip",
      formato: "ZIP",
      bytes: 128462547,
      algoritmo: "SHA-256",
      hash: "b3472faf882d4e9004c33ef9ac06415b829a2c6ca3ba5ac20a46cc25d70eccdd",
      url: null,
    },
    {
      nombre: "Windows",
      archivo: "secure-documents-windows.zip",
      formato: "ZIP",
      bytes: 135684745,
      algoritmo: "SHA-256",
      hash: "a4fd2d654133e2d517f37a4088e28d179c2591bce889566f8e0944842666ec4d",
      url: null,
    },
  ],
};

mkdirSync(destino, { recursive: true });
mkdirSync(dirname(salida), { recursive: true });

const archivos = LOCALES.map(({ fuente, ...entrada }) => {
  const archivo = basename(fuente);
  const copia = join(destino, archivo);
  copyFileSync(join(stic, fuente), copia);
  const contenido = readFileSync(copia);
  return {
    ...entrada,
    archivo,
    formato: FORMATOS[extname(archivo)],
    bytes: contenido.length,
    algoritmo: "SHA3-256",
    hash: createHash("sha3-256").update(contenido).digest("hex"),
  };
});

writeFileSync(salida, `${JSON.stringify({ archivos, clientes: CLIENTES }, null, 2)}\n`);
console.log(`${archivos.length} archivos en public/descargas, datos en src/data/artefactos.json`);
