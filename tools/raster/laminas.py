#!/usr/bin/env python3
"""Dibuja las láminas del sitio en escala de grises.

Cada lámina sale de datos o geometría reales del proyecto: puntos de una curva,
la S-box de AES, un estado de Keccak, la tabla de GF(2^8). El tramado no se hace
aquí: el navegador lo aplica al ancho exacto de pantalla (src/scripts/raster.ts).
Uso: python3 tools/raster/laminas.py [nombre ...]
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import hashlib

SALIDA = Path(__file__).resolve().parents[2] / "public" / "laminas"


def guardar(nombre, gris):
    imagen = Image.fromarray((np.clip(gris, 0, 1) * 255).astype(np.uint8))
    imagen.save(SALIDA / f"{nombre}.webp", quality=88, method=6)
    print(f"{nombre}: {imagen.width}x{imagen.height}")


def normalizar(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def trazar(sdf, ancho, alto, camara, mira, zoom=1.6, pasos=90, lejos=14.0):
    """Marcha de esferas vectorizada; devuelve punto, normal y máscara de impacto."""
    frente = normalizar(np.array(mira, float) - camara)
    derecha = normalizar(np.cross(frente, [0.0, 1.0, 0.0]))
    arriba = np.cross(derecha, frente)
    ys, xs = np.mgrid[0:alto, 0:ancho].astype(float)
    u = (2 * xs - ancho) / alto
    v = (alto - 2 * ys) / alto
    rayos = normalizar(u[..., None] * derecha + v[..., None] * arriba + zoom * frente)
    t = np.zeros((alto, ancho))
    vivo = np.ones((alto, ancho), bool)
    golpe = np.zeros((alto, ancho), bool)
    for _ in range(pasos):
        p = camara + rayos[vivo] * t[vivo][..., None]
        d = sdf(p)
        idx = np.flatnonzero(vivo.ravel())
        t.ravel()[idx] += d * 0.9
        cerca = d < 0.0015
        golpe.ravel()[idx[cerca]] = True
        fuera = t.ravel()[idx] > lejos
        vivo.ravel()[idx[cerca | fuera]] = False
        if not vivo.any():
            break
    p = camara + rayos * t[..., None]
    e = 0.0015
    nx = sdf(p + [e, 0, 0]) - sdf(p - [e, 0, 0])
    ny = sdf(p + [0, e, 0]) - sdf(p - [0, e, 0])
    nz = sdf(p + [0, 0, e]) - sdf(p - [0, 0, e])
    n = normalizar(np.stack([nx, ny, nz], -1))
    return p, n, golpe, rayos


def luz(n, rayos, direccion, ambiente=0.1, brillo=0.5):
    l = normalizar(np.array(direccion, float))
    lambert = np.clip((n * l).sum(-1), 0, 1)
    medio = normalizar(l - rayos)
    especular = np.clip((n * medio).sum(-1), 0, 1) ** 40
    return ambiente + (1 - ambiente) * lambert + brillo * especular


def puntos_curva(p):
    """Soluciones de y^2 = x^3 + 7 sobre F_p, la ecuación de secp256k1."""
    raices = {}
    for y in range(p):
        raices.setdefault(y * y % p, []).append(y)
    return [(x, y) for x in range(p) for y in raices.get((x**3 + 7) % p, [])]


def hero():
    """Toro (la curva sobre C) sobre sus puntos en un campo finito."""
    ancho, alto = 1920, 1200
    p = 1021
    puntos = puntos_curva(p)
    print(f"  E(F_{p}) tiene {len(puntos) + 1} puntos contando el infinito")

    cielo = np.ones((alto, ancho))
    ys, xs = np.mgrid[0:alto, 0:ancho].astype(float)
    for x, y in puntos:
        cx, cy = (x + 0.5) / p * ancho, (y + 0.5) / p * alto
        radio = 2.7
        x0, x1 = int(max(cx - 6, 0)), int(min(cx + 7, ancho))
        y0, y1 = int(max(cy - 6, 0)), int(min(cy + 7, alto))
        d = np.hypot(xs[y0:y1, x0:x1] - cx, ys[y0:y1, x0:x1] - cy)
        cielo[y0:y1, x0:x1] = np.minimum(cielo[y0:y1, x0:x1], (d > radio) * 1.0)

    R, r = 1.62, 0.47
    inclinacion = np.radians(58)
    c, s = np.cos(inclinacion), np.sin(inclinacion)
    ladeo = np.radians(-24)
    cz, sz = np.cos(ladeo), np.sin(ladeo)
    giro = np.array([[1, 0, 0], [0, c, -s], [0, s, c]]) @ np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])

    def sdf(q):
        q = q @ giro
        a = np.hypot(q[..., 0], q[..., 2]) - R
        return np.hypot(a, q[..., 1]) - r

    camara = np.array([-2.15, 0.45, 6.2])
    mira = [-2.15, 0.45, 0.0]
    punto, n, golpe, rayos = trazar(sdf, ancho, alto, camara, mira, zoom=2.25)
    tono = luz(n, rayos, [-0.5, 0.75, 0.55], ambiente=0.03, brillo=0.75)

    # Retícula de periodos: el toro es C módulo un retículo.
    q = punto @ giro
    u = np.arctan2(q[..., 2], q[..., 0])
    v = np.arctan2(q[..., 1], np.hypot(q[..., 0], q[..., 2]) - R)
    malla = np.minimum(
        np.abs(((u * 36 / (2 * np.pi)) % 1) - 0.5), np.abs(((v * 14 / (2 * np.pi)) % 1) - 0.5)
    )
    tono = np.where(malla < 0.04, tono * 0.45, tono)

    gris = cielo.copy()
    gris[golpe] = np.clip(tono[golpe], 0, 1)

    # Aclara la zona del título para que el texto se lea sobre el grabado.
    claro = np.clip((ys / alto - 0.42) / 0.2, 0, 1) * np.clip((0.62 - xs / ancho) / 0.14, 0, 1)
    arriba = np.clip((0.09 - ys / alto) / 0.05, 0, 1)
    gris = gris + (1 - gris) * np.maximum(claro, arriba) * (~golpe)
    guardar("hero", gris)


def moteado():
    """Manchas del verdín. El ruido se filtra con FFT para que el mosaico no tenga costuras."""
    lado = 720
    azar = np.random.default_rng(1021)

    def ruido(corte, potencia):
        fx = np.fft.fftfreq(lado)[:, None]
        fy = np.fft.fftfreq(lado)[None, :]
        f = np.hypot(fx, fy)
        filtro = 1 / np.maximum(f, corte) ** potencia
        campo = np.fft.ifft2(np.fft.fft2(azar.standard_normal((lado, lado))) * filtro).real
        return (campo - campo.mean()) / campo.std()

    manchas = 0.7 * ruido(0.004, 1.5) + 0.5 * ruido(0.03, 1.0)
    grano = azar.random((lado, lado))
    oscuro = np.clip(manchas - 0.35, 0, 1.6) / 1.6
    claro = np.clip(-manchas - 0.45, 0, 1.6) / 1.6
    rgba = np.zeros((lado, lado, 4), np.uint8)
    rgba[..., :3] = np.where((grano < oscuro * 0.9)[..., None], [15, 42, 39], [196, 224, 211])
    alfa = np.where(grano < oscuro * 0.9, 16, np.where(grano < claro * 0.9, 34, 0))
    rgba[..., 3] = alfa
    Image.fromarray(rgba).save(SALIDA / "moteado.webp", lossless=True, method=6)
    print("moteado:", (SALIDA / "moteado.webp").stat().st_size)


def isometrico(x, y, z, escala):
    return (x - y) * 0.866 * escala, (x + y) * 0.5 * escala - z * escala


def cubo(dibujo, cx, cy, x, y, z, alto, escala, caras):
    """Dibuja un prisma isométrico de base 1 x 1 con sus tres caras visibles."""
    def q(a, b, c):
        px, py = isometrico(a, b, c, escala)
        return cx + px, cy + py

    tapa = [q(x, y, z + alto), q(x + 0.92, y, z + alto), q(x + 0.92, y + 0.92, z + alto), q(x, y + 0.92, z + alto)]
    izq = [q(x, y + 0.92, z + alto), q(x + 0.92, y + 0.92, z + alto), q(x + 0.92, y + 0.92, z), q(x, y + 0.92, z)]
    der = [q(x + 0.92, y, z + alto), q(x + 0.92, y + 0.92, z + alto), q(x + 0.92, y + 0.92, z), q(x + 0.92, y, z)]
    dibujo.polygon(izq, fill=caras[1])
    dibujo.polygon(der, fill=caras[2])
    dibujo.polygon(tapa, fill=caras[0])


def sbox_aes():
    """S-box de AES calculada: inverso en GF(2^8) seguido de la transformación afín."""
    caja = [0] * 256
    p = q = 1
    while True:
        p = p ^ ((p << 1) & 0xff) ^ (0x1b if p & 0x80 else 0)
        q ^= q << 1
        q ^= q << 2
        q ^= q << 4
        q &= 0xff
        if q & 0x80:
            q ^= 0x09
        rota = lambda v, n: ((v << n) | (v >> (8 - n))) & 0xff
        caja[p] = (q ^ rota(q, 1) ^ rota(q, 2) ^ rota(q, 3) ^ rota(q, 4)) ^ 0x63
        if p == 1:
            break
    caja[0] = 0x63
    return caja


def sbox():
    """Relieve de la S-box: 16 x 16 columnas, cada altura es el byte sustituido."""
    caja = sbox_aes()
    assert caja[0x53] == 0xed and caja[0x00] == 0x63
    ancho, alto = 1600, 1160
    imagen = Image.new("L", (ancho, alto), 255)
    dibujo = ImageDraw.Draw(imagen)
    for suma in range(31):
        for x in range(16):
            y = suma - x
            if 0 <= y < 16:
                h = 0.25 + caja[x * 16 + y] / 255 * 6.5
                cubo(dibujo, ancho / 2, 350, x, y, 0, h, 50, (235, 118, 24))
    guardar("sbox", np.asarray(imagen) / 255)


def keccak_f(a):
    """Keccak-f[1600] sobre una matriz 5 x 5 de enteros de 64 bits."""
    rc, mascara = [], (1 << 64) - 1
    r = 1
    for _ in range(24):
        c = 0
        for j in range(7):
            r = ((r << 1) ^ ((r >> 7) * 0x71)) & 0xff
            if r & 2:
                c ^= 1 << ((1 << j) - 1)
        rc.append(c)
    rot = lambda v, n: ((v << n) | (v >> (64 - n))) & mascara if n else v
    for ronda in rc:
        c = [a[x][0] ^ a[x][1] ^ a[x][2] ^ a[x][3] ^ a[x][4] for x in range(5)]
        d = [c[(x + 4) % 5] ^ rot(c[(x + 1) % 5], 1) for x in range(5)]
        a = [[a[x][y] ^ d[x] for y in range(5)] for x in range(5)]
        x, y = 1, 0
        actual = a[x][y]
        for t in range(24):
            x, y = y, (2 * x + 3 * y) % 5
            actual, a[x][y] = a[x][y], rot(actual, ((t + 1) * (t + 2) // 2) % 64)
        a = [[a[x][y] ^ (~a[(x + 1) % 5][y] & a[(x + 2) % 5][y] & mascara) for y in range(5)] for x in range(5)]
        a[0][0] ^= ronda
    return a


def keccak():
    """Estado real de SHA3-256 tras absorber "SDOC", con cada bit como un cubo."""
    mensaje = b"SDOC"
    bloque = bytearray(136)
    bloque[: len(mensaje)] = mensaje
    bloque[len(mensaje)] ^= 0x06
    bloque[135] ^= 0x80
    a = [[0] * 5 for _ in range(5)]
    for i in range(17):
        a[i % 5][i // 5] ^= int.from_bytes(bloque[i * 8 : i * 8 + 8], "little")
    a = keccak_f(a)
    salida = b"".join(a[i % 5][i // 5].to_bytes(8, "little") for i in range(4))
    assert salida == hashlib.sha3_256(mensaje).digest()

    rebanadas = 22
    ancho, alto = 1600, 1100
    imagen = Image.new("L", (ancho, alto), 255)
    dibujo = ImageDraw.Draw(imagen)
    for y in range(5):
        for z in range(rebanadas):
            for x in range(5):
                if (a[x][y] >> z) & 1:
                    cubo(dibujo, ancho * 0.22, 290, z * 1.0, x * 1.0, y * 1.0, 0.9, 54, (235, 120, 26))
    guardar("keccak", np.asarray(imagen) / 255)


def gf256():
    """Tabla de multiplicar de GF(2^8) con el polinomio 0x11b, el campo de Shamir."""
    a = np.arange(256, dtype=np.uint16)[:, None] * np.ones(256, np.uint16)
    b = a.T.copy()
    r = np.zeros((256, 256), np.uint16)
    for _ in range(8):
        r ^= a * (b & 1)
        alto_bit = a & 0x80
        a = (a << 1) & 0xff
        a ^= (alto_bit >> 7) * 0x1b
        b >>= 1
    assert r[0x57, 0x83] == 0xc1
    guardar("gf256", np.kron(1 - r / 255.0, np.ones((4, 4))))


def ulam():
    """Espiral de Ulam: cada punto oscuro es un primo, como los que componen n en RSA."""
    lado = 201
    total = lado * lado
    criba = np.ones(total + 1, bool)
    criba[:2] = False
    for i in range(2, int(total**0.5) + 1):
        if criba[i]:
            criba[i * i :: i] = False
    rejilla = np.ones((lado, lado))
    x = y = lado // 2
    dx, dy, tramo, n = 1, 0, 1, 1
    while n <= total:
        for _ in range(2):
            for _ in range(tramo):
                if n <= total and 0 <= x < lado and 0 <= y < lado:
                    rejilla[y, x] = 0.0 if criba[n] else 1.0
                x, y, n = x + dx, y + dy, n + 1
            dx, dy = -dy, dx
        tramo += 1
    guardar("ulam", np.kron(rejilla, np.ones((2, 2))))


def cadena():
    """Tres eslabones: raíz, emisor y dispositivo. La cadena X.509, literal."""
    ancho, alto = 1400, 1500
    centros = [np.array([-1.5, 1.95, 0.0]), np.array([0.0, 0.0, 0.0]), np.array([1.5, -1.95, 0.0])]
    eje = normalizar(np.array([1.5, -1.95, 0.0]))
    normal = np.array([0.0, 0.0, 1.0])
    lateral = np.cross(eje, normal)

    def eslabon(q, giro):
        c, s = np.cos(giro), np.sin(giro)
        a = (q * eje).sum(-1)
        b = c * (q * lateral).sum(-1) + s * (q * normal).sum(-1)
        d = -s * (q * lateral).sum(-1) + c * (q * normal).sum(-1)
        a = np.maximum(np.abs(a) - 0.72, 0)
        return np.hypot(np.hypot(a, b) - 0.7, d) - 0.2

    def sdf(q):
        distancias = [eslabon(q - centro, i * np.pi / 2 + 0.5) for i, centro in enumerate(centros)]
        return np.minimum.reduce(distancias)

    camara = np.array([0.0, 0.0, 9.5])
    punto, n, golpe, rayos = trazar(sdf, ancho, alto, camara, [0, 0, 0], zoom=2.5, pasos=110, lejos=20)
    tono = luz(n, rayos, [-0.6, 0.7, 0.5], ambiente=0.04, brillo=0.9)
    gris = np.ones((alto, ancho))
    gris[golpe] = np.clip(tono[golpe], 0, 1)
    guardar("cadena", gris)


LAMINAS = {
    "hero": hero,
    "moteado": moteado,
    "sbox": sbox,
    "keccak": keccak,
    "gf256": gf256,
    "ulam": ulam,
    "cadena": cadena,
}

if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre in sys.argv[1:] or LAMINAS:
        LAMINAS[nombre]()
