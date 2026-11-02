/*
 * Tabla de primitivas, copiada de arquitectura-criptografica/contenido/04-primitivas.tex.
 * Marcas dentro del texto: `mono` para bytes e identificadores, _{sub} y ^{sup}.
 */
export interface Primitiva {
  primitiva: string;
  parametros: string;
  fuerza: string;
  norma: string;
  uso: string;
}

export const columnas = [
  { campo: "parametros", etiqueta: "Parámetros", ancho: "lg:w-[30%]" },
  { campo: "fuerza", etiqueta: "Fuerza", ancho: "lg:w-[12%]" },
  { campo: "norma", etiqueta: "Norma", ancho: "lg:w-[20%]" },
  { campo: "uso", etiqueta: "Uso", ancho: "lg:w-[20%]" },
] as const;

export const primitivas: Primitiva[] = [
  {
    primitiva: "AES-256-GCM",
    parametros: "clave 32 B, nonce 12 B, tag 16 B, AAD ≤ 64 KiB, texto ≤ 16 MiB",
    fuerza: "256",
    norma: "SP 800-38D",
    uso: "sobre, `SDVT`, `SDBK`, K_{local}, AEAD de HPKE",
  },
  {
    primitiva: "SHA3-256",
    parametros: "salida 32 B",
    fuerza: "128 (colisión)",
    norma: "FIPS 202",
    uso: "transcripts, IDs de clave, manifiesto, objetos",
  },
  {
    primitiva: "ECDSA secp256k1 (perfil 1)",
    parametros: "prehash SHA3-256, DER canónico con S baja, 8..72 B",
    fuerza: "128",
    norma: "SEC 1 §4.1, SEC 2 §2.4.1; hash: FIPS 202",
    uso: "firma de dispositivo",
  },
  {
    primitiva: "RSASSA-PSS-3072 (perfil 2)",
    parametros: "e = 65537, dos primos, SHA3-256, MGF1-SHA3-256, sal aleatoria de longitud fija 32 B, firma 384 B",
    fuerza: "128",
    norma: "RFC 8017 §8.1, FIPS 186-5 §5.4",
    uso: "firma de dispositivo",
  },
  {
    primitiva: "RSASSA-PSS-3072 (`SDAT`)",
    parametros: "SHA-256, MGF1-SHA-256, sal 32 B, sobre un prehash SHA3-256",
    fuerza: "128",
    norma: "RFC 8017",
    uso: "atestación del admin",
  },
  {
    primitiva: "Ed25519",
    parametros: "EdDSA puro, firma 64 B",
    fuerza: "128",
    norma: "RFC 8032, FIPS 186-5 §7",
    uso: "raíz, emisor y CRL de la CA",
  },
  {
    primitiva: "X25519",
    parametros: "32 B, u < 2^{255} − 19 con bit 255 en cero",
    fuerza: "128",
    norma: "RFC 7748",
    uso: "recepción y temporales de solicitud",
  },
  {
    primitiva: "HPKE base",
    parametros: "KEM `0x0020`, KDF `0x0001`, AEAD `0x0002`; enc 32 B",
    fuerza: "128",
    norma: "RFC 9180",
    uso: "`SDSP`, `SDAC`, reto CA, auxiliar local",
  },
  {
    primitiva: "HKDF-SHA256",
    parametros: "sólo dentro de HPKE",
    fuerza: "no aplica",
    norma: "RFC 5869",
    uso: "derivación en HPKE",
  },
  {
    primitiva: "Argon2id",
    parametros: "v1.3, 64 MiB, t = 3, p = 4, salt 16 B, salida 32 B",
    fuerza: "resistente a memoria",
    norma: "RFC 9106 §4",
    uso: "desbloqueo de `SDVT`",
  },
  {
    primitiva: "CSPRNG",
    parametros: "CTR-DRBG con AES-256 de OpenSSL; `SecureRandom` en Kotlin",
    fuerza: "no aplica",
    norma: "SP 800-90A r1",
    uso: "claves, nonces, IDs, retos",
  },
  {
    primitiva: "Shamir",
    parametros: "GF(2^{8}), `0x11b`, byte a byte; 2 de 2 + t de N en modo conjunto; parte 38 B",
    fuerza: "teoría de la información",
    norma: "Shamir 1979",
    uso: "reparto de K_{doc}",
  },
];

export interface Trozo {
  tipo: "texto" | "code" | "sub" | "sup";
  texto: string;
}

/** Parte un texto con marcas en trozos, para pintarlos sin insertar HTML crudo. */
export function trozos(texto: string): Trozo[] {
  return texto
    .split(/(`[^`]+`|_\{[^}]+\}|\^\{[^}]+\})/)
    .filter((parte) => parte !== "")
    .map((parte) => {
      if (parte.startsWith("`")) return { tipo: "code", texto: parte.slice(1, -1) };
      if (parte.startsWith("_{")) return { tipo: "sub", texto: parte.slice(2, -1) };
      if (parte.startsWith("^{")) return { tipo: "sup", texto: parte.slice(2, -1) };
      return { tipo: "texto", texto: parte };
    });
}
