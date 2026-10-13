import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, esperar } from './harness.mjs';

const NANOFLEX = 'Zapatilla Reebok Hombre Nanoflex Adventure Tr Petroleo Lima';
const ODOO = {
  '4066748509997': { name: NANOFLEX, sku: 'RBK110S239231HP923111', barcode: '4066748509997', talle: '11' },
  '4066748513703': { name: NANOFLEX, sku: 'RBK110S239231HP923105', barcode: '4066748513703', talle: '10.5' },
};
const preparar = () => {
  const NANOFLEX = 'Zapatilla Reebok Hombre Nanoflex Adventure Tr Petroleo Lima'; // se ejecuta dentro del navegador
  catalog = { '4066748510016': { name: NANOFLEX, sku: 'RBK110S239231HP923113', barcode: '4066748510016', talle: '13', canonical: '4066748510016' } };
  depositos = { dep_a: { nombre: 'Soler' } };
  stockDB = { dep_a: { '4066748510016': 5, '4066748509997': 25, '4066748513703': 15, '9999999999999': 3 } };
  sectorMapDB = {}; filterDep = 'dep_a'; depActivo = 'dep_a'; searchQuery = '';
};

test('Stock: nunca oculta productos con stock aunque no estén en el catálogo', async () => {
  const { page, errores, cerrar } = await abrirApp({ productosOdoo: ODOO });
  try {
    const r = await page.evaluate(async (prep) => {
      new Function(`return (${prep})`)()(); // restablece datos
      renderStock();
      const antes = [...document.querySelectorAll('#stockList .stbl-row')].length;
      await new Promise(r => setTimeout(r, 1500));
      const lista = [...document.querySelectorAll('#stockList .stbl-row')].map(e => `${e.querySelector('.rname').textContent}|${e.querySelector('.rtalle').textContent}|${e.querySelector('.rqty').textContent}`);
      return { antes, lista };
    }, preparar.toString());
    assert.equal(r.antes, 4, 'las 4 claves con stock deben verse desde el primer dibujo');
    assert.ok(r.lista.includes(`${NANOFLEX}|11|25`), 'talle 11 resuelto desde Odoo');
    assert.ok(r.lista.includes(`${NANOFLEX}|10.5|15`), 'talle 10.5 resuelto desde Odoo');
    assert.ok(r.lista.includes(`${NANOFLEX}|13|5`));
    assert.ok(r.lista.some(x => x.startsWith('⚠️ Producto fuera del catálogo') && x.endsWith('|3')), 'el que no existe en Odoo queda visible con su cantidad');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Stock: búsqueda por nombre y por código de barras', async () => {
  const { page, cerrar } = await abrirApp({ productosOdoo: ODOO });
  try {
    const r = await page.evaluate(async (prep) => {
      new Function(`return (${prep})`)()();
      renderStock(); await new Promise(r => setTimeout(r, 1500));
      searchQuery = 'nanoflex adventure'; renderStock();
      const porNombre = document.querySelectorAll('#stockList .stbl-row').length;
      searchQuery = '4066748509997'; renderStock();
      const porCodigo = document.querySelectorAll('#stockList .stbl-row').length;
      return { porNombre, porCodigo };
    }, preparar.toString());
    assert.equal(r.porNombre, 3);
    assert.equal(r.porCodigo, 1);
  } finally { await cerrar(); }
});

test('Stock: si Odoo no responde, muestra aviso, conserva las cantidades y no entra en bucle', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async () => {
      catalog = {}; depositos = { dep_a: { nombre: 'Soler' } }; stockDB = { dep_a: { '7777777777777': 4 } };
      sectorMapDB = {}; filterDep = 'dep_a'; depActivo = 'dep_a'; searchQuery = '';
      window.fetch = () => Promise.reject(new Error('offline'));
      renderStock(); await new Promise(r => setTimeout(r, 800));
      const n1 = document.querySelectorAll('#stockList .stbl-row').length;
      renderStock(); renderStock();
      return { n1, n2: document.querySelectorAll('#stockList .stbl-row').length, aviso: document.querySelector('#stockList div').textContent, qty: document.querySelector('#stockList .rqty').textContent };
    });
    assert.equal(r.n1, 1); assert.equal(r.n2, 1); assert.equal(r.qty, '4');
    assert.match(r.aviso, /no están en el catálogo ni en Odoo/);
    assert.deepEqual(errores.filter(e => !/offline/.test(e)), []);
  } finally { await cerrar(); }
});

test('Exportación y alertas no descartan stock sin catálogo', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      catalog = { A: { name: 'Con catálogo', sku: 'A', barcode: 'A', talle: '1', canonical: 'A' } };
      depositos = { dep_a: { nombre: 'Soler' } }; stockDB = { dep_a: { A: 5, B: 7 } }; sectorMapDB = {};
      const filas = buildRows('', '');
      isAdmin = true; updateAlertTab();
      return { n: filas.length, unidades: filas.reduce((t, f) => t + Number(f.Cantidad || 0), 0) };
    });
    assert.equal(r.n, 2); assert.equal(r.unidades, 12);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
