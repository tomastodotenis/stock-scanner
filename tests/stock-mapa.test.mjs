import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Stock: tocar el sector abre el Mapa con ese sector resaltado', async () => {
  const { page, errores, cerrar } = await abrirApp({});
  try {
    const r = await page.evaluate(async () => {
      catalog = { '111': { name: 'Prod', sku: 'S1', barcode: '111', talle: '9', canonical: '111' } };
      depositos = { dep_a: { id: 'dep_a', nombre: 'Soler' } };
      depActivo = 'dep_a'; filterDep = 'dep_a';
      stockDB = { dep_a: { '111': 3 } };
      sectoresDB = { dep_a: { sec_1: { id: 'sec_1', nombre: '1H-PA-M1A-E1', codigo: 'SEC-1HPAM1AE1' } } };
      sectorMapDB = { dep_a: { '111': 'sec_1' } };
      mapaDB = { dep_a: [{ id: 'm1', tipo: 'sector', x: 10, y: 10, w: 120, h: 60, secIds: ['sec_1'], secId: 'sec_1' }] };
      switchTab('stock'); renderStock();
      const celda = document.querySelector('#stockList [data-ir-mapa]');
      if (!celda) return { sinCelda: true };
      celda.click();
      await new Promise(r => setTimeout(r, 300));
      return { mapaActivo: document.getElementById('page-mapa').classList.contains('active'), flash: !!document.querySelector('.mapa-flash') };
    });
    assert.ok(!r.sinCelda, 'el sector debe ser tocable');
    assert.ok(r.mapaActivo, 'debe abrir el Mapa');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
