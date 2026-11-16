import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Ventas Local: vendedor obligatorio, descuenta solo del Local, manda al Sheet y anula con PIN de caja', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async () => {
      const out = {}, escrituras = [], envios = [];
      window._fb = {
        auth: {}, onAuthStateChanged: () => () => {},
        db: {}, doc: (...a) => a.slice(1).join('/'), collection: (...a) => a.slice(1).join('/'),
        setDoc: async (ref, data) => { escrituras.push({ ref, data }); }, addDoc: async () => ({}),
        serverTimestamp: () => 0, increment: x => ({ inc: x }), deleteField: () => null,
      };
      window.fetch = async (url, opt) => { envios.push(JSON.parse(opt.body)); return { json: async () => ({ ok: true }) }; };
      currentUser = { email: 'caja@x', uid: 'u1' };
      depositos = { dep_s: { nombre: 'Depósito Soler' }, dep_l: { nombre: 'Depósito Local' } };
      stockDB = { dep_s: { K: 7 }, dep_l: { K: 2 } };
      depActivo = 'dep_s'; // aunque el aparato esté en Soler, la venta descuenta del Local
      catalog = { K: { name: 'Zapatilla X', sku: 'SKU-X', barcode: 'K', talle: '42', canonical: 'K' } };
      vlConfig = { depId: null, sheetUrl: 'https://script.google.com/x/exec', sheetToken: 't', pinCajaHash: await vlHashPin('5678'),
        vendedores: { a: { nombre: 'Juan', activo: true }, b: { nombre: 'Ana', activo: false } } };
      switchTab('ventas');
      out.botones = [...document.querySelectorAll('#vlBotones .vl-vend')].map(b => b.textContent);
      await processCode('K'); await vlScanCode('K'); await vlScanCode('K');
      out.qty = vlVenta.items[0].qty;
      out.bloqueadoSinVendedor = document.getElementById('vlBtnCerrar').disabled;
      vlElegirVendedor('a');
      out.habilitado = !document.getElementById('vlBtnCerrar').disabled;
      await vlCerrarVenta();
      await new Promise(r => setTimeout(r, 50));
      out.local = stockDB.dep_l.K || 0; out.soler = stockDB.dep_s.K;
      const venta = escrituras.find(e => String(e.ref).startsWith('ventasLocal/') && e.data.vendedorNombre);
      out.venta = venta && { vendedor: venta.data.vendedorNombre, dep: venta.data.depNombre, sinStock: venta.data.items[0].sinStock, desc: venta.data.items[0].descontado };
      out.envio1 = envios[0] && { estado: envios[0].venta.estado, vendedor: envios[0].venta.vendedor, cant: envios[0].venta.items[0].cantidad, obs: envios[0].venta.items[0].obs };
      out.reseteada = vlVenta.items.length === 0 && vlVenta.vendedorId === null;
      const id = venta.data.id;
      vlAnular(id);
      document.getElementById('vlPinInput').value = '1111'; await vlPinOk();
      out.pinMalRechazado = document.getElementById('vlPinError').style.display === 'block' && (stockDB.dep_l.K || 0) === 0;
      document.getElementById('vlPinInput').value = '5678'; await vlPinOk();
      await new Promise(r => setTimeout(r, 50));
      out.localDevuelto = stockDB.dep_l.K; out.estado = vlHoyDB[id].estado;
      out.envio2 = envios[envios.length - 1].venta.estado.startsWith('ANULADA');
      return out;
    });
    assert.deepEqual(r.botones, ['Juan'], 'los vendedores desactivados no aparecen');
    assert.equal(r.qty, 3);
    assert.equal(r.bloqueadoSinVendedor, true);
    assert.equal(r.habilitado, true);
    assert.equal(r.local, 0); assert.equal(r.soler, 7, 'Soler no se toca');
    assert.deepEqual(r.venta, { vendedor: 'Juan', dep: 'Depósito Local', sinStock: true, desc: 2 });
    assert.deepEqual(r.envio1, { estado: 'OK', vendedor: 'Juan', cant: 3, obs: 'Sin stock en sistema' });
    assert.equal(r.reseteada, true);
    assert.equal(r.pinMalRechazado, true);
    assert.equal(r.localDevuelto, 2, 'al anular vuelve lo que realmente se descontó');
    assert.equal(r.estado, 'anulada');
    assert.equal(r.envio2, true);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
