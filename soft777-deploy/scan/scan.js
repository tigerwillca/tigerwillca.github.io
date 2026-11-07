/**
 * Soft 7 scan — barcode + wallet (read-only).
 * HARD: no signing, no transactions, no WalletConnect pairing, no mint,
 * no private keys, no contract writes. A wc: payload is rejected
 * (remint halted). RPC is limited to eth_getBalance and eth_call.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Soft7Scan = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CHAIN_ID = 4663;
  const RPC = "https://rpc.mainnet.chain.robinhood.com";
  const EXPLORER = "https://robinhoodchain.blockscout.com";
  const OWNER = "0xe53bdb2118585d5b2cd06a117d3a036afa70677a";
  const SOFT7 = "0x73D7b2611509C14078e16f572bE5aC7D91879DC2";
  const SOFT777 = "0xd402e72cad129c2E64A9b04B5e8Ec93D1d64DFDF";
  const BALANCE_OF_SEL = "0x70a08231";

  const PRODUCT_LABELS = {
    EAN_13: "EAN-13",
    EAN_8: "EAN-8",
    UPC_A: "UPC-A",
    UPC_E: "UPC-E",
    CODE_128: "Code128",
    CODE_39: "Code 39",
    ITF: "ITF",
    CODABAR: "Codabar",
  };

  function strip(s) {
    return String(s == null ? "" : s).trim();
  }

  /** Keccak-256 hex (no 0x). CDN js-sha3 sets keccak_256; Node sets sha3.keccak_256. */
  function keccakHex(msg) {
    const g = typeof globalThis !== "undefined" ? globalThis : {};
    if (g.sha3 && typeof g.sha3.keccak_256 === "function") {
      return g.sha3.keccak_256(msg);
    }
    if (typeof g.keccak_256 === "function") return g.keccak_256(msg);
    if (typeof require === "function") {
      try {
        const lib = require("js-sha3");
        if (lib && typeof lib.keccak_256 === "function") return lib.keccak_256(msg);
      } catch (_) { /* missing in the browser */ }
    }
    throw new Error("js-sha3 keccak_256 unavailable");
  }

  function toChecksumAddress(addr) {
    const lower = strip(addr).replace(/^0x/i, "").toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(lower)) return null;
    const hash = keccakHex(lower);
    let out = "0x";
    for (let i = 0; i < 40; i++) {
      out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
    }
    return out;
  }

  function isValidChecksumOrAnyCase(addr) {
    const s = strip(addr);
    if (!/^0x[0-9a-fA-F]{40}$/.test(s)) return { ok: false, reason: "not 40 hex" };
    const allLower = s === s.toLowerCase();
    const allUpper = s.slice(2) === s.slice(2).toUpperCase();
    const cs = toChecksumAddress(s);
    if (!cs) return { ok: false, reason: "checksum fail" };
    if (allLower || allUpper) return { ok: true, address: cs, note: "normalized to EIP-55" };
    if (s === cs) return { ok: true, address: cs, note: "EIP-55 ok" };
    return { ok: false, reason: "bad EIP-55 checksum", expected: cs };
  }

  /**
   * Extract a wallet address from plain 0x or ethereum: / EIP-681 URI.
   * ethereum:0xabc@4663 or ethereum:0xabc?… or ethereum:pay-0x…
   */
  function extractAddress(raw) {
    const t = strip(raw);
    if (/^0x[0-9a-fA-F]{40}$/.test(t)) return t;
    const m = t.match(/^ethereum:(?:pay-)?(0x[0-9a-fA-F]{40})/i);
    if (m) return m[1];
    return null;
  }

  /**
   * Classify a decoded barcode / QR string.
   * @returns {{ kind: string, raw: string }}
   */
  function classify(raw) {
    const t = strip(raw);
    if (!t) return { kind: "empty", raw: t };

    if (/^wc:/i.test(t)) {
      return {
        kind: "wc_rejected",
        raw: t,
        note: "remint halted",
        message: "WalletConnect URI ignored — Soft7 remint halted. No pairing.",
      };
    }

    const addr = extractAddress(t);
    if (addr) {
      const v = isValidChecksumOrAnyCase(addr);
      if (!v.ok) {
        return {
          kind: "wallet_invalid",
          raw: t,
          address: addr,
          reason: v.reason,
          expected: v.expected || null,
        };
      }
      return {
        kind: "wallet",
        raw: t,
        address: v.address,
        checksumNote: v.note,
        source: /^ethereum:/i.test(t) ? "eip681" : "plain0x",
      };
    }

    if (/^\d{8}$/.test(t) || /^\d{12}$/.test(t) || /^\d{13}$/.test(t) || /^\d{14}$/.test(t)) {
      let fmt = "UPC/EAN";
      if (t.length === 13) fmt = "EAN-13";
      else if (t.length === 12) fmt = "UPC-A";
      else if (t.length === 8) fmt = "EAN-8";
      else if (t.length === 14) fmt = "GTIN-14";
      return { kind: "product", raw: t, format: fmt };
    }

    return { kind: "text", raw: t, format: "QR/other" };
  }

  function normalizeFormat(fmt) {
    if (!fmt) return "";
    return String(fmt).trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function formatLabel(fmt) {
    const n = normalizeFormat(fmt);
    if (PRODUCT_LABELS[n]) return PRODUCT_LABELS[n];
    if (n === "QR_CODE") return "QR";
    return "";
  }

  /**
   * classify(), plus a 1D format reported by ZXing / BarcodeDetector
   * (Code128 and friends are not always all-numeric).
   */
  function present(raw, decoderFormat) {
    const c = classify(raw);
    const norm = normalizeFormat(decoderFormat);
    const productLabel = PRODUCT_LABELS[norm] || "";
    if (c.kind === "product") {
      return Object.assign({}, c, { format: productLabel || c.format });
    }
    if (c.kind === "text" && productLabel) {
      return { kind: "product", raw: c.raw, format: productLabel };
    }
    return c;
  }

  function lookupUrl(code) {
    return "https://www.google.com/search?q=" + encodeURIComponent(strip(code));
  }

  function cameraErrorHelp(err) {
    const name = (err && err.name) || "";
    const msg = (err && err.message) || "";
    if (name === "SecurityError" || /secure|https/i.test(msg)) {
      return "The camera only works on a secure page (https). Open this scan link with https, or use Upload photo.";
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || /permission|denied|not allowed/i.test(msg)) {
      return "Camera permission is off. On iPhone: Settings → Safari → Camera → Allow. Then reload this page and tap Start scan. You can also use Upload photo.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
      return "No usable camera was found. Use Upload photo instead.";
    }
    if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
      return "The camera is busy in another app. Close that app, then tap Start scan. Or use Upload photo.";
    }
    return "Could not start the camera. Allow camera access when the browser asks, or use Upload photo.";
  }

  function padAddressForCall(addr) {
    return strip(addr).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  }

  async function rpc(method, params) {
    if (method !== "eth_getBalance" && method !== "eth_call") {
      throw new Error("read-only rpc");
    }
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || "rpc error");
    return j.result;
  }

  function hexToBigInt(h) {
    if (!h || h === "0x") return 0n;
    return BigInt(h);
  }

  function formatEth(wei) {
    const w = typeof wei === "bigint" ? wei : BigInt(wei);
    const whole = w / 10n ** 18n;
    const frac = (w % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
    return frac ? whole + "." + frac.slice(0, 6) : whole.toString();
  }

  function formatCount(s) {
    const n = typeof s === "bigint" ? s : BigInt(s);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  async function readWalletBalances(address) {
    const a = strip(address);
    const data = BALANCE_OF_SEL + padAddressForCall(a);
    const ethHex = await rpc("eth_getBalance", [a, "latest"]);
    const soft7Hex = await rpc("eth_call", [{ to: SOFT7, data: data }, "latest"]);
    const soft777Hex = await rpc("eth_call", [{ to: SOFT777, data: data }, "latest"]);
    return {
      chainId: CHAIN_ID,
      address: a,
      ethWei: hexToBigInt(ethHex).toString(),
      eth: formatEth(hexToBigInt(ethHex)),
      soft7: hexToBigInt(soft7Hex).toString(),
      soft777: hexToBigInt(soft777Hex).toString(),
      soft7Display: formatCount(hexToBigInt(soft7Hex)),
      soft777Display: formatCount(hexToBigInt(soft777Hex)),
      contracts: { soft7: SOFT7, soft777: SOFT777 },
      explorer: EXPLORER + "/address/" + a,
    };
  }

  function zxingFormatName(ZX, format) {
    if (format == null) return "";
    if (typeof format === "string") return format;
    const table = ZX.BarcodeFormat || {};
    const keys = Object.keys(table);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (table[key] === format && Number.isNaN(Number(key))) return key;
    }
    return String(format);
  }

  /**
   * Decode RGBA (or ImageData) with @zxing/library.
   * opts.thorough tries a second binarizer and an inverted image (photo upload).
   * @returns {{text: string, format: string} | null}
   */
  function decodeRgba(ZX, rgba, width, height, opts) {
    if (!ZX || typeof ZX.MultiFormatReader !== "function" || typeof ZX.RGBLuminanceSource !== "function") {
      return null;
    }
    const bytes = rgba && rgba.data ? rgba.data : rgba;
    if (!bytes || !width || !height) return null;
    const pixels = width * height;
    const lum = new Uint8ClampedArray(pixels);
    const n = Math.min(bytes.length, pixels * 4);
    for (let i = 0, p = 0; i < n; i += 4, p++) {
      lum[p] = (bytes[i] + (bytes[i + 1] << 1) + bytes[i + 2]) >> 2;
    }

    const tryHarder = !opts || opts.tryHarder !== false;
    const thorough = !!(opts && opts.thorough);
    const BF = ZX.BarcodeFormat || {};
    const formats = [];
    const names = ["QR_CODE", "EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "CODE_39", "ITF", "CODABAR"];
    for (let i = 0; i < names.length; i++) {
      if (BF[names[i]] != null) formats.push(BF[names[i]]);
    }
    const hints = new Map();
    if (ZX.DecodeHintType && formats.length) {
      hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, formats);
      if (tryHarder && ZX.DecodeHintType.TRY_HARDER != null) {
        hints.set(ZX.DecodeHintType.TRY_HARDER, true);
      }
    }

    const binarizers = ["HybridBinarizer"];
    if (thorough && typeof ZX.GlobalHistogramBinarizer === "function") {
      binarizers.push("GlobalHistogramBinarizer");
    }
    const planes = [lum];
    if (thorough) {
      const inv = new Uint8ClampedArray(lum.length);
      for (let i = 0; i < lum.length; i++) inv[i] = 255 - lum[i];
      planes.push(inv);
    }

    for (let s = 0; s < planes.length; s++) {
      for (let b = 0; b < binarizers.length; b++) {
        const Bin = ZX[binarizers[b]];
        if (typeof Bin !== "function") continue;
        try {
          const source = new ZX.RGBLuminanceSource(planes[s], width, height);
          const bitmap = new ZX.BinaryBitmap(new Bin(source));
          const reader = new ZX.MultiFormatReader();
          if (hints.size) reader.setHints(hints);
          const result = reader.decode(bitmap);
          const text = result && result.getText ? result.getText() : "";
          if (!text) continue;
          return { text: text, format: zxingFormatName(ZX, result.getBarcodeFormat()) };
        } catch (_) { /* NotFoundException — try the next pass */ }
      }
    }
    return null;
  }

  return {
    CHAIN_ID: CHAIN_ID,
    RPC: RPC,
    EXPLORER: EXPLORER,
    OWNER: OWNER,
    SOFT7: SOFT7,
    SOFT777: SOFT777,
    classify: classify,
    present: present,
    formatLabel: formatLabel,
    lookupUrl: lookupUrl,
    cameraErrorHelp: cameraErrorHelp,
    extractAddress: extractAddress,
    toChecksumAddress: toChecksumAddress,
    isValidChecksumOrAnyCase: isValidChecksumOrAnyCase,
    readWalletBalances: readWalletBalances,
    formatEth: formatEth,
    rpc: rpc,
    decodeRgba: decodeRgba,
  };
});
