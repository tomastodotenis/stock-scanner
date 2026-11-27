import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { abrirApp } from './harness.mjs';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const datos = JSON.parse(readFileSync(resolve(raiz, 'deposito-datos.json'), 'utf8'));

test('Depósito: SKU, código interno, nombre y duplicados', async () => {
  const { page, errores, cerrar } = await abrirApp({});
  try {
    const r = await page.evaluate((D) => {
      depDatos = D;
      catalog = { 'HKA1162011BWHT10': { name: 'x', sku: 'HKA1162011BWHT10', barcode: '', canonical: 'HKA1162011BWHT10' } };
      const out = {};
      out.sku = depSkuDe('HKA', '1162011BWHT', '10M');
      out.skuBarra = depSkuDe('hka', '12 34', '35/38');
      out.bc = depBarcodeInterno(59426);
      out.tipo = depTipoDeCat('Calzado / Zapatillas');
      out.tipo2 = depTipoDeCat('Indumentaria / Shorts');
      out.marcaOdoo = depCodigoMarca('Hoka'); out.marcaNueva = depCodigoMarca('Marca Nueva');
      const f = Object.assign(depFormNuevo(), { cat: 'Calzado / Zapatillas', tipoNom: 'Zapatilla', marca: 'Hoka', codMarca: 'HKA', genero: 'Hombre', modelo: 'Bondi 9', colorNom: 'Negra Blanca', cod: '1162011BWHT', talles: { '10': { qty: 2, barcode: '' }, '9': { qty: 1, barcode: '197634739397' } } });
      out.nombre = depNombreDe(f);
      const a = depArmarVariantes(f, 59425);
      out.vars = a.variantes.map(v => [v.talle, v.sku, v.barcode, v.interno, v.qty]); out.prox = a.proxBarcode;
      out.probs = depProblemas(f, a.variantes);
      out.dup = depDuplicado('HKA1162011BWHT10', '');
      out.probsVacio = depProblemas(depFormNuevo(), []).length;
      return out;
    }, datos);
    assert.equal(r.sku, 'HKA1162011BWHT10M');
    assert.equal(r.skuBarra, 'HKA123435' + '38');
    assert.equal(r.bc, '0000000059426');
    assert.equal(r.tipo, 'Zapatilla'); assert.equal(r.tipo2, 'Short');
    assert.equal(r.marcaOdoo, 'HKA'); assert.equal(r.marcaNueva, 'MAR');
    assert.equal(r.nombre, 'Zapatilla Hoka Hombre Bondi 9 Negra Blanca');
    assert.deepEqual(r.vars, [['9', 'HKA1162011BWHT9', '197634739397', false, 1], ['10', 'HKA1162011BWHT10', '0000000059426', true, 2]]);
    assert.equal(r.prox, 59426);
    assert.ok(r.probs.some(p => p.includes('HKA1162011BWHT10 ya existe')), 'detecta SKU que ya está en el catálogo');
    assert.equal(r.dup.sku, true);
    assert.ok(r.probsVacio >= 5);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Depósito: el apartado es solo para admin y no toca stock ni catálogo', async () => {
  const { page, errores, cerrar } = await abrirApp({});
  try {
    const r = await page.evaluate(() => {
      const out = {};
      out.tabOculta = document.getElementById('tabDeposito').style.display === 'none';
      isAdmin = false; switchTab('deposito');
      out.activaSinAdmin = document.getElementById('page-deposito').classList.contains('active');
      isAdmin = true; stockDB = { dep_a: { '1': 3 } }; catalog = {};
      depDatos = null; depPruebaCargada = true;
      out.sinDatos = (renderDeposito(), document.getElementById('depContent').textContent.includes('Cargando'));
      return out;
    });
    assert.equal(r.tabOculta, true);
    assert.equal(r.activaSinAdmin, false, 'sin modo admin no se abre');
    assert.equal(r.sinDatos, true);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
