#!/usr/bin/env python3
"""
Fokuspunkt – generativer Hintergrundmusik-Renderer.

Erzeugt ruhige Instrumental-Stuecke in fuenf Kategorien
(piano, ambient, acoustic, nature, light) komplett offline mit numpy.
Seed pro Track => reproduzierbar. Kein Model, keine GPU, kein Internet.

Aufruf:
    python3 tools/genmusic/gen.py --per 24 --out tools/genmusic/out --jobs 7
Ausgabe: out/<category>/<file>.ogg + out/manifest.json
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import wave
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np

SR = 44100
TAU = 2 * math.pi

MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]

PROGS_MAJ = [
    [0, 5, 3, 4], [0, 5, 2, 3], [0, 3, 4, 3], [0, 1, 3, 4],
    [0, 4, 5, 3], [3, 4, 0, 4], [0, 1, 4, 3], [0, 5, 1, 4],
]
PROGS_MIN = [[0, 5, 2, 6], [0, 6, 5, 2], [0, 3, 5, 4], [0, 6, 3, 4]]

RHY4 = [
    [(0.0, 1.5), (1.5, 0.5), (2.0, 2.0)],
    [(0.0, 1.0), (1.0, 1.0), (2.0, 1.0), (3.0, 1.0)],
    [(0.5, 1.0), (1.5, 0.5), (2.0, 0.5), (3.0, 1.0)],
    [(0.0, 2.0), (2.0, 1.0), (3.0, 1.0)],
    [(0.0, 0.5), (0.5, 0.5), (1.0, 1.0), (2.5, 1.5)],
    [(1.0, 1.0), (2.0, 2.0)],
]
RHY3 = [
    [(0.0, 2.0), (2.0, 1.0)],
    [(0.0, 1.0), (1.0, 1.0), (2.0, 1.0)],
    [(0.5, 1.0), (2.0, 1.0)],
]

ARP_POOLS = [
    [0, 1, 2, 1], [0, 1, 2, 3, 2, 1], [0, 2, 1, 3, 0, 2], [0, 1, 2, 0],
]

CATEGORIES = ["piano", "ambient", "acoustic", "nature", "light"]


def pan_g(p: float) -> tuple[float, float]:
    a = (p + 1.0) * math.pi / 4.0
    return math.cos(a), math.sin(a)


# ---------------------------------------------------------------- filter ---


def lowpass(x: np.ndarray, cut: float, order: int = 3) -> np.ndarray:
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(x.shape[-1], 1 / SR)
    X *= 1.0 / (1.0 + (f / max(cut, 20.0)) ** (2 * order))
    return np.fft.irfft(X, x.shape[-1]).astype(np.float32)


def highpass(x: np.ndarray, cut: float, order: int = 2) -> np.ndarray:
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(x.shape[-1], 1 / SR)
    r = (f / max(cut, 20.0)) ** (2 * order)
    X *= r / (1.0 + r)
    return np.fft.irfft(X, x.shape[-1]).astype(np.float32)


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return highpass(lowpass(x, hi, 3), lo, 2)


def convolve_oa(x: np.ndarray, ir: np.ndarray, block: int = 1 << 18) -> np.ndarray:
    """Exakte lineare Faltung per Overlap-Add."""
    L = len(ir)
    step = max(block - L, 1 << 16)
    n = len(x)
    out = np.zeros(n + L, dtype=np.float32)
    H = np.fft.rfft(ir, block).astype(np.complex64)
    for i in range(0, n, step):
        seg = x[i : i + step]
        Y = np.fft.rfft(seg, block).astype(np.complex64) * H
        y = np.fft.irfft(Y, block)[:block].astype(np.float32)
        end = min(i + block, len(out))
        out[i:end] += y[: end - i]
    return out[:n]


def make_ir(rng: np.random.Generator, decay: float, lp_cut: float) -> np.ndarray:
    n = int((decay + 0.4) * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n).astype(np.float32)
    x *= np.exp(-t * (6.9 / decay)).astype(np.float32)
    x[: int(0.018 * SR)] = 0
    x = lowpass(x, lp_cut, 2)
    x /= np.sqrt(np.mean(x * x)) + 1e-9
    return x


def fade_edges(sig: np.ndarray, atk: float, rel: float) -> np.ndarray:
    na, nr = max(int(atk * SR), 1), max(int(rel * SR), 2)
    if len(sig) > na + nr:
        sig[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, na, dtype=np.float32))
        sig[-nr:] *= np.linspace(1, 0, nr, dtype=np.float32)
    return sig


class Bus:
    def __init__(self, seconds: float):
        self.n = int(seconds * SR)
        self.buf = np.zeros((2, self.n), dtype=np.float32)

    def add(self, sig: np.ndarray, when: float, pan: float = 0.0, gain: float = 1.0):
        i = int(when * SR)
        if i < 0 or i >= self.n or len(sig) == 0:
            return
        gl, gr = pan_g(pan)
        n = min(len(sig), self.n - i)
        self.buf[0, i : i + n] += sig[:n] * (gl * gain)
        self.buf[1, i : i + n] += sig[:n] * (gr * gain)


# ---------------------------------------------------------------- synths ---


def s_piano(rng, f, dur, vel, bright=1.0):
    K = 12
    while K > 3 and f * K > 17000:
        K -= 1
    n = int((dur + 2.6) * SR)
    t = np.arange(n, dtype=np.float64) / SR
    B = 0.00035
    out = np.zeros(n, dtype=np.float32)
    tau0 = min(4.5, 3.0 * (220.0 / f) ** 0.30)
    base = np.exp(-t / tau0).astype(np.float32)
    tail = t > dur
    base[tail] *= np.exp(-(t[tail] - dur) * 14)
    for k in range(1, K + 1):
        fk = f * k * math.sqrt(1 + B * k * k)
        if fk > 17500:
            break
        amp = vel / k ** (1.15 + 0.4 * bright) * rng.uniform(0.85, 1.15)
        env = base * np.exp(-t / (tau0 / (1 + 0.5 * (k - 1))), dtype=np.float32)
        out += (amp * np.sin(TAU * fk * t + rng.uniform(0, TAU))).astype(np.float32) * env
    th = int(0.006 * SR)
    out[:th] += lowpass(rng.standard_normal(th).astype(np.float32), 1900, 2) * vel * 0.09
    return fade_edges(out, 0.0015, 0.004)


def s_pluck(rng, f, dur, vel):
    K = 9
    while K > 3 and f * K > 15000:
        K -= 1
    n = int((min(dur, 4) + 1.6) * SR)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float32)
    for k in range(1, K + 1):
        fk = f * k * math.sqrt(1 + 0.0006 * k * k)
        tau = 0.55 / ((f ** 0.35) * (k ** 0.7)) + 0.25
        amp = vel / k ** 1.08 * rng.uniform(0.88, 1.12)
        out += (amp * np.sin(TAU * fk * t + rng.uniform(0, TAU))).astype(np.float32) * np.exp(
            -t / tau, dtype=np.float32
        )
    body = (np.sin(TAU * 98 * t) * np.exp(-t / 0.09)).astype(np.float32) * vel * 0.15
    out[: len(body)] += body
    return fade_edges(out, 0.002, 0.006)


def s_pad(rng, f, dur, vel):
    n = int((dur + 3.0) * SR)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float32)
    atk = min(dur * 0.45, 1.8)
    rel = 2.6
    env = np.clip(np.minimum(t / atk, (dur + rel - t) / rel), 0, 1)
    trem = 1.0 + 0.10 * np.sin(TAU * rng.uniform(0.12, 0.25) * t + rng.uniform(0, TAU))
    for det in (-0.004, 0.0, 0.004):
        fd = f * (1 + det)
        for k in range(1, 6):
            out += (vel * 0.30 / k ** 2.1) * np.sin(TAU * fd * k * t + rng.uniform(0, TAU))
    return (out * env * trem).astype(np.float32)


def s_bell(rng, f, dur, vel):
    n = int(4.0 * SR)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float32)
    sc = (660.0 / f) ** 0.30
    for p, a, tau in ((1.0, 1.0, 2.8), (2.76, 0.30, 1.2), (5.4, 0.09, 0.5), (8.93, 0.03, 0.2)):
        out += (vel * a * np.sin(TAU * f * p * t + rng.uniform(0, TAU))).astype(np.float32) * np.exp(
            -t / (tau * sc), dtype=np.float32
        )
    return fade_edges(out, 0.003, 0.010)


def s_marimba(rng, f, dur, vel):
    n = int(1.6 * SR)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float32)
    for p, a, tau in ((1.0, 1.0, 0.8), (3.9, 0.15, 0.22), (9.2, 0.04, 0.06)):
        out += (vel * a * np.sin(TAU * f * p * t + rng.uniform(0, TAU))).astype(np.float32) * np.exp(
            -t / tau, dtype=np.float32
        )
    cl = int(0.004 * SR)
    out[:cl] += lowpass(rng.standard_normal(cl).astype(np.float32), 3200, 2) * vel * 0.07
    return fade_edges(out, 0.002, 0.006)


def s_bass(rng, f, dur, vel):
    hold = min(dur, 3.0)
    n = int((hold + 0.8) * SR)
    t = np.arange(n, dtype=np.float64) / SR
    env = (np.clip(np.minimum(t / 0.035, (hold + 0.7 - t) / 0.7), 0, 1) * np.exp(-t / 2.4)).astype(np.float32)
    out = np.zeros(n, dtype=np.float32)
    for k, a in ((1, 1.0), (2, 0.40), (3, 0.12)):
        out += (vel * a * np.sin(TAU * f * k * t + rng.uniform(0, TAU))).astype(np.float32)
    return out * env


def s_shaker(rng, vel):
    n = int(0.09 * SR)
    x = rng.standard_normal(n).astype(np.float32)
    x = highpass(x, 2400, 2) - highpass(x, 6800, 2)
    env = (np.linspace(1, 0, n, dtype=np.float32) ** 1.7).astype(np.float32)
    return fade_edges(x * env * vel, 0.006, 0.012)


def s_kick(rng, vel):
    n = int(0.34 * SR)
    t = np.arange(n, dtype=np.float64) / SR
    fi = 46 + 55 * np.exp(-t / 0.03)
    return (vel * np.sin(TAU * np.cumsum(fi) / SR) * np.exp(-t / 0.12)).astype(np.float32)


def s_chirp(rng, vel):
    parts = []
    for _ in range(int(rng.integers(1, 5))):
        ndur = rng.uniform(0.035, 0.095)
        n = int(ndur * SR)
        t = np.arange(n, dtype=np.float64) / SR
        f0 = rng.uniform(1900, 4600)
        fi = f0 * (1 + rng.uniform(-0.45, 0.55) * (t / ndur))
        parts.append((np.sin(TAU * np.cumsum(fi) / SR) * np.exp(-t / (ndur / 2.5))).astype(np.float32) * vel)
        parts.append(np.zeros(int(rng.uniform(0.02, 0.08) * SR), dtype=np.float32))
    return np.concatenate(parts[:-1])


def s_drop(rng, vel):
    n = int(0.35 * SR)
    t = np.arange(n, dtype=np.float64) / SR
    y = np.sin(TAU * rng.uniform(700, 2200) * t) * np.exp(-t / 0.055)
    y += (rng.standard_normal(n) * np.exp(-t / 0.004)).astype(np.float32) * 0.22
    return (y * vel).astype(np.float32)


def wind_bed(rng, dur, vel):
    n = int(dur * SR) + SR
    t = np.arange(n, dtype=np.float64) / SR
    a = np.cumsum(rng.standard_normal(n))
    a -= np.linspace(a[0], a[-1], n)
    a = (a / (np.abs(a).max() + 1e-9)).astype(np.float32)
    a = lowpass(a, 480, 2)
    am = 1 + 0.55 * np.sin(TAU * rng.uniform(0.04, 0.09) * t + rng.uniform(0, TAU)) \
         + 0.30 * np.sin(TAU * rng.uniform(0.11, 0.22) * t + rng.uniform(0, TAU))
    x = a * am.astype(np.float32)
    x = bandpass(x, 60, 900)
    x *= np.clip(t / 3.0, 0, 1) * np.clip((dur + 1 - t) / 3.0, 0, 1)
    return (x * vel * 0.11).astype(np.float32)


def NOTE(name, rng, midi, dur, vel, kw):
    f = 440.0 * 2.0 ** ((midi - 69) / 12.0) if midi else 0.0
    if name == "piano":
        return s_piano(rng, f, dur, vel, bright=0.45 if kw.get("dark") else kw.get("bright", 1.0))
    if name == "pluck":
        return s_pluck(rng, f, dur, vel * (0.7 if kw.get("soft") else 1.0))
    if name == "pad":
        return s_pad(rng, f, dur, vel)
    if name == "bell":
        return s_bell(rng, f, dur, vel)
    if name == "marimba":
        return s_marimba(rng, f, dur, vel)
    if name == "bass":
        return s_bass(rng, f, dur, vel)
    if name == "shaker":
        return s_shaker(rng, vel)
    if name == "kick":
        return s_kick(rng, vel)
    if name == "bird":
        return s_chirp(rng, vel)
    if name == "drop":
        return s_drop(rng, vel)
    if name == "wind":
        return wind_bed(rng, dur, vel)
    raise KeyError(name)


# ----------------------------------------------------------- composition ---


def degree_midi(scale, keyroot, d: int) -> int:
    return keyroot + scale[d % 7] + 12 * (d // 7)


def chord_tones_midi(scale, keyroot, prog_deg, seventh):
    """Akktoenetone (diatonisch) gefaltet in Mittel-Lage [keyroot+12, keyroot+24)."""
    ds = [prog_deg, prog_deg + 2, prog_deg + 4] + ([prog_deg + 6] if seventh else [])
    lo = keyroot + 12
    seen, tones = set(), []
    for dd in ds:
        m = degree_midi(scale, keyroot, dd)
        m = ((m - lo) % 12) + lo
        if m not in seen:
            seen.add(m)
            tones.append(m)
    tones.sort()
    return tones


def snap_degree(d: int, deg: int) -> int:
    ct = [deg, deg + 2, deg + 4]
    ct += [c + 7 for c in ct]
    return min(ct, key=lambda c: abs(c - d))


def melody_phrase(rng, scale, meter, keyroot, prog, bar_start, d_cur, vel_base):
    """Zwei-Takt-Phrase: (events, neue Gradlage); event = (beat_abs, dur_beats, midi, vel)."""
    ev = []
    rhy = RHY4 if meter == 4 else RHY3
    d = d_cur
    for p in range(2):
        cell = rhy[int(rng.integers(0, len(rhy)))]
        for pos, ln in cell:
            if rng.random() < 0.28:
                continue
            d = int(np.clip(d + int(rng.choice([-2, -1, 1, 1, 2])), 7, 14))
            strong = abs(pos % 2) < 1e-9
            if strong or rng.random() < 0.4:
                d = max(7, min(14, snap_degree(d, prog[(bar_start + p) % 4])))
            midi = degree_midi(scale, keyroot, d)
            vel = vel_base * rng.uniform(0.85, 1.1) * (1.0 if ln >= 1.0 else 0.85)
            ev.append((pos + (bar_start + p) * meter, ln, midi, vel))
    if ev:
        last0, last1, _, lastv = ev[-1]
        d2 = max(7, min(14, snap_degree(d, prog[(bar_start + 2) % 4])))
        ev[-1] = (last0, last1, degree_midi(scale, keyroot, d2), lastv * 1.05)
        d = d2
    return ev, d


def sec_flags(total_bars):
    intro, outro = 4, 4
    middle = max(8, total_bars - intro - outro)
    sec, rem = [], middle
    for i in range(3):
        b = min(8, rem) if i < 2 else rem
        if b <= 0:
            break
        sec.append(b)
        rem -= b
    return [(intro, 0)] + [(b, min(3 + i, 5)) for i, b in enumerate(sec)] + [(outro, 1)]


# ------------------------------------------------------------------- mix ---


def finalize(bus: Bus, cfg_mix: dict, tail_s: float) -> np.ndarray:
    """In-place pro Kanal: trockenes Signal + naechste Faltung, minimaler Peak."""
    dry = bus.buf
    n = dry.shape[1]
    rng = cfg_mix["rng"]
    wet = cfg_mix["wet"]
    for c in (0, 1):
        ir = make_ir(rng, cfg_mix["decay"], cfg_mix["ir_lp"])
        w = convolve_oa(np.ascontiguousarray(dry[c]), ir)[:n]
        dry[c] *= 0.94
        dry[c] += w * wet
        del w, ir
    for c in (0, 1):
        dry[c] = highpass(dry[c], 27, 2)
    seg = dry[:, int(0.1 * n) : int(0.95 * n)]
    rms = float(np.sqrt(np.mean(seg * seg))) + 1e-9
    dry *= cfg_mix["target_rms"] / rms
    peak = float(np.max(np.abs(dry)))
    if peak > 0.98:
        dry *= 0.98 / peak
    fade_start = max(n - int(tail_s * SR), 0)
    ramp = np.linspace(1, 0, n - fade_start, dtype=np.float32) ** 1.3
    dry[:, fade_start:] *= ramp
    ni = int(0.4 * SR)
    dry[:, :ni] *= np.linspace(0, 1, ni, dtype=np.float32)
    return dry


# ----------------------------------------------------------------- track ---


def render_track(category: str, seed: int):
    rng = np.random.default_rng(seed)
    mode_major = rng.random() < (0.55 if category == "ambient" else 0.85)
    scale = MAJOR if mode_major else MINOR
    prog = list(rng.choice(PROGS_MAJ if mode_major else PROGS_MIN))
    if category == "nature":
        prog = [0, 3, 0, 4] if mode_major else [0, 5, 0, 3]
    keyroot = 48 + int(rng.integers(0, 12))
    seventh = rng.random() < 0.55
    meter = 4 if category in ("ambient", "nature") else (3 if rng.random() < 0.22 else 4)
    bpm = {
        "piano": rng.uniform(58, 74),
        "ambient": rng.uniform(48, 60),
        "acoustic": rng.uniform(66, 84),
        "nature": 60.0,
        "light": rng.uniform(84, 100),
    }[category]
    if meter == 3:
        bpm *= 0.82
    bar_s = meter * 60.0 / bpm
    dur_target = {
        "piano": rng.uniform(150, 210),
        "ambient": rng.uniform(170, 220),
        "acoustic": rng.uniform(140, 190),
        "nature": rng.uniform(180, 230),
        "light": rng.uniform(130, 170),
    }[category]
    total_bars = int(max(16, dur_target / bar_s))
    flags = sec_flags(total_bars)
    section_of = []
    for bars, d in flags:
        section_of += [d] * bars
    while len(section_of) < total_bars + 2:
        section_of.append(3)

    bar_t = [0.0]
    for b in range(1, total_bars + 2):
        bar_t.append(bar_t[-1] + bar_s * (1.0 + 0.020 * math.sin(b * 0.9 + seed) + float(rng.normal(0, 0.006))))
    track_end = bar_t[total_bars]
    bus = Bus(track_end + 6.0)

    arp_seq = ARP_POOLS[int(rng.integers(0, len(ARP_POOLS)))]

    def put(name, when, dur, midi, vel, pan, **kw):
        sig = NOTE(name, rng, midi, dur, vel, kw)
        bus.add(sig, when, pan)

    for bar in range(total_bars):
        dens = section_of[bar]
        t0 = bar_t[bar]
        deg = prog[bar % 4]
        tones = chord_tones_midi(scale, keyroot, deg, seventh)
        rootm = keyroot + scale[deg % 7]
        vel_swing = [1.0, 0.82, 0.92, 0.8]

        if category == "piano":
            put("piano", t0 + rng.normal(0, 0.006), bar_s * 0.55, rootm - 12, 0.30, -0.10)
            if dens >= 1 and meter == 4:
                put("piano", t0 + bar_s * 0.5, bar_s * 0.5, rootm + 7, 0.20, 0.12)
            if dens >= 2:
                for e in range(meter * 2):
                    if rng.random() < 0.13:
                        continue
                    idx = arp_seq[e % len(arp_seq)]
                    tn = tones[idx % len(tones)] + 12 * ((e // len(arp_seq)) % 2)
                    put("piano", t0 + e * bar_s / (meter * 2), bar_s / meter * 1.6, tn,
                        0.125 * vel_swing[e % 4], 0.25 - 0.1 * (e % 3))
        elif category == "acoustic":
            put("pluck", t0, bar_s * 0.6, rootm - 12, 0.26, -0.18)
            if meter == 4:
                put("pluck", t0 + 2 * bar_s / 4, bar_s * 0.6, rootm - 5, 0.19, 0.10)
            pat = [0, 2, 1, 3, 2, 1, 3, 2][: meter * 2]
            for e in range(meter * 2):
                tn = tones[pat[e % len(pat)] % len(tones)] + 12
                put("pluck", t0 + e * bar_s / (meter * 2) + 0.025, bar_s / meter, tn,
                    0.15 * vel_swing[e % 4], 0.28 + rng.normal(0, 0.06))
            if dens >= 4:
                for tn in tones:
                    put("pluck", t0 + rng.uniform(0, 0.05), bar_s * 1.2, tn, 0.085, 0.0, soft=1)
        elif category == "ambient":
            if bar % 2 == 0:
                span = max(len(tones) - 1, 1)
                for i2, tn in enumerate(tones):
                    put("pad", t0, bar_s * 2 * 0.96, tn, 0.16, -0.55 + i2 * (1.1 / span))
                put("bass", t0, bar_s * 1.9, rootm - 12, 0.15, 0.0)
            if dens >= 3 and bar % 2 == 1:
                tn = tones[int(rng.integers(0, len(tones)))] + 12
                put("bell", t0 + bar_s * rng.choice([0.0, 0.5]), 0.5, tn, 0.09, rng.uniform(-0.6, 0.6))
            if dens >= 4 and bar % 4 in (2, 3):
                for e in (0, 2):
                    tn = tones[int(rng.integers(0, len(tones)))]
                    put("pluck", t0 + e * bar_s / 4, bar_s, tn, 0.075, rng.uniform(-0.4, 0.4))
        elif category == "light":
            put("bass", t0, bar_s * 0.5, rootm - 12, 0.22, 0.0)
            put("kick", t0, 0, 0, 0.10, 0.0)
            if meter == 4:
                put("kick", t0 + bar_s * 0.5, 0, 0, 0.05, 0.0)
            for e in range(meter):
                put("shaker", t0 + (e + 0.5) * bar_s / meter, 0, 0, 0.05, rng.uniform(-0.2, 0.2))
            if dens >= 2:
                for off in (0.5, 1.5):
                    if off < meter:
                        for tn in tones[:3]:
                            put("marimba", t0 + off * bar_s / 2, 0.4, tn, 0.05, 0.0)
            if dens >= 3:
                d0 = 8 + int(rng.integers(0, 3))
                for e in range(meter * 2):
                    if rng.random() < 0.28:
                        continue
                    d0 = int(np.clip(d0 + int(rng.choice([-2, -1, 1, 1, 2])), 7, 14))
                    if e % 4 == 0:
                        d0 = max(7, min(14, snap_degree(d0, deg)))
                    put("marimba", t0 + e * bar_s / (meter * 2), 0.4,
                        degree_midi(scale, keyroot, d0), 0.11 * vel_swing[e % 4], rng.uniform(-0.3, 0.3))
        elif category == "nature":
            if bar % 8 == 0:
                put("wind", t0, bar_s * 8, 0, 1.0, 0.0)
            for _ in range(int(rng.poisson(1.2 if dens >= 3 else 0.7))):
                put("bird", t0 + rng.uniform(0.2, bar_s - 0.3), 0, 0, rng.uniform(0.05, 0.11), rng.uniform(-0.7, 0.7))
            if rng.random() < 0.45:
                put("drop", t0 + rng.uniform(0, bar_s), 0, 0, rng.uniform(0.05, 0.09), rng.uniform(-0.5, 0.5))
            if dens >= 2 and bar % 4 == 0:
                for tn in tones:
                    put("piano", t0 + rng.uniform(0.2, 1.2), bar_s * 2, tn + 12, 0.05, 0.0, dark=1)
            if dens >= 3 and bar % 8 == 4:
                put("pad", t0, bar_s * 4, tones[0], 0.045, -0.3)
                put("pad", t0, bar_s * 4, tones[-1], 0.045, 0.3)

    # Melodie-Layer piano/acoustic
    if category in ("piano", "acoustic"):
        d_cur = 8 + int(rng.integers(0, 2))
        velm = 0.21 if category == "piano" else 0.16
        for bar in range(0, total_bars - 1, 2):
            if section_of[bar] >= 3 and section_of[bar + 1] >= 3 and rng.random() < 0.82:
                ev, d_cur = melody_phrase(rng, scale, meter, keyroot, prog, bar, d_cur, velm)
                for when_b, ln, midi, vel in ev:
                    bi = int(when_b // meter)
                    when = bar_t[min(bi, len(bar_t) - 1)] + (when_b % meter) * bar_s / meter
                    name = "piano" if category == "piano" else "pluck"
                    put(name, when + rng.normal(0, 0.008), max(0.35, ln * bar_s / meter), midi, vel, 0.05)

    cfg_mix = {
        "rng": rng,
        "decay": {"piano": 1.7, "ambient": 3.4, "acoustic": 1.9, "nature": 3.0, "light": 1.5}[category],
        "ir_lp": {"piano": 5200, "ambient": 3400, "acoustic": 4600, "nature": 3800, "light": 5600}[category],
        "wet": {"piano": 0.30, "ambient": 0.55, "acoustic": 0.34, "nature": 0.52, "light": 0.26}[category],
        "target_rms": {"piano": 0.070, "ambient": 0.062, "acoustic": 0.072, "nature": 0.058, "light": 0.082}[category],
    }
    out = finalize(bus, cfg_mix, tail_s=3.2)
    meta = {
        "category": category,
        "seconds": round(out.shape[1] / SR, 2),
        "bpm": round(bpm, 1),
        "meter": meter,
        "mode": "dur" if mode_major else "moll",
    }
    return out, meta


# ------------------------------------------------------------- pipeline ---

COMPOUND_OK = {"kling", "weg", "weise", "lied", "klang", "duft", "nacht", "sonne", "ruf", "tanz", "ruhe", "blick", "sacht", "hell", "mut", "freude", "glanz", "sprung"}

TITLE_PARTS = {
    "piano": (["Morgenlicht", "Stiller", "Sanfter", "Warme", "Leiser", "Klarer", "Goldener", "Ruher"],
              ["regen", "Nachmittag", "weg", "Licht", "See", "Garten", "Abend", "Zeit", "Traum", "Insel", "Klavier", "Hafen"]),
    "ambient": (["Nebel", "Weite", "Schweben", "Horizont", "Aurora", "Wolke", "Klang", "Lichtung",
                 "Spiegel", "Tiefsee", "Mondaufgang", "Daemmerung"],
                ["I", "II", "III", "IV", "V", "VII", "IX", "XI", "XII"]),
    "acoustic": (["Zupf", "Saiten", "Rinden", "Lagerfeuer", "Wanderers", "Dorfers", "Herbst",
                  "Kiefern", "Segel", "Hof", "Tal", "Wiesen"],
                 ["klang", "weg", "weise", "lied", "duft", "nacht", "sonne", "ruf", "tanz", "ruhe"]),
    "nature": (["Vogelkonzert", "Waldesrauschen", "Regenfenster", "Bachlauf", "Seewind", "Dunst",
                "Morgennebel", "Abendchor", "Quellstein", "Wipfel", "Nachtigall", "Tautropfen"],
               ["I", "II", "III", "IV", "V", "VI", "VIII", "X"]),
    "light": (["Honig", "Sonnenschein", "Kringel", "Bienen", "Limonaden", "Karussell", "Flieder",
               "Tropfen", "Wolken", "Feen", "Marmeladen", "Kiesel"],
              ["blick", "sacht", "hell", "mut", "freude", "glanz", "lied", "sprung", "tanz", "sonne", "zeit"]),
}


def make_title(category: str, seed: int, idx: int) -> str:
    rng = np.random.default_rng(seed * 7919 + idx)
    a, b = TITLE_PARTS[category]
    x, y = str(rng.choice(a)), str(rng.choice(b))
    if category in ("piano", "acoustic", "light"):
        return f"{x}{y}" if y in COMPOUND_OK else f"{x} {y}"
    return f"{x} {y}".strip()


def render_one(args_tuple):
    category, idx, seed, _bitrate = args_tuple
    out, meta = render_track(category, seed)
    meta["title"] = make_title(category, seed, idx)
    meta["file"] = f"{category}/{category}-{idx:02d}.ogg"
    return category, idx, seed, out, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per", type=int, default=24, help="Tracks pro Kategorie")
    ap.add_argument("--out", default="tools/genmusic/out")
    ap.add_argument("--jobs", type=int, default=7)
    ap.add_argument("--bitrate", default="48k")
    ap.add_argument("--only", default=None)
    ap.add_argument("--base-seed", type=int, default=20260925)
    a = ap.parse_args()

    out_root = Path(a.out)
    cats = [a.only] if a.only else CATEGORIES
    tasks = []
    manifest = []
    for ci, cat in enumerate(cats):
        (out_root / cat).mkdir(parents=True, exist_ok=True)
        for i in range(1, a.per + 1):
            ogg = out_root / cat / f"{cat}-{i:02d}.ogg"
            seed = a.base_seed + ci * 1000 + i
            if ogg.exists() and ogg.stat().st_size > 50_000:
                # Resume: fertig gerenderten Track nur in die Manifeste aufnehmen.
                dur = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", str(ogg)],
                    capture_output=True, text=True,
                ).stdout.strip()
                manifest.append({
                    "category": cat,
                    "seconds": round(float(dur), 2),
                    "title": make_title(cat, seed, i),
                    "file": f"{cat}/{cat}-{i:02d}.ogg",
                    "size_kb": ogg.stat().st_size // 1024,
                })
                continue
            tasks.append((cat, i, seed, a.bitrate))
    n_done = len(manifest)
    if n_done:
        print(f"Resume: {n_done} vorhandene Tracks uebersprungen", flush=True)
    with ProcessPoolExecutor(max_workers=a.jobs) as pool:
        futs = {pool.submit(render_one, t): t for t in tasks}
        for fut in as_completed(futs):
            cat, idx, seed, out, meta = fut.result()
            wav = out_root / cat / f"{cat}-{idx:02d}.wav"
            ogg = out_root / cat / f"{cat}-{idx:02d}.ogg"
            with wave.open(str(wav), "wb") as w:
                w.setnchannels(2)
                w.setsampwidth(2)
                w.setframerate(SR)
                w.writeframes((out.T * 32767.0).astype(np.int16).reshape(-1).tobytes())
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                 "-c:a", "libopus", "-b:a", a.bitrate, "-vbr", "on", "-compression_level", "10",
                 str(ogg)],
                check=True,
            )
            wav.unlink()
            meta["size_kb"] = ogg.stat().st_size // 1024
            manifest.append(meta)
            n_done += 1
            print(f"[{n_done}/{len(tasks)}] {meta['file']}  {meta['seconds']:.0f}s  {meta['size_kb']}KB  {meta['title']}", flush=True)

    manifest.sort(key=lambda m: m["file"])
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "manifest.json").write_text(
        json.dumps({"generated": a.base_seed, "tracks": manifest}, ensure_ascii=False, indent=1)
    )
    total_mb = sum(m["size_kb"] for m in manifest) / 1024
    print(f"\n{len(manifest)} Tracks, {total_mb:.1f} MB gesamt -> {out_root}")


if __name__ == "__main__":
    sys.exit(main())
