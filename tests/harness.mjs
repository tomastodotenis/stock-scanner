// Utilidades compartidas por las pruebas: abre la app real en Chromium con todo lo externo simulado
// (Firebase, CDN, Odoo, audio), sin tocar datos reales.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..');
export const INDEX_URL = pathToFileURL(resolve(RAIZ, 'index.html')).href;

function lanzar() {
  const opciones = { args: ['--no-sandbox'] };
  const candidatos = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const c of candidatos) if (existsSync(c)) opciones.executablePath = c;
  return chromium.launch(opciones);
}

// productosOdoo: { codigoDeBarras: {name, sku, barcode, talle} }
export async function abrirApp({ productosOdoo = {}, audioFalso = false } = {}) {
  const browser = await lanzar();
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.addInitScript((usarAudioFalso) => {
    const mk = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : mk()), apply: () => mk(), construct: () => mk() });
    window.ZXing = mk(); window.XLSX = mk();
    if (usarAudioFalso) {
      window.__log = []; window.__instances = []; window.__resumeDelay = 100; window.__resumeFail = false;
      class FakeAC {
        constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; window.__instances.push(this); }
        resume() { return new Promise((res, rej) => setTimeout(() => { if (window.__resumeFail) return rej(new Error('x')); this.state = 'running'; res(); }, window.__resumeDelay)); }
        createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() { window.__log.push('start'); }, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      }
      window.AudioContext = FakeAC; window.webkitAudioContext = FakeAC;
    }
  }, audioFalso);

  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('file://')) return r.continue();
    if (u.includes('odoo-proxy')) {
      const code = decodeURIComponent(u.split('/barcode/')[1] || '');
      const p = productosOdoo[code];
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(p ? { found: true, product: p } : { found: false }) });
    }
    return r.abort(); // Firebase, CDN, promos, etc.: sin red en las pruebas
  });

  await page.goto(INDEX_URL);
  await page.waitForTimeout(600);
  return { page, errores, cerrar: () => browser.close() };
}

export const esperar = ms => new Promise(r => setTimeout(r, ms));
