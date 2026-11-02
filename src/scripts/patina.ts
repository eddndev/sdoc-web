/*
 * Fondo de pátina: port a WebGL2 del shader de Figma «Patina». Conserva el campo, los
 * parámetros y el orden de las operaciones del WGSL original. Es analítico y determinista:
 * se dibuja una vez y sólo se repite al cambiar el tamaño de la ventana.
 */

const PARAMETROS = {
  metalBase: [25, 47, 50],
  oxidacion: [79, 130, 117],
  acentoMineral: [148, 117, 87],
  cobertura: 52,
  escalaDeManchas: 44,
  suavidad: 18,
  detalle: 72,
  contraste: 1.03,
  semilla: 41,
  desplazamiento: [50, 50],
};

const VERTICES = `#version 300 es
void main() {
  // Triángulo que cubre la pantalla, sin búfer de vértices.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENTOS = `#version 300 es
precision highp float;
precision highp int;
uniform vec3 baseColor;
uniform vec3 oxideColor;
uniform vec3 mineralColor;
uniform vec4 geometry; // ancho, alto, tamaño de mancha en %, cobertura 0..1
uniform vec4 finish;   // suavidad, detalle, contraste, semilla
uniform vec2 origin;
out vec4 salida;

float hashCell(vec2 cell) {
  uint ix = uint(int(cell.x));
  uint iy = uint(int(cell.y));
  uint h = ix * 374761393u + iy * 668265263u + uint(finish.w) * 1442695041u + 1013904223u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  h = h ^ (h >> 16u);
  return float(h & 0x00ffffffu) * (1.0 / 16777216.0);
}
float rawNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 t = f * f * f * (f * (f * 6.0 - vec2(15.0)) + vec2(10.0));
  float a = hashCell(cell);
  float b = hashCell(cell + vec2(1.0, 0.0));
  float c = hashCell(cell + vec2(0.0, 1.0));
  float d = hashCell(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}
float noiseAA(vec2 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  float weight = 1.0 - smoothstep(0.30, 0.85, footprint);
  return mix(0.5, rawNoise(p), weight);
}
vec2 turn(vec2 p) {
  return vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y);
}
float terrain(vec2 p) {
  vec2 p1 = turn(p) * 2.03 + vec2(13.7, 6.9);
  vec2 p2 = turn(p1) * 2.07 + vec2(8.2, 19.3);
  vec2 p3 = turn(p2) * 2.01 + vec2(17.1, 11.4);
  return 0.59 * noiseAA(p) + 0.25 * noiseAA(p1) + 0.11 * noiseAA(p2) + 0.05 * noiseAA(p3);
}
float edge(float lo, float hi, float value) {
  float aa = max(fwidth(value) * 0.65, 0.001);
  return smoothstep(lo - aa, hi + aa, value);
}
void main() {
  vec2 dims = max(geometry.xy, vec2(1.0));
  // uv con y hacia abajo, igual que el quad del shader de Figma.
  vec2 uv = vec2(gl_FragCoord.x, dims.y - gl_FragCoord.y) / dims;
  vec2 aspect = dims / min(dims.x, dims.y);
  vec2 design = (uv - origin) * aspect;
  float patchFrequency = 100.0 / max(geometry.z, 18.0);
  vec2 p = design * patchFrequency + vec2(7.43, 19.27);
  vec2 slowWarp = vec2(
    noiseAA(turn(p) * 0.73 + vec2(31.4, 6.8)),
    noiseAA(turn(p) * 0.69 + vec2(5.3, 42.1))
  ) - vec2(0.5);
  vec2 q0 = p + slowWarp * 0.58;
  vec2 smallWarp = vec2(
    noiseAA(q0 * 3.1 + vec2(17.2, 2.9)),
    noiseAA(q0 * 3.3 + vec2(4.7, 23.6))
  ) - vec2(0.5);
  vec2 q = q0 + smallWarp * 0.055;
  float land = terrain(q);
  float middle = terrain(turn(p) * 3.7 + vec2(14.9, 5.2));
  float weather = terrain(turn(p) * 11.3 + vec2(13.6, 45.4));
  float fracture = noiseAA(turn(p) * 29.7 + vec2(27.4, 19.1));
  float field = clamp(0.5 + 1.65 * (land - 0.5) + 0.18 * (middle - 0.5) + 0.15 * (weather - 0.5) + 0.065 * (fracture - 0.5), 0.0, 1.0);
  float threshold = 1.0 - geometry.w;
  float softness = mix(0.006, 0.115, finish.x);
  float corrosion = edge(threshold - softness, threshold + softness, field);
  corrosion = geometry.w <= 0.0 ? 0.0 : corrosion;
  corrosion = geometry.w >= 1.0 ? 1.0 : corrosion;
  float front = 4.0 * corrosion * (1.0 - corrosion);
  vec2 microPos = turn(design) * 196.0 + slowWarp * 3.0 + vec2(4.7, 8.1);
  float micro = noiseAA(microPos) - 0.5;
  float fine = noiseAA(turn(design) * 386.0 + vec2(19.8, 6.2)) - 0.5;
  float aggregate = noiseAA(turn(p) * 46.0 + slowWarp * 0.2 + vec2(6.9, 21.3));
  float depositField = noiseAA(turn(p) * 11.8 + vec2(45.2, 14.8));
  float cluster = edge(0.61, 0.84, depositField + 0.22 * (middle - 0.5));
  float grainGate = edge(0.52, 0.79, aggregate);
  float detail = finish.y;
  float deposits = clamp(detail * cluster * (0.025 + 0.50 * corrosion + 0.40 * front) * (0.32 + 0.68 * grainGate), 0.0, 0.63);
  float polish = noiseAA(turn(p) * 0.46 + vec2(36.8, 12.6));
  float matteVariation = 0.73 + 0.42 * middle + 0.16 * (weather - 0.5);
  vec3 metal = baseColor * (0.88 + 0.23 * polish + 0.22 * (middle - 0.5));
  metal += vec3(0.019, 0.021, 0.019) * edge(0.24, 0.86, polish);
  vec3 oxide = mix(baseColor * 0.9, oxideColor * matteVariation, 0.82 + 0.18 * edge(0.22, 0.70, weather));
  oxide += vec3(0.022, 0.024, 0.019) * (middle - 0.5);
  vec3 color = mix(metal, oxide, corrosion);
  vec3 mineral = mineralColor * (0.84 + 0.20 * aggregate);
  color = mix(color, mineral, deposits);
  float textureEnvelope = 0.30 + 0.48 * corrosion + 0.26 * front;
  color += vec3(detail * textureEnvelope * (0.080 * micro + 0.028 * fine + 0.045 * (aggregate - 0.5)));
  float pore = edge(0.76, 0.94, aggregate) * edge(0.50, 0.77, middle);
  color *= 1.0 - detail * 0.14 * pore * (0.20 + 0.80 * corrosion);
  vec3 safeColor = clamp(color, vec3(0.005), vec3(0.97));
  vec3 dark = pow(safeColor, vec3(finish.z));
  vec3 light = pow(vec3(1.0) - safeColor, vec3(finish.z));
  color = vec3(0.012) + 0.976 * dark / (dark + light);
  salida = vec4(color, 1.0);
}`;

function compilar(gl: WebGL2RenderingContext, tipo: number, fuente: string) {
  const shader = gl.createShader(tipo)!;
  gl.shaderSource(shader, fuente);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function preparar(lienzo: HTMLCanvasElement) {
  const gl = lienzo.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;
  const programa = gl.createProgram()!;
  gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICES));
  gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTOS));
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa) ?? "programa");
  gl.useProgram(programa);
  gl.bindVertexArray(gl.createVertexArray());

  const u = (nombre: string) => gl.getUniformLocation(programa, nombre);
  const p = PARAMETROS;
  const rgb = (c: number[]) => c.map((v) => v / 255) as [number, number, number];
  gl.uniform3f(u("baseColor"), ...rgb(p.metalBase));
  gl.uniform3f(u("oxideColor"), ...rgb(p.oxidacion));
  gl.uniform3f(u("mineralColor"), ...rgb(p.acentoMineral));
  gl.uniform2f(u("origin"), p.desplazamiento[0] / 100, p.desplazamiento[1] / 100);
  gl.uniform4f(u("finish"), p.suavidad / 100, p.detalle / 100, p.contraste, p.semilla);
  const geometria = u("geometry");

  return (ancho: number, alto: number) => {
    gl.viewport(0, 0, ancho, alto);
    gl.uniform4f(geometria, ancho, alto, p.escalaDeManchas, p.cobertura / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

export function iniciarPatina() {
  const lienzo = document.querySelector<HTMLCanvasElement>("[data-patina]");
  if (!lienzo) return;
  let dibujar: ReturnType<typeof preparar> = null;
  let medida = "";

  const pintar = () => {
    if (!dibujar) return;
    const escala = Math.min(devicePixelRatio, 2);
    const caja = lienzo.getBoundingClientRect();
    const ancho = Math.round(caja.width * escala);
    const alto = Math.round(caja.height * escala);
    const nueva = `${ancho}x${alto}`;
    if (nueva === medida) return;
    medida = nueva;
    lienzo.width = ancho;
    lienzo.height = alto;
    dibujar(ancho, alto);
  };

  const encender = () => {
    try {
      dibujar = preparar(lienzo);
    } catch (error) {
      console.warn("Pátina sin WebGL2:", error);
      dibujar = null;
    }
    if (!dibujar) {
      document.documentElement.classList.remove("webgl2");
      return;
    }
    medida = "";
    pintar();
  };

  lienzo.addEventListener("webglcontextlost", (evento) => evento.preventDefault());
  lienzo.addEventListener("webglcontextrestored", encender);
  encender();
  new ResizeObserver(pintar).observe(lienzo);
}
