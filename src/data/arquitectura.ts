/*
 * Mapa de zonas y tabla de visibilidad. Sale de la sección «Sistema» del reporte
 * de arquitectura (tabla tab:visibilidad y figura fig:arquitectura), con commit
 * a4c4da9 en el repositorio principal y 65fe7ba en el de la CA.
 *
 * En los textos, K_doc y K_local son claves, *t* es una variable y los nombres de
 * formato o de programa se marcan solos con enLinea().
 */

export interface Fila {
  id: string;
  parte: string;
  ve: string;
  nuncaVe: string;
}

export interface Linea {
  titulo?: string;
  detalle: string;
}

export interface Zona {
  id: string;
  marca: string;
  nombre: string;
  lineas: Linea[];
  /** Filas del panel que muestra esta zona. */
  filas: string[];
}

export const lecturaDelMapa =
  "K_doc y el texto claro sólo existen en los equipos de Z1. Al servidor, en Z3, le llega el SDEV cifrado.";

export const tituloTabla = "Qué ve cada parte del sistema";

export const visibilidad: Fila[] = [
  {
    id: "servidor",
    parte: "sdocd, PostgreSQL y almacén",
    ve: "IDs, política (cliente, abogados, *t*, *N*, modo de reparto), esquema de firma de cada persona, revisiones, tamaños, hashes SHA3, SDEV cifrado, SDSP/SDAC cifrados con HPKE, firmas, certificados públicos, IP",
    nuncaVe:
      "K_doc, texto claro, nombre y MIME (van en SDCF cifrado), valores Shamir, privadas, contraseña local, secreto de respaldo",
  },
  {
    id: "ca",
    parte: "CA (cad)",
    ve: "Persona atestada, rol, dos públicas (SPKI de firma y X25519), transcript y el secreto del reto que ella misma generó",
    nuncaVe: "Privadas de usuario, documentos, partes, permisos documentales",
  },
  {
    id: "nginx",
    parte: "Nginx",
    ve: "TLS ya terminado: cabeceras y cuerpos HTTP, igual que sdocd",
    nuncaVe: "Lo mismo que sdocd",
  },
  {
    id: "cloudflare",
    parte: "Cloudflare",
    ve: "Sólo consultas DNS",
    nuncaVe: "Tráfico (sin proxy)",
  },
  {
    id: "resend",
    parte: "Resend",
    ve: "Dirección de correo y texto de verificación",
    nuncaVe: "Todo lo demás",
  },
  {
    id: "participante",
    parte: "Participante que aporta",
    ve: "Contexto de la solicitud y su propia parte",
    nuncaVe: "Partes de otros, K_doc, texto claro",
  },
  {
    id: "solicitante",
    parte: "Dispositivo solicitante",
    ve: "Aportaciones cifradas a su X25519 temporal; K_doc y texto claro en memoria",
    nuncaVe: "Nada persiste: borra K_doc, partes y la temporal al cerrar",
  },
  {
    id: "cliente",
    parte: "Cliente con identidad desbloqueada",
    ve: "Sus privadas de firma y X25519 en claro dentro del handle de OpenSSL y el token Bearer vigente. La contraseña (escritorio) o la biometría o credencial del equipo (Android) se pide al desbloquear, no en cada firma",
    nuncaVe:
      "Privadas de otros equipos. Pierde el handle al bloquearse. Android bloquea al dejar de verse la app y escritorio al minimizar, cerrar, tras suspensión o con el botón Bloquear",
  },
];

/* La tabla del reporte no tiene fila para la raíz. Sólo se dice lo que sí está escrito. */
export const raiz = {
  id: "raiz",
  parte: "Raíz offline",
  nota: "Limita el daño si se compromete el emisor. La raíz del protocolo (Ed25519) es material distinto del certificado web ACME.",
};

const papelesDeEquipo = ["participante", "solicitante", "cliente"];

const clavesDeEquipo: Linea[] = [
  { titulo: "Firma", detalle: "secp256k1 o RSA-3072, según la persona" },
  { titulo: "Recepción", detalle: "X25519" },
];

export const escritorio: Zona = {
  id: "z1-escritorio",
  marca: "Z1",
  nombre: "Equipo de escritorio del usuario",
  lineas: [
    { detalle: "UI Compose (Windows, Linux)" },
    { detalle: "clients/core: flujos y HTTP" },
    { detalle: "JNI sdoc_client_jni" },
    { detalle: "Núcleo C17 + OpenSSL 3" },
    { titulo: "Custodia local", detalle: "SDVT: contraseña → Argon2id → AES-256-GCM" },
    ...clavesDeEquipo,
  ],
  filas: papelesDeEquipo,
};

export const android: Zona = {
  id: "z1-android",
  marca: "Z1",
  nombre: "Equipo Android del usuario",
  lineas: [
    { detalle: "UI Android (Kotlin)" },
    { detalle: "clients/core: flujos y HTTP" },
    { detalle: "JNI sdoc_client_jni" },
    { detalle: "Núcleo C17 + OpenSSL 3" },
    { titulo: "Custodia local", detalle: "K_local AES-256-GCM en AndroidKeyStore, biometría o credencial" },
    ...clavesDeEquipo,
  ],
  filas: papelesDeEquipo,
};

export const internet: Zona = {
  id: "z2",
  marca: "Z2",
  nombre: "Internet público",
  lineas: [
    { titulo: "Cloudflare", detalle: "sólo DNS, sin proxy" },
    { titulo: "Resend API", detalle: "sólo verificación de correo" },
  ],
  filas: ["cloudflare", "resend"],
};

export const vps: Zona = {
  id: "z3",
  marca: "Z3",
  nombre: "VPS3, servidor honesto pero curioso",
  lineas: [
    { titulo: "Nginx", detalle: "TLS 1.2/1.3, certificado Let's Encrypt (ACME), límite de peticiones" },
    { titulo: "sdocd", detalle: "monolito REST en C17" },
    { titulo: "PostgreSQL 16", detalle: "socket local, sin TCP" },
    { titulo: "Almacén privado", detalle: "SDEV con nombre SHA3-256" },
  ],
  filas: ["servidor", "nginx"],
};

export const procesoCa: Zona = {
  id: "z4",
  marca: "Z4",
  nombre: "Proceso CA (usuario sdoc-ca)",
  lineas: [
    { titulo: "cad + libsdoc_ca", detalle: "C17, OpenSSL 3.5.9, SQLite" },
    { titulo: "Emisor SDOC Issuer v1", detalle: "Ed25519, 365 días" },
  ],
  filas: ["ca"],
};

export const raizOffline: Zona = {
  id: "z5",
  marca: "Z5",
  nombre: "Raíz offline, fuera del VPS",
  lineas: [{ titulo: "SDOC Root v1", detalle: "Ed25519, 3650 días, custodia offline" }],
  filas: [raiz.id],
};

const NOMBRES =
  /(?<![\w/-])(sdocd|cad|libsdoc_ca|sdoc_client_jni|sdoc-ca|clients\/core|SDEV|SDSP|SDAC|SDCF|SDVT)(?![\w-])/g;

/** Convierte un texto de este archivo en HTML: claves, variables y nombres de formato. */
export function enLinea(texto: string): string {
  return texto
    .replace(NOMBRES, "<code>$1</code>")
    .replace(/K_(doc|local)/g, "<i>K<sub>$1</sub></i>")
    .replace(/\*(\w+)\*/g, "<i>$1</i>");
}
