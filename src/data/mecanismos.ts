/*
 * Datos de la sección de mecanismos, copiados del reporte de arquitectura
 * (contenido/02-flujos.tex, 03-esquemas.tex, 06-decisiones.tex y 08-glosario.tex).
 * Las descripciones admiten HTML en línea. Al cargar se comprueba que cada formato
 * sume el total que declara el reporte.
 */

/** dato: campo del formato. enlace: identificador o digest. foco: el valor central del formato. */
export type TipoCampo = "dato" | "enlace" | "foco";

export interface Campo {
  nombre: string;
  bytes: number;
  tipo: TipoCampo;
  descripcion: string;
  /** El nombre es un identificador del código y va en monoespaciada. */
  codigo?: boolean;
}

export interface Formato {
  id: string;
  /** Texto plano para nombrar el grupo de campos. */
  etiqueta: string;
  /** HTML que encabeza la tira. */
  titulo: string;
  total: number;
  campos: Campo[];
  nota?: string;
}

const KDOC = "<i>K</i><sub>doc</sub>";

export const sdlg: Formato = {
  id: "sdlg",
  etiqueta: "SDLG",
  titulo: "Reto <code>SDLG</code>, 166 B",
  total: 166,
  campos: [
    { nombre: "SDLG 01 01", bytes: 6, tipo: "dato", codigo: true, descripcion: "Magia ASCII <code>SDLG</code> y los bytes <code>01 01</code>." },
    { nombre: "service_id", bytes: 32, tipo: "enlace", codigo: true, descripcion: "Identificador del despacho." },
    { nombre: "challenge_id", bytes: 16, tipo: "enlace", codigo: true, descripcion: "Identificador de este reto." },
    { nombre: "nonce", bytes: 32, tipo: "foco", descripcion: "Valor aleatorio del CSPRNG." },
    { nombre: "persona", bytes: 16, tipo: "dato", descripcion: "Persona que inicia la sesión." },
    { nombre: "dispositivo", bytes: 16, tipo: "dato", descripcion: "Equipo que va a firmar." },
    { nombre: "signer_id", bytes: 32, tipo: "enlace", codigo: true, descripcion: "SHA3-256 del SPKI. Fija el certificado, y el certificado decide el esquema de firma." },
    { nombre: "creación", bytes: 8, tipo: "dato", descripcion: "Hora de creación, u64." },
    { nombre: "vence", bytes: 8, tipo: "dato", descripcion: "Creación + 120 s, u64." },
  ],
};

export const prefijo: Formato = {
  id: "prefijo",
  etiqueta: "prefijo común",
  titulo: "Prefijo de <code>SDMF</code>, <code>SDEV</code>, <code>SDSP</code>, <code>SDEN</code>, <code>SDAR</code> y <code>SDAC</code>, 15 B",
  total: 15,
  campos: [
    { nombre: "magia", bytes: 4, tipo: "dato", descripcion: "ASCII: <code>SDMF</code>, <code>SDEV</code>, <code>SDSP</code>, <code>SDEN</code>, <code>SDAR</code> o <code>SDAC</code>." },
    { nombre: "versión", bytes: 1, tipo: "dato", descripcion: "<code>01</code>." },
    { nombre: "propósito", bytes: 1, tipo: "dato", descripcion: "SDSP = 1, SDAR = 2, SDAC = 3, SDMF = 4, SDEV = 5, SDEN = 6." },
    { nombre: "modo HPKE", bytes: 1, tipo: "dato", descripcion: "<code>00</code>, modo base." },
    { nombre: "KEM", bytes: 2, tipo: "dato", descripcion: "<code>0x0020</code>, DHKEM(X25519, HKDF-SHA256)." },
    { nombre: "KDF", bytes: 2, tipo: "dato", descripcion: "<code>0x0001</code>, HKDF-SHA256." },
    { nombre: "AEAD", bytes: 2, tipo: "dato", descripcion: "<code>0x0002</code>, AES-256-GCM." },
    { nombre: "perfil de firma", bytes: 1, tipo: "foco", descripcion: "Offset 13: <code>01</code> si firma una clave secp256k1 y <code>02</code> si firma una RSA-3072." },
    { nombre: "modo de reparto", bytes: 1, tipo: "enlace", descripcion: `Offset 14: <code>01</code> conjunto, con Shamir anidado, y <code>02</code> directo, con ${KDOC} completa por destinatario.` },
  ],
};

export const participacion: Formato = {
  id: "participacion",
  etiqueta: "participación",
  titulo: "Participación, 38 B",
  total: 38,
  campos: [
    { nombre: "versión", bytes: 1, tipo: "dato", descripcion: "<code>01</code>." },
    { nombre: "perfil de carga", bytes: 1, tipo: "dato", descripcion: `<code>01</code> parte de Shamir, <code>02</code> ${KDOC} completa. Si no corresponde al modo, la apertura da <code>SDOC_AUTH_FAILED</code> después de HPKE.` },
    { nombre: "rol", bytes: 1, tipo: "dato", descripcion: "1 cliente, 2 abogado." },
    { nombre: "índice", bytes: 1, tipo: "dato", descripcion: "La parte del cliente codifica índice 1." },
    { nombre: "t", bytes: 1, tipo: "dato", descripcion: "Umbral. El cliente codifica <i>t</i> = 2 y en modo directo vale 1." },
    { nombre: "N", bytes: 1, tipo: "dato", descripcion: "En modo conjunto el cliente codifica <i>N</i> = 2 y en modo directo, el <i>N</i> de la cabecera. Entre abogados, 1 ≤ <i>t</i> ≤ <i>N</i> ≤ 255." },
    { nombre: "valor", bytes: 32, tipo: "foco", descripcion: `Parte de Shamir en modo conjunto, ${KDOC} completa en modo directo.` },
  ],
};

export const contextoSden: Formato = {
  id: "sden",
  etiqueta: "contexto de SDEN",
  titulo: "Contexto firmado de <code>SDEN</code>, 219 B",
  total: 219,
  nota: "Se firma SHA3-256(<code>SDOC-ENDORSE-SIGN-v1</code> ‖ contexto). En la banda horizontal, los campos de 1 B llevan un ancho mínimo para poder enfocarlos. Los demás conservan la proporción.",
  campos: [
    { nombre: "prefijo SDEN", bytes: 15, tipo: "dato", descripcion: "Propósito 6. El byte 14 repite el modo de la versión." },
    { nombre: "document_id", bytes: 16, tipo: "enlace", codigo: true, descripcion: "Documento firmado." },
    { nombre: "versión", bytes: 8, tipo: "dato", descripcion: "Número de versión." },
    { nombre: "H manifiesto", bytes: 32, tipo: "enlace", descripcion: "SHA3-256(SDMF)." },
    { nombre: "reparto", bytes: 16, tipo: "enlace", descripcion: `Identificador de la distribución de ${KDOC} dentro de la versión.` },
    { nombre: "t", bytes: 1, tipo: "dato", descripcion: "Umbral del manifiesto." },
    { nombre: "N", bytes: 1, tipo: "dato", descripcion: "Número de abogados del manifiesto." },
    { nombre: "SHA3-256(SDEV)", bytes: 32, tipo: "enlace", descripcion: "Digest del sobre exacto que guarda el servidor." },
    { nombre: "persona firmante", bytes: 16, tipo: "dato", descripcion: "Debe figurar en el manifiesto con el rol firmado." },
    { nombre: "dispositivo firmante", bytes: 16, tipo: "dato", descripcion: "Puede ser el segundo equipo de la persona, con una entrega aceptada." },
    { nombre: "signer_key_id", bytes: 32, tipo: "enlace", codigo: true, descripcion: "SHA3-256(SPKI)." },
    { nombre: "rol", bytes: 1, tipo: "dato", descripcion: "1 cliente, 2 abogado." },
    { nombre: "intención", bytes: 1, tipo: "dato", descripcion: "1 conformidad." },
    { nombre: "commit", bytes: 32, tipo: "foco", codigo: true, descripcion: "Compromiso del contenido descifrado." },
  ],
};

for (const formato of [sdlg, prefijo, participacion, contextoSden]) {
  const suma = formato.campos.reduce((acumulado, campo) => acumulado + campo.bytes, 0);
  if (suma !== formato.total) throw new Error(`${formato.id}: los campos suman ${suma} B, no ${formato.total} B`);
}

/** Jerarquía de la PKI y su CRL. */
export const cadena = [
  { nombre: "SDOC Root v1", detalle: "raíz, offline", clave: "Ed25519", vigencia: "3650 d" },
  { nombre: "SDOC Issuer v1", detalle: "emisor, proceso cad", clave: "Ed25519", vigencia: "365 d" },
  { nombre: "SDOC Device v1", detalle: "firma, digitalSignature", clave: "secp256k1 o RSA-3072", vigencia: "30 d" },
  { nombre: "SDOC Device v1", detalle: "recepción, keyAgreement", clave: "X25519", vigencia: "30 d" },
  { nombre: "CRL v2", detalle: "lista completa del emisor", clave: "Ed25519", vigencia: "≤ 300 s" },
];

/** Partes del sobre SDEV. Con dos tamaños, el primero es del perfil 1 y el segundo del perfil 2. */
export const sobre = [
  { parte: "prefijo SDEV", tamano: "15 B" },
  { parte: "len SDMF, u32", tamano: "4 B" },
  { parte: "SDMF", tamano: "325..25 217 B" },
  { parte: "nonce", tamano: "12 B" },
  { parte: "tag", tamano: "16 B" },
  { parte: "ciphertext, SDCF cifrado", tamano: "0..16 MiB" },
  { parte: "(N + 1) × [len u16 ‖ SDSP]", tamano: "314..378 B o 691 B" },
  { parte: "len firma", tamano: "1 B o 2 B" },
  { parte: "firma del autor", tamano: "8..72 B o 384 B" },
];

/** Comparación de los dos perfiles de firma de dispositivo. */
export const perfiles = [
  { aspecto: "Algoritmo", uno: "ECDSA secp256k1", dos: "RSASSA-PSS, <i>n</i> = 3072, <i>e</i> = 65537" },
  { aspecto: "Mensaje", uno: "digest SHA3-256 precalculado", dos: "digest SHA3-256 precalculado" },
  { aspecto: "Hash PSS, MGF1 y sal", uno: "no aplica", dos: "SHA3-256, MGF1-SHA3-256, sal de 32 B (longitud fija, valor aleatorio)" },
  { aspecto: "Firma", uno: "DER canónico, S baja, 8..72 B", dos: "exactamente 384 B" },
  { aspecto: "Longitud en binarios", uno: "1 B, fuera de lo firmado", dos: "2 B en big-endian, fuera de lo firmado" },
  { aspecto: "SPKI", uno: "id-ecPublicKey, secp256k1, 88 B", dos: "rsaEncryption con NULL, 422 B" },
  { aspecto: "Offset 13", uno: "<code>01</code>", dos: "<code>02</code>" },
  { aspecto: "SDSP", uno: "314..378 B", dos: "691 B" },
  { aspecto: "SDEN", uno: "228..292 B", dos: "605 B" },
];

/** Bytes reales del prefijo de un SDEV conjunto en cada perfil. */
export const ejemplosPrefijo = [
  { perfil: "Perfil 1", hex: "53 44 45 56 01 05 00 00 20 00 01 00 02 01 01" },
  { perfil: "Perfil 2", hex: "53 44 45 56 01 05 00 00 20 00 01 00 02 02 01" },
];

/** Dónde aparece SHA3-256 fuera de las firmas. */
export const digests = [
  { nombre: "H", calculo: "SHA3-256(SDMF), AAD de AES-256-GCM" },
  { nombre: "signer_key_id", calculo: "SHA3-256 del SPKI DER de firma" },
  { nombre: "root", calculo: "SHA3-256 del DER de SDOC Root v1" },
  { nombre: "token", calculo: "el servidor guarda sólo SHA3-256(token)" },
  { nombre: "commit", calculo: "compromiso del contenido descifrado" },
];

/** Etiquetas de dominio de los mensajes que aparecen en esta sección. */
export const etiquetas = [
  { etiqueta: "SDOC-LOGIN-SIGNATURE-v1", cubre: "reto SDLG" },
  { etiqueta: "SDOC-DOCUMENT-SIGN-v1", cubre: "sobre SDEV sin la longitud de firma ni la firma" },
  { etiqueta: "SDOC-SHARE-SIGN-v1", cubre: "contexto, enc y ct de un SDSP, 305 B" },
  { etiqueta: "SDOC-ENDORSE-SIGN-v1", cubre: "contexto de SDEN, 219 B" },
  { etiqueta: "SDOC-UPLOAD-v1", cubre: "carga de un SDEV por REST" },
  { etiqueta: "SDOC-ACCESS-INTENT-v1", cubre: "intención de apertura" },
];
