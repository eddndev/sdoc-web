/*
 * Objetos trazados en tiempo real y tramados con las mismas tres tintas que las láminas.
 * Cada escena (escenas.ts) aporta su geometría y su gesto; aquí viven la marcha de rayos,
 * el tramado y la respuesta al puntero. Sólo se pinta cuando algo cambia.
 */
import gsap from "gsap";
import { tintasDe } from "./raster";

export type Escena = {
  /** GLSL con CAMARA, ZOOM, ATRAS, ADELANTE, LUZ, AMBIENTE, BRILLO, pose(), modelo() y detalle(). */
  glsl: string;
  /** Inclinación máxima, en radianes por unidad de desplazamiento del puntero. */
  inclinacion: [number, number];
  /** Avance de cada fase por segundo mientras el puntero está dentro. */
  velocidad: [number, number];
  /** Cada cuánto se repite el objeto: al salir frena en un múltiplo y vuelve a su pose. */
  periodo: [number, number];
  /** Si el puntero, de -0.5 a 0.5 en cada eje del marco, está sobre el objeto. */
  contiene: (nx: number, ny: number) => boolean;
  /** En vez de girar, faseU recorre de 0 a fin al entrar y vuelve a 0 al salir. */
  recorrido?: { fin: number; ida: number; vuelta: number };
  /** Uniformes propios: recibe el programa y devuelve lo que se actualiza en cada pintado. */
  uniformes?: (gl: WebGL2RenderingContext, programa: WebGLProgram) => (estado: EstadoObjeto) => void;
  /** Se llama una vez, con el objeto ya en la página. */
  alMontar?: (objeto: Objeto3D) => void;
};

export type EstadoObjeto = Objeto3D["estado"];

const VERTICES = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentos = (escena: string) => `#version 300 es
precision highp float;
uniform vec2 celdas;
uniform vec2 inclinacion;
uniform vec2 fase;
uniform vec3 puntero; // x, y y radio del bruñido, en celdas
uniform float avance;
uniform vec3 tinta;
uniform vec3 medio;
uniform vec3 luz;
out vec4 salida;

const float TAU = 6.2831853;
const int BAYER[64] = int[64](
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21);

mat3 rotacionX(float a) { return mat3(1.0, 0.0, 0.0, 0.0, cos(a), sin(a), 0.0, -sin(a), cos(a)); }
mat3 rotacionY(float a) { return mat3(cos(a), 0.0, -sin(a), 0.0, 1.0, 0.0, sin(a), 0.0, cos(a)); }
mat3 rotacionZ(float a) { return mat3(cos(a), sin(a), 0.0, -sin(a), cos(a), 0.0, 0.0, 0.0, 1.0); }

${escena}

vec3 normal(vec3 q) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.002;
  return normalize(
    k.xyy * modelo(q + k.xyy * e) + k.yyx * modelo(q + k.yyx * e) +
    k.yxy * modelo(q + k.yxy * e) + k.xxx * modelo(q + k.xxx * e));
}

void main() {
  ivec2 celda = ivec2(gl_FragCoord.xy);
  float umbral = (float(BAYER[(celda.y & 7) * 8 + (celda.x & 7)]) + 0.5) / 64.0;
  salida = vec4(0.0);
  if (umbral < 1.0 - avance) return;

  vec2 uv = (2.0 * gl_FragCoord.xy - celdas) / celdas.y;
  vec3 origen = vec3(0.0, 0.0, CAMARA);
  vec3 rayo = normalize(vec3(uv, -ZOOM));
  mat3 m = pose();
  float t = ATRAS;
  bool golpe = false;
  vec3 q = vec3(0.0);
  for (int i = 0; i < 96; i++) {
    q = (origen + rayo * t) * m;
    float d = modelo(q);
    if (d < 0.0015) {
      golpe = true;
      break;
    }
    t += d * 0.9;
    if (t > ADELANTE) break;
  }
  if (!golpe) return;

  vec3 n = m * normal(q);
  vec3 l = normalize(LUZ);
  float lambert = clamp(dot(n, l), 0.0, 1.0);
  float especular = pow(clamp(dot(n, normalize(l - rayo)), 0.0, 1.0), 40.0);
  float gris = clamp(detalle(q, AMBIENTE + (1.0 - AMBIENTE) * lambert + BRILLO * especular), 0.0, 1.0);

  float valor = gris;
  if (puntero.z > 0.0) {
    float d = distance(gl_FragCoord.xy, puntero.xy) / puntero.z;
    if (d < 1.0) valor += (1.0 - d) * (1.0 - d) * 0.75;
  }
  vec3 tono = medio;
  if (valor < umbral) tono = tinta;
  else if (gris > 0.74 && (valor - 0.74) * 2.2 > umbral) tono = luz;
  salida = vec4(tono, 1.0);
}`;

function compilar(gl: WebGL2RenderingContext, tipo: number, fuente: string) {
  const shader = gl.createShader(tipo)!;
  gl.shaderSource(shader, fuente);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

export class Objeto3D {
  readonly estado = {
    avance: 1,
    inclinacionX: 0,
    inclinacionY: 0,
    faseU: 0,
    faseV: 0,
    punteroX: 0,
    punteroY: 0,
    radio: 0,
  };
  private readonly gl: WebGL2RenderingContext;
  private readonly lienzo: HTMLCanvasElement;
  private readonly marco: HTMLElement;
  private readonly escena: Escena;
  private readonly celda: number;
  private readonly u: Record<string, WebGLUniformLocation | null>;
  private readonly alPintar?: (estado: EstadoObjeto) => void;

  private constructor(marco: HTMLElement, lienzo: HTMLCanvasElement, gl: WebGL2RenderingContext, escena: Escena) {
    this.marco = marco;
    this.lienzo = lienzo;
    this.gl = gl;
    this.escena = escena;
    this.celda = Number(marco.dataset.celda ?? 2);

    const programa = gl.createProgram()!;
    gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICES));
    gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, fragmentos(escena.glsl)));
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa) ?? "programa");
    gl.useProgram(programa);
    gl.bindVertexArray(gl.createVertexArray());
    gl.clearColor(0, 0, 0, 0);

    const nombres = ["celdas", "inclinacion", "fase", "puntero", "avance", "tinta", "medio", "luz"];
    this.u = Object.fromEntries(nombres.map((n) => [n, gl.getUniformLocation(programa, n)]));
    const tintas = tintasDe(lienzo);
    const rgb = (c: number[]) => c.map((v) => v / 255) as [number, number, number];
    gl.uniform3f(this.u.tinta, ...rgb(tintas.tinta));
    gl.uniform3f(this.u.medio, ...rgb(tintas.medio));
    gl.uniform3f(this.u.luz, ...rgb(tintas.luz));
    this.alPintar = escena.uniformes?.(gl, programa);
  }

  /** Reemplaza la lámina del marco. Sin WebGL2 devuelve null y la lámina se traza como siempre. */
  static crear(marco: HTMLElement, escena: Escena) {
    const lienzo = document.createElement("canvas");
    lienzo.setAttribute("aria-hidden", "true");
    const gl = lienzo.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return null;
    try {
      const respaldo = marco.querySelector("canvas");
      marco.append(lienzo);
      const objeto = new Objeto3D(marco, lienzo, gl, escena);
      respaldo?.remove();
      marco.dataset.listo = "";
      objeto.medir();
      new ResizeObserver(() => objeto.medir()).observe(marco);
      escena.alMontar?.(objeto);
      return objeto;
    } catch (error) {
      console.warn("Objeto sin WebGL2:", error);
      lienzo.remove();
      return null;
    }
  }

  /** Mantiene un número entero de celdas para que la retícula no se deforme. */
  medir() {
    const caja = this.marco.getBoundingClientRect();
    const ancho = Math.max(1, Math.floor(caja.width / this.celda));
    const alto = Math.max(1, Math.floor(caja.height / this.celda));
    this.lienzo.width = ancho;
    this.lienzo.height = alto;
    this.lienzo.style.width = `${ancho * this.celda}px`;
    this.lienzo.style.height = `${alto * this.celda}px`;
    this.gl.viewport(0, 0, ancho, alto);
    this.gl.uniform2f(this.u.celdas, ancho, alto);
    this.pintar();
  }

  pintar() {
    const { gl, u, estado: e } = this;
    gl.uniform2f(u.inclinacion, e.inclinacionX, e.inclinacionY);
    gl.uniform2f(u.fase, e.faseU, e.faseV);
    gl.uniform3f(u.puntero, e.punteroX, this.lienzo.height - e.punteroY, e.radio);
    gl.uniform1f(u.avance, e.avance);
    this.alPintar?.(e);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Hover y salida. La zona escucha el puntero; en la portada es mayor porque el título tapa el marco. */
  escuchar(zona: HTMLElement) {
    const e = this.estado;
    const { inclinacion, velocidad, periodo, contiene, recorrido } = this.escena;
    const pintar = () => this.pintar();
    let dentro = false;
    let vivo = false;
    let cierre: gsap.core.Tween | null = null;

    const cuadro = (_tiempo: number, delta: number) => {
      if (dentro) {
        e.faseU += (delta / 1000) * velocidad[0];
        e.faseV += (delta / 1000) * velocidad[1];
      }
      pintar();
    };
    const apagar = () => {
      gsap.ticker.remove(cuadro);
      vivo = false;
      pintar();
    };

    const frenar = (propiedad: "faseU" | "faseV", i: 0 | 1) => {
      if (!velocidad[i]) return 0;
      const destino = Math.ceil(e[propiedad] / periodo[i]) * periodo[i];
      const duracion = Math.max(1.2, (1.5 * (destino - e[propiedad])) / velocidad[i]);
      gsap.to(e, { [propiedad]: destino, duration: duracion, ease: "power3.out" });
      return duracion;
    };

    const salir = () => {
      if (!dentro) return;
      dentro = false;
      gsap.to(e, { radio: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
      gsap.to(e, { inclinacionX: 0, inclinacionY: 0, duration: 1.5, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
      let duracion = Math.max(frenar("faseU", 0), frenar("faseV", 1));
      if (recorrido) {
        duracion = (e.faseU / recorrido.fin) * recorrido.vuelta;
        gsap.killTweensOf(e, "faseU");
        gsap.to(e, { faseU: 0, duration: duracion, ease: "none" });
      }
      cierre = gsap.delayedCall(Math.max(1.5, duracion), apagar);
    };

    zona.addEventListener("pointermove", (evento) => {
      if (evento.pointerType !== "mouse") return;
      const caja = this.marco.getBoundingClientRect();
      const nx = (evento.clientX - caja.left) / caja.width - 0.5;
      const ny = (evento.clientY - caja.top) / caja.height - 0.5;
      if (!contiene(nx, ny)) return salir();

      const x = (nx + 0.5) * this.lienzo.width;
      const y = (ny + 0.5) * this.lienzo.height;
      if (!dentro) {
        dentro = true;
        cierre?.kill();
        gsap.killTweensOf(e, "faseU,faseV");
        if (recorrido) {
          const restante = (recorrido.fin - e.faseU) / recorrido.fin;
          gsap.to(e, { faseU: recorrido.fin, duration: restante * recorrido.ida, ease: "none" });
        }
        e.punteroX = x;
        e.punteroY = y;
        gsap.to(e, { radio: this.lienzo.width * 0.13, duration: 0.45, ease: "power2.out", overwrite: "auto" });
        if (!vivo) gsap.ticker.add(cuadro);
        vivo = true;
      }
      gsap.to(e, {
        inclinacionX: ny * inclinacion[0],
        inclinacionY: nx * inclinacion[1],
        duration: 0.7,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(e, { punteroX: x, punteroY: y, duration: 0.25, ease: "power3.out", overwrite: "auto" });
    });
    zona.addEventListener("pointerleave", salir);
  }
}
