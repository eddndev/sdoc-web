/*
 * Reúne los entregables en .artefactos/ y escribe src/data/artefactos.json. El tamaño y
 * el hash se toman de la copia, que es lo que `pnpm artefactos:subir` manda a R2.
 * Si falta un archivo fuente, se detiene antes de escribir el JSON.
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stic = resolve(raiz, "..");
const destino = join(raiz, ".artefactos");
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

/* Los clientes salen del release del repositorio privado; ver subir-artefactos.mjs. */
const CLIENTES = {
  version: "0.3.6",
  commit: "283dc1f",
  etiqueta: "clients-0.3.6-283dc1f-r41755694149",
  certificadoApk: {
    algoritmo: "SHA-256",
    hash: "0903ffa6288486b3c3e04ad51d5c57da98ff0a6b4842b09df1b9401abd41ea1b",
  },
  paquetes: [
    {
      nombre: "Android",
      archivo: "secure-documents-android.zip",
      formato: "ZIP",
      bytes: 13013661,
      algoritmo: "SHA-256",
      hash: "6a9a6c99abe7fd404451065e80ac0392c83301b5244be6cd2e8257ade53b8ed8",
    },
    {
      nombre: "Linux",
      archivo: "secure-documents-linux.zip",
      formato: "ZIP",
      bytes: 128419688,
      algoritmo: "SHA-256",
      hash: "2023f5aef3715e0898c796520b0073223e30418ff0abb0f5a262626314c5ea36",
    },
    {
      nombre: "Windows",
      archivo: "secure-documents-windows.zip",
      formato: "ZIP",
      bytes: 135686268,
      algoritmo: "SHA-256",
      hash: "5dca75f182b634f4c025d5ae898f37c0a0df43d2d3a39e7cbd757279f2b9581b",
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
console.log(`${archivos.length} archivos en .artefactos, datos en src/data/artefactos.json`);
