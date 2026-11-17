import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Stock › Ventas MeLi: el buscador filtra por nombre, SKU, código escaneado, sector y Nº de venta (incluye preparados)', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      const ahora = new Date().toISOString();
      depositos = { dep_s: { nombre: 'Soler' } };
      sectoresDB = { dep_s: { s1: { id: 's1', nombre: '1A-E2', codigo: 'SEC-1AE2' } } };
      sectorMapDB = { dep_s: { K1: 's1' } };
      catalog = {
        K1: { name: 'Saucony Triumph 23 Gris', sku: 'SAU-T23', barcode: 'K1', talle: '42', canonical: 'K1' },
        K2: { name: 'Joma Set S2543 Marino', sku: 'JOM-S2543', barcode: 'K2', talle: 'M', canonical: 'K2' },
      };
      vmDB = {
        v1: { id: 'v1', orderId: '2000011112222', aplicado: true, fecha: ahora, depId: 'dep_s', items: [{ key: 'K1', sku: 'SAU-T23', qty: 1, antes: 2, despues: 1 }] },
        v2: { id: 'v2', orderId: '2000033334444', aplicado: true, fecha: ahora, depId: 'dep_s', preparados: { 0: { por: 'x' } }, items: [{ key: 'K2', sku: 'JOM-S2543', qty: 1, antes: 1, despues: 0 }] },
      };
      switchTab('stock'); switchSub('ventas');
      const n = q => { document.getElementById('vmBuscar').value = q; vmRender(); return document.querySelectorAll('#vmList [onclick^="vmMarcar"], #vmList span').length ? [...document.querySelectorAll('#vmList > div')].filter(d => !d.classList.contains('empty')).length : 0; };
      return { todos: n(''), nombre: n('triumph gris'), sku: n('jom-s2543'), codigo: n('K1'), sector: n('1a-e2'), venta: n('33334444'), nada: n('adidas') };
    });
    assert.equal(r.todos, 1, 'sin búsqueda: solo los no preparados');
    assert.equal(r.nombre, 1);
    assert.equal(r.sku, 1, 'encuentra también los preparados');
    assert.equal(r.codigo, 1);
    assert.equal(r.sector, 1);
    assert.equal(r.venta, 1);
    assert.equal(r.nada, 0);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
