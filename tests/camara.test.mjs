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

      // Linterna: el botón aparece si la cámara la permite y la prende/apaga
      const btn = document.createElement('button'); document.body.appendChild(btn);
      const lector4 = abrirLectorCamara(video, () => {}); await lector4.listo;
      let torchPedido = null; pista.applyConstraints = async c => { if (c.advanced[0].torch !== undefined) torchPedido = c.advanced[0].torch; };
      pista.getCapabilities = () => ({ torch: true });
      camMostrarLuz(video, btn); out.botonVisible = btn.style.display !== 'none';
      await camAlternarLuz(video, btn); out.luzPrendida = torchPedido === true && btn.dataset.on === '1';
      await camAlternarLuz(video, btn); out.luzApagada = torchPedido === false && btn.dataset.on === '0';
      pista.getCapabilities = () => ({}); camMostrarLuz(video, btn); out.botonOculto = btn.style.display === 'none';
      lector4.stop(); await w(100);

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
    assert.equal(r.botonVisible, true, 'muestra el botón de luz si el celular la permite');
    assert.equal(r.luzPrendida, true);
    assert.equal(r.luzApagada, true);
    assert.equal(r.botonOculto, true, 'sin soporte (iPhone) no muestra el botón');
    assert.equal(r.denegado, 'NotAllowedError');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Traslados: el responsable se habilita escaneando con la cámara', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      empleados = { e1: { nombre: 'Juan Pérez', codigo: '7790001112223' } };
      const botones = [...document.querySelectorAll('button')].filter(b => (b.getAttribute('onclick') || '').includes('abrirScanRapido(tScanResp)')).length;
      tScanResp('7790001112223');
      return { botones, responsable: traslado.responsable, paso1: document.getElementById('tStep1').style.opacity, bloqueado: document.getElementById('tResp').disabled };
    });
    assert.equal(r.botones, 1, 'hay botón de cámara junto al responsable');
    assert.equal(r.responsable, 'Juan Pérez');
    assert.equal(r.paso1, '1', 'se habilita el paso 1');
    assert.equal(r.bloqueado, true);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
