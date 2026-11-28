#!/usr/bin/env python3
"""Soft7 Fork table. Deterministic. Not a site build step.

Base: 16 Hz, C0 in scientific pitch (a power of two).
Piece 001 is harmonic 16 of that base, which is C4 = 256 Hz.
Each later piece is the next harmonic, so all 77 forks are unique.

  n          = 15 + tokenId                 # 16..92
  hz         = 16 * n                       # integer
  batch      = (tokenId - 1) // 11          # 0..6, eleven pieces each
  batchRoot  = hz of the first piece in that batch

The batch root is the hero's pulse for any piece in the batch.

WAV files are short synthesized forks (sine, not a voice, not a flute).
The pages resynthesize the same Hz values from tones.json.
"""
import json
import math
import struct
import wave
from pathlib import Path

FUNDAMENTAL = 16
NAMES = ["Threshold", "Wire", "Current", "Paint", "Lantern", "Span", "Gate"]
ROOT = Path(__file__).resolve().parent


def fmt(hz):
    return f"{hz:.2f}".rstrip("0").rstrip(".")


def tones():
    rows = []
    for token in range(1, 78):
        index = token - 1
        batch = index // 11
        position = index % 11
        partial = 15 + token
        hz = FUNDAMENTAL * partial
        root = FUNDAMENTAL * (15 + (batch * 11 + 1))
        rows.append(
            {
                "tokenId": token,
                "batch": batch + 1,
                "batchName": NAMES[batch],
                "batchRootHz": root,
                "partial": partial,
                "position": position + 1,
                "hz": hz,
                "label": f"{fmt(hz)} Hz · {NAMES[batch]}",
                "file": f"wav/{token:03d}.wav",
            }
        )
    return rows


def write_wav(path, hz, rate=8000, seconds=0.22):
    n = int(rate * seconds)
    frames = bytearray()
    for i in range(n):
        t = i / rate
        env = math.exp(-t * 12) * (1 - math.exp(-t * 200))
        sample = math.sin(2 * math.pi * hz * t)
        if hz * 2 < rate * 0.45:
            sample += math.sin(2 * math.pi * hz * 2 * t) * 0.1 * math.exp(-t * 30)
        sample = max(-1.0, min(1.0, sample * env * 0.9))
        frames += struct.pack("<h", int(sample * 32767))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(frames)


def main():
    rows = tones()
    seen = {}
    for row in rows:
        seen.setdefault(row["hz"], []).append(row["tokenId"])
    dupes = {hz: ids for hz, ids in seen.items() if len(ids) > 1}
    doc = {
        "name": "Soft7 Fork",
        "collection": "Soft7 77",
        "baseHz": FUNDAMENTAL,
        "baseName": "C0 scientific pitch",
        "keystoneHz": 256,
        "keystonePartial": 16,
        "batches": 7,
        "perBatch": 11,
        "partials": "16 through 92",
        "batchNames": NAMES,
        "formula": "hz = 16 * (15 + tokenId)",
        "note": "Synthesized tuning-fork sines. Not a voice. Not a flute.",
        "duplicateHz": dupes,
        "tones": rows,
    }
    (ROOT / "tones.json").write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        write_wav(ROOT / row["file"], row["hz"])
    print(f"wrote {len(rows)} tones; duplicate Hz groups: {len(dupes)}")


if __name__ == "__main__":
    main()
