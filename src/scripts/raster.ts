/*
 * Tramado ordenado de las láminas. Cada imagen gris se umbraliza en el navegador,
 * al tamaño exacto en pantalla, para que la retícula nunca se deforme al escalar.
 * Sin JavaScript queda la imagen gris con mezcla multiplicativa.
 */

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62,
  30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31,
  55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

export type Tintas = { tinta: [number, number, number]; luz: [number, number, number] };

export type Revelado = {
  /** 0 deja la placa limpia; 1 muestra la lámina completa. */
  avance: number;
  /** Bruñido del puntero, en coordenadas de la retícula. */
  x: number;
  y: number;
  radio: number;
};

function color(css: string): [number, number, number] {
  const sonda = document.createElement("canvas").getContext("2d")!;
  sonda.fillStyle = css;
  sonda.fillRect(0, 0, 1, 1);
  const [r, g, b] = sonda.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function tintasDe(elemento: HTMLElement): Tintas {
  const estilo = getComputedStyle(elemento);
  return {
    tinta: color(estilo.getPropertyValue("--raster-tinta")),
    luz: color(estilo.getPropertyValue("--raster-luz")),
  };
}

export class Lamina {
  readonly lienzo: HTMLCanvasElement;
  readonly celda: number;
  private readonly fuente: HTMLImageElement;
  private grises = new Float32Array();
  private ancho = 0;
  private alto = 0;
  private tintas: Tintas;
  private contexto: CanvasRenderingContext2D;
  private salida: ImageData | null = null;
  revelado: Revelado = { avance: 1, x: -1e4, y: -1e4, radio: 0 };

  constructor(fuente: HTMLImageElement, lienzo: HTMLCanvasElement, celda: number) {
    this.fuente = fuente;
    this.lienzo = lienzo;
    this.celda = celda;
    this.contexto = lienzo.getContext("2d")!;
    this.tintas = tintasDe(lienzo);
  }

  /** Remuestrea el gris a la retícula actual, respetando el recorte de object-fit: cover. */
  medir() {
    const caja = this.lienzo.parentElement!.getBoundingClientRect();
    const ancho = Math.max(1, Math.ceil(caja.width / this.celda));
    const alto = Math.max(1, Math.ceil(caja.height / this.celda));
    this.ancho = ancho;
    this.alto = alto;
    this.lienzo.width = ancho;
    this.lienzo.height = alto;
    this.lienzo.style.width = `${ancho * this.celda}px`;
    this.lienzo.style.height = `${alto * this.celda}px`;

    const ajuste = this.fuente.dataset.ajuste ?? "cover";
    const lienzoGris = document.createElement("canvas");
    lienzoGris.width = ancho;
    lienzoGris.height = alto;
    const gris = lienzoGris.getContext("2d", { willReadFrequently: true })!;
    const { naturalWidth: nw, naturalHeight: nh } = this.fuente;
    const escala = (ajuste === "cover" ? Math.max : Math.min)(ancho / nw, alto / nh);
    const [dw, dh] = [nw * escala, nh * escala];
    const angosto = caja.width < 700 && this.fuente.dataset.focoAngosto;
    const foco = ((angosto || this.fuente.dataset.foco) ?? "50 50").split(" ").map(Number);
    gris.fillStyle = "#fff";
    gris.fillRect(0, 0, ancho, alto);
    /* Los datos discretos (primos, tablas) no se promedian: un gris aquí sería un dato falso. */
    gris.imageSmoothingEnabled = !("discreta" in this.fuente.dataset);
    gris.imageSmoothingQuality = "high";
    gris.drawImage(this.fuente, ((ancho - dw) * foco[0]) / 100, ((alto - dh) * foco[1]) / 100, dw, dh);
    const datos = gris.getImageData(0, 0, ancho, alto).data;
    this.grises = new Float32Array(ancho * alto);
    for (let i = 0; i < this.grises.length; i++) this.grises[i] = datos[i * 4] / 255;
    this.salida = this.contexto.createImageData(ancho, alto);
    this.pintar();
  }

  /** Umbraliza con dos tintas: la oscura para sombras y la clara para los brillos. */
  pintar() {
    if (!this.salida) return;
    const { avance, x: bx, y: by, radio } = this.revelado;
    const { tinta, luz } = this.tintas;
    const pixeles = this.salida.data;
    const velo = 1 - avance;
    for (let y = 0, i = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++, i++) {
        const umbral = BAYER_8[(y & 7) * 8 + (x & 7)];
        let valor = this.grises[i] + velo * (1.25 - 0.5 * umbral);
        if (radio > 0) {
          const d = Math.hypot(x - bx, y - by) / radio;
          if (d < 1) valor += (1 - d) * (1 - d) * 0.75;
        }
        const j = i * 4;
        if (valor < umbral) {
          pixeles[j] = tinta[0];
          pixeles[j + 1] = tinta[1];
          pixeles[j + 2] = tinta[2];
          pixeles[j + 3] = 255;
        } else if (avance > 0.98 && this.grises[i] > 0.74 && this.grises[i] < 0.97 && (valor - 0.74) * 2.2 > umbral) {
          pixeles[j] = luz[0];
          pixeles[j + 1] = luz[1];
          pixeles[j + 2] = luz[2];
          pixeles[j + 3] = 255;
        } else {
          pixeles[j + 3] = 0;
        }
      }
    }
    this.contexto.putImageData(this.salida, 0, 0);
  }
}

/** Enciende todas las láminas fuera de la portada; la portada la anima Portada.astro. */
export function iniciarLaminas() {
  const elementos = document.querySelectorAll<HTMLElement>("[data-lamina]:not([data-portada])");
  for (const marco of elementos) {
    const fuente = marco.querySelector("img")!;
    const lienzo = marco.querySelector("canvas")!;
    const encender = () => {
      const lamina = new Lamina(fuente, lienzo, Number(marco.dataset.celda ?? 2));
      lamina.medir();
      marco.dataset.listo = "";
      new ResizeObserver(() => lamina.medir()).observe(marco);
    };
    if (fuente.complete && fuente.naturalWidth) encender();
    else fuente.addEventListener("load", encender, { once: true });
  }
}
