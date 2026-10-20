import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Ranking: escanear un código llena el buscador con el producto (con palabras de menos si el título de MeLi difiere)', async () => {
  const { page, errores, cerrar } = await abrirApp({});
  try {
    const r = await page.evaluate(async () => {
      catalog = { '4066748509997': { name: 'Zapatilla Reebok Hombre Nanoflex Adventure Tr Petroleo', sku: 'S', barcode: '4066748509997', talle: '11', canonical: '4066748509997' } };
      rankingData = [{ title: 'Zapatillas Reebok Nanoflex Adventure Tr', units: 2, date: new Date(), talle: '11' }];
      const out = {};
      await rankScanCodigo('4066748509997');
      out.valor = document.getElementById('rankSearch').value;
      out.coincide = rankPalabrasCoinciden(out.valor.split(' '));
      document.getElementById('rankSearch').value = '';
      await rankScanCodigo('0000000000000'.replace(/0/g, '9'));
      out.noEncontrado = document.getElementById('rankScanInfo').textContent;
      return out;
    });
    assert.ok(r.valor.startsWith('zapatilla'), r.valor);
    assert.ok(r.coincide, 'debe quedar una búsqueda que encuentre el título de MeLi: ' + r.valor);
    assert.match(r.noEncontrado, /no encontrado/i);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
