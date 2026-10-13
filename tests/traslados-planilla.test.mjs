import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

const ODOO = { '4066748509997': { name: 'Zapatilla Reebok Nanoflex', sku: 'RBK110S239231HP923111', barcode: '4066748509997', talle: '11' } };

test('Traslados, Planilla y Mapa buscan en Odoo si el código no está en el catálogo', async () => {
  const { page, errores, cerrar } = await abrirApp({ productosOdoo: ODOO });
  try {
    const r = await page.evaluate(async () => {
      const out = {};
      depositos = { dep_a: { nombre: 'Soler' } }; stockDB = { dep_a: { '4066748509997': 25 } };
      sectorMapDB = { dep_a: { '4066748509997': 'sec1' } };
      sectoresDB = { dep_a: { sec1: { id: 'sec1', nombre: 'S1', codigo: 'S1' }, sec2: { id: 'sec2', nombre: 'S2', codigo: 'S2' } } };
      depActivo = 'dep_a';
      catalog = {};
      traslado = { responsable: 'X', origenDep: 'dep_a', origenSec: 'sec1', destinoDep: 'dep_a', destinoSec: null, productos: [] };
      await processTScan('4066748509997'); out.traslado = traslado.productos.map(x => x.key + 'x' + x.qty);
      await processTScan('0000000'); out.traslado2 = traslado.productos.length;
      catalog = {};
      planillaData = [{ id: 'p1', unidades: 1, sku: 'RBK110S239231HP923111', titulo: 'T', variante: '', deposito: 'Soler', sector: 'S1', sinUbicar: false, depIds: ['dep_a'], checked: false }];
      await planillaScanCode('4066748509997'); out.planilla = planillaData[0].checked;
      catalog = {}; let ir = null; window.mapaIrASector = id => { ir = id; };
      await mapaBuscarCodigoExacto('4066748509997'); out.mapa = ir;
      return out;
    });
    assert.deepEqual(r.traslado, ['4066748509997x1']);
    assert.equal(r.traslado2, 1, 'un código inexistente no se agrega');
    assert.equal(r.planilla, true);
    assert.equal(r.mapa, 'sec1');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Planilla: el botón Juntada solo marca la fila y NO toca el stock', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      const out = {};
      stockDB = { dep_a: { K: 5 } };
      planillaData = [
        { id: 'p1', unidades: 1, sku: 'K', titulo: 'X', variante: '', deposito: 'Soler', sector: 'S1', sinUbicar: false, depIds: ['dep_a'], checked: false, salidaHecha: false },
        { id: 'p2', unidades: 1, sku: 'Y', titulo: 'Y', variante: '', deposito: '', sector: '', sinUbicar: true, depIds: [], checked: false, salidaHecha: false },
      ];
      window.fbSavePlanilla = async () => { out.guardados = (out.guardados || 0) + 1; };
      renderPlanilla();
      out.botones = document.querySelectorAll('#planillaTbl button[onclick^="planillaMarcarJuntada"]').length;
      out.sinBotonDescontar = document.querySelector('#planillaTbl [onclick*="planillaDescontarStock"]') === null;
      const antes = JSON.stringify(stockDB);
      planillaMarcarJuntada('p1'); out.marcada = planillaData[0].checked; out.contador = document.getElementById('planillaJuntadas').textContent;
      planillaMarcarJuntada('p1'); out.desmarcada = !planillaData[0].checked;
      out.stockIntacto = antes === JSON.stringify(stockDB);
      return out;
    });
    assert.equal(r.botones, 1, 'la fila "sin ubicar" no lleva botón');
    assert.equal(r.sinBotonDescontar, true);
    assert.equal(r.marcada, true); assert.equal(r.contador, '1'); assert.equal(r.desmarcada, true);
    assert.equal(r.stockIntacto, true); assert.equal(r.guardados, 2);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
