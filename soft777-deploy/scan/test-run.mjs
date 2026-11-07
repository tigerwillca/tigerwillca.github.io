/**
 * Headless checks for Soft 7 scan.
 * 1. Four prototype QR payloads (regenerated PNGs of the original strings) classify.
 * 2. A generated EAN-13 image decodes through scan.js decodeRgba (ZXing).
 * 3. One read-only Robinhood Chain balance lookup.
 * 4. Playwright + system Chrome: page libs, fake camera, upload of the four QRs,
 *    and the EAN-13 through the page's ZXing path.
 */
import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sha3 = require("js-sha3");
globalThis.sha3 = sha3;

const { PNG } = require("pngjs");
const jsQRMod = require("jsqr");
const jsQR = jsQRMod.default || jsQRMod;
const ZX = require("@zxing/library");
const bwipjs = require("bwip-js");
const QRCode = require("qrcode");
const Soft7Scan = require("./scan.js");

const EXPECT_CHECKSUM = "0xe53bdb2118585d5B2cD06a117d3A036AFA70677a";
const EAN = "5901234123457";
const CODE128 = "SOFT7TEST";

const QR_SAMPLES = [
  ["addr", "0xe53bdb2118585d5b2cd06a117d3a036afa70677a", "wallet"],
  ["eip681", "ethereum:0xe53bdb2118585d5b2cd06a117d3a036afa70677a@4663", "wallet"],
  ["wc", "wc:deadbeef@2?relay-protocol=irn&symKey=0000000000000000000000000000000000000000", "wc_rejected"],
  ["ean13qr", "0123456789012", "product"],
];

const fails = [];
function check(name, ok, detail) {
  console.log(ok ? "PASS" : "FAIL", name, detail || "");
  if (!ok) fails.push(name + (detail ? ": " + detail : ""));
}

function assertNoWrites(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const banned = [
    "eth_sendTransaction",
    "eth_sign",
    "personal_sign",
    "signTypedData",
    "eth_sendRawTransaction",
    "ownerMint",
    "SoftSevenSign",
    "privateKey",
  ];
  for (const word of banned) {
    check("no " + word + " in " + path.basename(filePath), !src.includes(word));
  }
  return src;
}

function decodePng(buf) {
  const png = PNG.sync.read(buf);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
    inversionAttempts: "attemptBoth",
  });
  return { png, text: code ? code.data : null };
}

function serve(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("no");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(file);
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".png": "image/png",
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

console.log("=== static guards ===");
const html = assertNoWrites(path.join(__dirname, "index.html"));
assertNoWrites(path.join(__dirname, "scan.js"));
check("robots noindex", /<meta\s+name="robots"\s+content="noindex">/.test(html));
check("playsinline", html.includes("playsinline"));
check("muted video", /<video[^>]*muted/.test(html));
check("facingMode environment", html.includes('facingMode: { ideal: "environment" }') || html.includes("environment"));
check("zxing cdn pin", html.includes("@zxing/library@0.21.3"));
check("upload control", html.includes("Upload photo"));
check("scan again label", html.includes("Scan again"));

console.log("\n=== classify units ===");
const units = [
  ["0xe53bdb2118585d5b2cd06a117d3a036afa70677a", "wallet"],
  ["ethereum:0xe53bdb2118585d5b2cd06a117d3a036afa70677a@4663", "wallet"],
  ["wc:abc@2?x=1", "wc_rejected"],
  ["0123456789012", "product"],
  ["hello soft7", "text"],
];
for (const [raw, expect] of units) {
  const c = Soft7Scan.classify(raw);
  check("unit " + expect, c.kind === expect, c.kind);
}
const wc = Soft7Scan.classify(QR_SAMPLES[2][1]);
check("wc note remint halted", wc.note === "remint halted" && wc.kind === "wc_rejected", wc.note);
const cs = Soft7Scan.toChecksumAddress(Soft7Scan.OWNER);
check("EIP-55", cs === EXPECT_CHECKSUM, cs);
const bad = cs.slice(0, -1) + (cs.endsWith("a") ? "A" : "a");
const badC = Soft7Scan.classify(bad);
check("bad EIP-55 rejected", badC.kind === "wallet_invalid", badC.kind + " " + (badC.reason || ""));
check("code128 present", Soft7Scan.present(CODE128, "CODE_128").kind === "product");
check("wallet not overridden by QR format", Soft7Scan.present(Soft7Scan.OWNER, "QR_CODE").kind === "wallet");
const help = Soft7Scan.cameraErrorHelp({ name: "NotAllowedError" });
check("permission help", /Safari/.test(help) && /Upload photo/.test(help), help);
check("lookup url", Soft7Scan.lookupUrl(EAN) === "https://www.google.com/search?q=" + EAN);
let writeBlocked = false;
try {
  await Soft7Scan.rpc("eth_sendTransaction", []);
} catch (e) {
  writeBlocked = /read-only/.test(String(e.message || e));
}
check("rpc rejects sends", writeBlocked);

console.log("\n=== QR png decode + classify ===");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "soft7-scan-"));
const qrFiles = [];
for (const [name, payload, expectKind] of QR_SAMPLES) {
  const buf = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
  const fp = path.join(tmp, name + ".png");
  fs.writeFileSync(fp, buf);
  qrFiles.push(fp);
  const decoded = decodePng(buf);
  const c = Soft7Scan.classify(decoded.text || "");
  check(
    "qr " + name,
    decoded.text === payload && c.kind === expectKind,
    (decoded.text || "(no decode)") + " → " + c.kind
  );
}

console.log("\n=== ZXing EAN-13 + Code128 ===");
const eanPng = await bwipjs.toBuffer({
  bcid: "ean13",
  text: EAN,
  scale: 3,
  height: 14,
  includetext: false,
  paddingwidth: 18,
  paddingheight: 18,
  backgroundcolor: "FFFFFF",
});
const eanPath = path.join(tmp, "ean13-1d.png");
fs.writeFileSync(eanPath, eanPng);
const eanImg = PNG.sync.read(eanPng);
const eanHit = Soft7Scan.decodeRgba(ZX, eanImg.data, eanImg.width, eanImg.height, {
  tryHarder: true,
  thorough: true,
});
check(
  "zxing ean13",
  !!(eanHit && eanHit.text === EAN && eanHit.format === "EAN_13"),
  eanHit ? eanHit.text + " " + eanHit.format : "no decode"
);
check("ean present product", eanHit && Soft7Scan.present(eanHit.text, eanHit.format).kind === "product");

const c128Png = await bwipjs.toBuffer({
  bcid: "code128",
  text: CODE128,
  scale: 3,
  height: 14,
  includetext: false,
  paddingwidth: 18,
  paddingheight: 18,
  backgroundcolor: "FFFFFF",
});
const c128Path = path.join(tmp, "code128.png");
fs.writeFileSync(c128Path, c128Png);
const c128Img = PNG.sync.read(c128Png);
const c128Hit = Soft7Scan.decodeRgba(ZX, c128Img.data, c128Img.width, c128Img.height, {
  tryHarder: true,
  thorough: true,
});
check(
  "zxing code128",
  !!(c128Hit && c128Hit.text === CODE128 && c128Hit.format === "CODE_128"),
  c128Hit ? c128Hit.text + " " + c128Hit.format : "no decode"
);

const blank = new Uint8ClampedArray(48 * 48 * 4);
blank.fill(255);
check("zxing blank is null", Soft7Scan.decodeRgba(ZX, blank, 48, 48, { thorough: true }) === null);

console.log("\n=== live RPC read-only ===");
let balances = null;
try {
  balances = await Soft7Scan.readWalletBalances(Soft7Scan.OWNER);
  console.log(JSON.stringify(balances, null, 2));
  check("rpc chain", balances.chainId === 4663);
  check("rpc address", balances.address.toLowerCase() === Soft7Scan.OWNER);
  check("rpc eth present", typeof balances.eth === "string" && balances.eth.length > 0, balances.eth);
  check("rpc soft7 numeric", /^\d+$/.test(balances.soft7), balances.soft7);
  check("rpc soft777 numeric", /^\d+$/.test(balances.soft777), balances.soft777);
  check("rpc contracts", balances.contracts.soft7 === Soft7Scan.SOFT7 && balances.contracts.soft777 === Soft7Scan.SOFT777);
} catch (e) {
  check("rpc read", false, e.message || String(e));
}

if (fails.length) {
  console.error("\nNode checks failed, skipping browser:\n" + fails.join("\n"));
  process.exit(1);
}

console.log("\n=== Playwright page ===");
const server = await serve(__dirname);
const port = server.address().port;
const base = "http://127.0.0.1:" + port + "/";
const chrome = fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/local/bin/google-chrome";
let browser;
try {
  browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (err) => console.log("PAGEERROR", err.message || err));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE", msg.text());
  });
  await page.goto(base, { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.Soft7Scan && window.ZXing && typeof jsQR === "function" && typeof keccak_256 === "function");

  const meta = await page.locator('meta[name="robots"]').getAttribute("content");
  check("page robots", meta === "noindex", meta);
  const videoAttrs = await page.$eval("#video", (v) => ({
    playsinline: v.hasAttribute("playsinline") || v.playsInline === true,
    muted: v.muted,
  }));
  check("page playsinline", videoAttrs.playsinline === true);
  check("page muted", videoAttrs.muted === true);

  const pageCs = await page.evaluate(() => Soft7Scan.toChecksumAddress("0xe53bdb2118585d5b2cd06a117d3a036afa70677a"));
  check("page keccak checksum", pageCs === EXPECT_CHECKSUM, pageCs);
  const pageHelp = await page.evaluate(() => Soft7Scan.cameraErrorHelp({ name: "NotAllowedError" }));
  check("page permission help", /Upload photo/.test(pageHelp) && /Safari/.test(pageHelp));

  await page.click("#btnStart");
  await page.waitForFunction(() => {
    const v = document.getElementById("video");
    return !!(v && v.videoWidth > 0);
  }, null, { timeout: 10000 });
  const hudLive = await page.locator("#hud").innerText();
  check("camera started", /Scanning/.test(hudLive), hudLive);
  await page.click("#btnStop");
  await page.waitForFunction(() => !document.getElementById("video").srcObject);
  const startLabel = await page.locator("#btnStart").innerText();
  check("stop restores start", startLabel === "Start scan", startLabel);

  const expectations = [
    { file: qrFiles[0], needle: "Balances (read-only)", also: EXPECT_CHECKSUM },
    { file: qrFiles[1], needle: "eip681", also: "ETH" },
    { file: qrFiles[2], needle: "Remint halted", also: "remint halted" },
    { file: qrFiles[3], needle: "0123456789012", also: "EAN-13" },
  ];
  for (const exp of expectations) {
    await page.setInputFiles("#file", exp.file);
    await page.waitForFunction(
      (needles) => {
        const t = document.getElementById("result").innerText;
        return t.includes(needles[0]) && t.includes(needles[1]);
      },
      [exp.needle, exp.also],
      { timeout: 20000 }
    );
    const text = await page.locator("#result").innerText();
    check("upload " + path.basename(exp.file), text.includes(exp.needle) && text.includes(exp.also), text.slice(0, 180).replace(/\n/g, " | "));
  }

  await page.evaluate(() => { window.__SOFT7_FORCE_ZXING = true; });
  await page.setInputFiles("#file", eanPath);
  await page.waitForFunction(
    (code) => {
      const t = document.getElementById("result").innerText;
      return t.includes(code) && t.includes("ZXing");
    },
    EAN,
    { timeout: 20000 }
  );
  const eanText = await page.locator("#result").innerText();
  const eanHref = await page.locator("a.lookup").getAttribute("href");
  check("page zxing ean13", eanText.includes(EAN) && eanText.includes("EAN-13") && eanText.includes("ZXing"), eanText.slice(0, 200).replace(/\n/g, " | "));
  check("page lookup link", eanHref === "https://www.google.com/search?q=" + EAN, eanHref);

  await page.setInputFiles("#file", c128Path);
  await page.waitForFunction(
    (code) => {
      const t = document.getElementById("result").innerText;
      return t.includes(code) && t.includes("ZXing");
    },
    CODE128,
    { timeout: 20000 }
  );
  const c128Text = await page.locator("#result").innerText();
  check("page zxing code128", c128Text.includes(CODE128) && c128Text.includes("Code128"), c128Text.slice(0, 180).replace(/\n/g, " | "));
} catch (e) {
  check("playwright", false, e && e.stack ? e.stack : String(e));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const summary = {
  checksum: cs,
  balances: balances,
  ean: eanHit,
  code128: c128Hit,
  fails: fails,
};
fs.writeFileSync(path.join(__dirname, "test-results.json"), JSON.stringify(summary, null, 2));
console.log("\nWrote test-results.json");
if (fails.length) {
  console.error("\nFAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log("\nALL PASS");
