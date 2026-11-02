/*
 * Tramado ordenado de las láminas. Cada imagen gris se umbraliza en el navegador,
 * al tamaño exacto en pantalla, para que la retícula nunca se deforme al escalar.
 * Lo transparente del archivo deja ver la pátina. Sin JavaScript queda la imagen gris.
 */

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62,
  30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31,
  55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

type Rgb = [number, number, number];
export type Tintas = { tinta: Rgb; medio: Rgb; luz: Rgb };

export type Revelado = {
  /** 0 deja la placa limpia; 1 muestra la lámina completa. */
  avance: number;
};

function color(css: string): Rgb {
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
    medio: color(estilo.getPropertyValue("--raster-medio")),
    luz: color(estilo.getPropertyValue("--raster-luz")),
  };
}

export class Lamina {
  readonly lienzo: HTMLCanvasElement;
  readonly celda: number;
  private readonly fuente: HTMLImageElement;
  private grises = new Float32Array();
  private cubierta = new Uint8Array();
  private ancho = 0;
  private alto = 0;
  private tintas: Tintas;
  private contexto: CanvasRenderingContext2D;
  private salida: ImageData | null = null;
  revelado: Revelado = { avance: 1 };

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
    /* Los datos discretos (primos, tablas) no se promedian: un gris aquí sería un dato falso. */
    gris.imageSmoothingEnabled = !("discreta" in this.fuente.dataset);
    gris.imageSmoothingQuality = "high";
    gris.drawImage(this.fuente, ((ancho - dw) * foco[0]) / 100, ((alto - dh) * foco[1]) / 100, dw, dh);
    const datos = gris.getImageData(0, 0, ancho, alto).data;
    this.grises = new Float32Array(ancho * alto);
    this.cubierta = new Uint8Array(ancho * alto);
    for (let i = 0; i < this.grises.length; i++) {
      this.grises[i] = datos[i * 4] / 255;
      this.cubierta[i] = datos[i * 4 + 3] > 127 ? 1 : 0;
    }
    this.salida = this.contexto.createImageData(ancho, alto);
    this.pintar();
  }

  /**
   * Umbraliza a tres tintas: oscura en sombras, media en el cuerpo y clara en los brillos.
   * Al revelar, los píxeles salen del umbral más alto al más bajo, así que la lámina
   * aparece primero en sombra y los claros llegan al final.
   */
  pintar() {
    if (!this.salida) return;
    const { avance } = this.revelado;
    const { tinta, medio, luz } = this.tintas;
    const pixeles = this.salida.data;
    for (let y = 0, i = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++, i++) {
        const j = i * 4;
        const umbral = BAYER_8[(y & 7) * 8 + (x & 7)];
        if (!this.cubierta[i] || umbral < 1 - avance) {
          pixeles[j + 3] = 0;
          continue;
        }
        const gris = this.grises[i];
        let tono = medio;
        if (gris < umbral) tono = tinta;
        else if (gris >= 0.995 || (gris > 0.74 && (gris - 0.74) * 2.2 > umbral)) tono = luz;
        pixeles[j] = tono[0];
        pixeles[j + 1] = tono[1];
        pixeles[j + 2] = tono[2];
        pixeles[j + 3] = 255;
      }
    }
    this.contexto.putImageData(this.salida, 0, 0);
  }
}

/** Enciende las láminas estáticas; la portada la anima Portada.astro y las vivas, escenas.ts. */
export function iniciarLaminas() {
  const elementos = document.querySelectorAll<HTMLElement>("[data-lamina]:not([data-portada], [data-vivo])");
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
