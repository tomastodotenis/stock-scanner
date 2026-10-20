import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Escanear: cantidad manual suma/resta N, valida y vuelve a 1', async () => {
  const { page, errores, cerrar } = await abrirApp({});
  try {
    const r = await page.evaluate(async () => {
      catalog = { '111': { name: 'Prod', sku: 'S1', barcode: '111', talle: '9', canonical: '111' } };
      depositos = { dep_a: { nombre: 'Soler' } }; stockDB = { dep_a: {} }; depActivo = 'dep_a'; sectorMapDB = {};
      const q = document.getElementById('scanQty');
      const out = {};
      setModo('entrada');
      q.value = '12'; await processCode('111', false);
      out.tras12 = stockDB.dep_a['111']; out.qtyReset = q.value;
      await processCode('111', false);
      out.tras13 = stockDB.dep_a['111'];
      q.value = '0'; await processCode('111', false); out.cero = stockDB.dep_a['111'];
      q.value = 'abc'; await processCode('111', false); out.texto = stockDB.dep_a['111'];
      setModo('salida');
      q.value = '5'; await processCode('111', false); out.salida5 = stockDB.dep_a['111'];
      q.value = '100'; await processCode('111', false); out.salidaDeMas = stockDB.dep_a['111']; out.qtyTrasRechazo = q.value;
      return out;
    });
    assert.equal(r.tras12, 12); assert.equal(r.qtyReset, '1');
    assert.equal(r.tras13, 13);
    assert.equal(r.cero, 14); assert.equal(r.texto, 15);
    assert.equal(r.salida5, 10);
    assert.equal(r.salidaDeMas, 10, 'no deja descontar más de lo que hay');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
