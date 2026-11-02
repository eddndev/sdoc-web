/*
 * Las escenas en vivo del sitio. Sus constantes coinciden con dona(), cadena() y aes() de
 * tools/raster/laminas.py, que generan el respaldo para quien no tiene WebGL2.
 */
import gsap from "gsap";
import rondas from "../data/aes-rondas.json";
import { Objeto3D, type Escena } from "./objeto";

/** Toro: la curva sobre C. Su retícula se repite, así que girarla un periodo no lo cambia. */
export const DONA: Escena = {
  glsl: `
const float R = 1.62;
const float r = 0.47;
const float CAMARA = 6.2;
const float ZOOM = 2.1;
const float ATRAS = 3.8;
const float ADELANTE = 8.3;
const vec3 LUZ = vec3(-0.5, 0.75, 0.55);
const float AMBIENTE = 0.03;
const float BRILLO = 0.75;

mat3 pose() {
  return rotacionY(inclinacion.y) * rotacionX(radians(58.0) + inclinacion.x) * rotacionZ(radians(-24.0));
}
float modelo(vec3 q) {
  return length(vec2(length(q.xz) - R, q.y)) - r;
}
// Retícula de periodos: el toro es C módulo un retículo.
float detalle(vec3 q, float gris) {
  float u = atan(q.z, q.x) * 36.0 / TAU + fase.x;
  float v = atan(q.y, length(q.xz) - R) * 14.0 / TAU + fase.y;
  return min(abs(fract(u) - 0.5), abs(fract(v) - 0.5)) < 0.04 ? gris * 0.45 : gris;
}`,
  inclinacion: [0.55, 0.75],
  velocidad: [2.4, 1],
  periodo: [1, 1],
  // El toro no queda centrado en su lienzo; este círculo es su silueta en reposo.
  contiene: (nx, ny) => Math.hypot(nx + 0.03, ny - 0.04) <= 0.37,
};

/** Tres eslabones: raíz, emisor y dispositivo. Media vuelta sobre su eje deja cada uno igual. */
export const CADENA: Escena = {
  glsl: `
const float CAMARA = 9.5;
const float ZOOM = 2.3;
const float ATRAS = 4.5;
const float ADELANTE = 14.5;
const vec3 LUZ = vec3(-0.6, 0.7, 0.5);
const float AMBIENTE = 0.04;
const float BRILLO = 0.9;
const vec3 CENTRO = vec3(1.5, -1.95, 0.0);
const vec3 NORMAL = vec3(0.0, 0.0, 1.0);

mat3 pose() {
  return rotacionY(inclinacion.y) * rotacionX(inclinacion.x);
}
float eslabon(vec3 q, float giro) {
  vec3 eje = normalize(CENTRO);
  vec3 lateral = cross(eje, NORMAL);
  float c = cos(giro);
  float s = sin(giro);
  float a = max(abs(dot(q, eje)) - 0.72, 0.0);
  float b = c * dot(q, lateral) + s * dot(q, NORMAL);
  float d = -s * dot(q, lateral) + c * dot(q, NORMAL);
  return length(vec2(length(vec2(a, b)) - 0.7, d)) - 0.2;
}
float modelo(vec3 q) {
  float giro = 0.5 + fase.x;
  return min(eslabon(q + CENTRO, giro),
    min(eslabon(q, giro + TAU * 0.25), eslabon(q - CENTRO, giro + TAU * 0.5)));
}
float detalle(vec3 q, float gris) {
  return gris;
}`,
  inclinacion: [0.5, 0.7],
  velocidad: [1.5, 0],
  periodo: [Math.PI, 1],
  // Distancia del puntero al eje de la cadena, en las coordenadas de la escena.
  contiene: (nx, ny) => {
    const [x, y] = [nx * 1.87, ny * -2];
    const t = Math.max(-1, Math.min(1, x * 0.61 - y * 0.79));
    return Math.hypot(x - t * 0.61, y + t * 0.79) <= 0.34;
  },
};

const BYTES_AES = rondas.estados.map((estado) => estado.split(" ").map((byte) => parseInt(byte, 16)));

let rondaVisible = 0;

/** Muestra un estado real en cada ronda entera; entre rondas sólo se interpolan las alturas. */
function mostrarRonda(valor: number) {
  const ronda = Math.round(valor);
  if (ronda === rondaVisible) return;
  rondaVisible = ronda;
  const nombre = document.querySelector<HTMLElement>("[data-ronda-nombre]");
  const bytes = document.querySelector<HTMLElement>("[data-ronda-bytes]");
  const control = document.querySelector<HTMLInputElement>("#ronda-aes");
  if (!nombre || !bytes || !control) return;
  control.value = String(ronda);
  control.setAttribute("aria-valuetext", rondas.etiquetas[ronda]);
  nombre.textContent = rondas.etiquetas[ronda];
  bytes.textContent = rondas.estados[ronda];
}

/** Estado de AES-256: una columna por byte, en el orden por columnas de FIPS 197. */
export const AES: Escena = {
  glsl: `
uniform float alturas[16];
const float PASO = 0.95;
const float BASE = -1.2;
const float CAMARA = 9.0;
const float ZOOM = 2.6;
const float ATRAS = 4.5;
const float ADELANTE = 13.5;
const vec3 LUZ = vec3(-0.5, 0.8, 0.5);
const float AMBIENTE = 0.05;
const float BRILLO = 0.3;

mat3 pose() {
  return rotacionY(inclinacion.y) * rotacionX(0.6 + inclinacion.x) * rotacionY(radians(45.0));
}
float caja(vec3 q, vec3 mitad) {
  vec3 d = abs(q) - mitad;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}
float modelo(vec3 q) {
  float minima = 1e3;
  for (int i = 0; i < 16; i++) {
    float h = alturas[i];
    vec3 centro = vec3((float(i / 4) - 1.5) * PASO, BASE + h * 0.5, (float(i % 4) - 1.5) * PASO);
    minima = min(minima, caja(q - centro, vec3(0.42, h * 0.5, 0.42)));
  }
  return minima;
}
float detalle(vec3 q, float gris) {
  return gris;
}`,
  inclinacion: [0.35, 0.6],
  velocidad: [0, 0],
  periodo: [1, 1],
  contiene: (nx, ny) => Math.hypot(nx, ny) <= 0.47,
  recorrido: { fin: BYTES_AES.length - 1, ida: 3.4, vuelta: 1.8 },
  uniformes: (gl, programa) => {
    const ubicacion = gl.getUniformLocation(programa, "alturas");
    const alturas = new Float32Array(16);
    return (estado) => {
      const ronda = Math.min(Math.floor(estado.faseU), BYTES_AES.length - 2);
      const f = estado.faseU - ronda;
      const paso = f * f * (3 - 2 * f);
      for (let i = 0; i < 16; i++) {
        const byte = BYTES_AES[ronda][i] + (BYTES_AES[ronda + 1][i] - BYTES_AES[ronda][i]) * paso;
        alturas[i] = 0.12 + (byte / 255) * 2.4;
      }
      gl.uniform1fv(ubicacion, alturas);
      mostrarRonda(estado.faseU);
    };
  },
  alMontar: (objeto) => {
    const bloque = document.querySelector<HTMLElement>("[data-rondas]");
    const control = bloque?.querySelector("input");
    if (!bloque || !control) return;
    bloque.hidden = false;
    control.addEventListener("input", () => {
      gsap.killTweensOf(objeto.estado, "faseU");
      objeto.estado.faseU = Number(control.value);
      objeto.pintar();
    });
  },
};

const ESCENAS: Record<string, Escena> = { cadena: CADENA, aes: AES };

/** Monta las láminas marcadas con data-escena. Las que no puedan se quedan como lámina. */
export function iniciarEscenas() {
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (const marco of document.querySelectorAll<HTMLElement>("[data-escena]")) {
    const objeto = Objeto3D.crear(marco, ESCENAS[marco.dataset.escena!]);
    if (!objeto) continue;
    marco.dataset.vivo = "";
    if (!quieto) objeto.escuchar(marco);
  }
}
