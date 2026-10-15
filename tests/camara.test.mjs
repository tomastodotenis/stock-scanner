import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

// Lector de cámara: con lector nativo lee rápido y se detiene limpio; sin permiso avisa; parar antes de tiempo no deja la cámara abierta.
test('Cámara: lector nativo lee, libera la cámara y respeta los errores de permiso', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async () => {
      const out = {}; const w = ms => new Promise(r => setTimeout(r, ms));
      let pistasDetenidas = 0, pedidos = 0, modo = 'ok';
      const lienzo = document.createElement('canvas'); lienzo.width = 32; lienzo.height = 32; lienzo.getContext('2d').fillRect(0, 0, 32, 32);
      const stream = lienzo.captureStream(5);
      const pista = stream.getVideoTracks()[0];
      pista.stop = () => { pistasDetenidas++; };
      pista.getCapabilities = () => ({ focusMode: ['continuous'] });
      pista.applyConstraints = async () => { out.enfoque = true; };
      navigator.mediaDevices.getUserMedia = async () => {
        pedidos++;
        if (modo === 'denegado') { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; }
        return stream;
      };
      let intentos = 0;
      window.BarcodeDetector = class { static async getSupportedFormats() { return ['ean_13', 'code_128']; } async detect() { intentos++; return intentos >= 2 ? [{ rawValue: '7791234567890' }] : []; } };

      const video = document.createElement('video'); video.muted = true; video.setAttribute('playsinline', 'true'); document.body.appendChild(video);
      const leidos = [];
      const lector = abrirLectorCamara(video, c => leidos.push(c));
      await lector.listo; await w(500);
      out.leyo = leidos.length > 0 && leidos[0] === '7791234567890';
      lector.stop(); await w(300);
      out.pistasTrasStop = pistasDetenidas;
      const antes = intentos; await w(400); out.sigueLeyendoTrasStop = intentos !== antes;

      // Parar antes de que termine de abrir: no queda la cámara encendida
      pistasDetenidas = 0;
      const l2 = abrirLectorCamara(video, () => {}); l2.stop(); await l2.listo.catch(() => {}); await w(200);
      out.paradoTempranoSinPistas = pistasDetenidas >= 1 || pedidos >= 1;

      // Permiso denegado: el error llega a quien llama (muestra "No se pudo acceder a la cámara")
      modo = 'denegado';
      const l3 = abrirLectorCamara(video, () => {});
      try { await l3.listo; out.denegado = 'sin error'; } catch (e) { out.denegado = e.name; }
      return out;
    });
    assert.equal(r.leyo, true, 'el lector nativo entrega el código');
    assert.equal(r.enfoque, true, 'pide enfoque continuo');
    assert.ok(r.pistasTrasStop >= 1, 'al parar libera la cámara');
    assert.equal(r.sigueLeyendoTrasStop, false, 'al parar deja de leer');
    assert.equal(r.denegado, 'NotAllowedError');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
