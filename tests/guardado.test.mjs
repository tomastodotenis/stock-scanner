import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

// Firestore falso en memoria: setDoc con merge + increment/deleteField, como el real.
const instalarFirestoreFalso = () => {
  const docs = { 'stock/dep_a': { stock: { A: 10, B: 4 }, sectorMap: { A: 's1' } } };
  const INC = Symbol('inc'), DEL = Symbol('del');
  window.__docs = docs;
  window._fb = {
    db: {}, doc: (db, c, id) => c + '/' + id,
    increment: n => ({ [INC]: n }), deleteField: () => DEL,
    collection: (db, c) => c, addDoc: async (c, d) => { (window.__errores = window.__errores || []).push(d); },
    setDoc: async (ref, payload, opt) => {
      const d = opt && opt.merge ? (docs[ref] = docs[ref] || {}) : (docs[ref] = {});
      for (const [campo, v] of Object.entries(payload)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          d[campo] = d[campo] || {};
          for (const [k, x] of Object.entries(v)) {
            if (x === DEL) delete d[campo][k];
            else if (x && x[INC] !== undefined) d[campo][k] = (d[campo][k] || 0) + x[INC];
            else d[campo][k] = x;
          }
        } else d[campo] = v;
      }
    },
  };
  currentUser = { email: 't@t' };
  depositos = { dep_a: { nombre: 'A' } }; depActivo = 'dep_a';
  stockDB = {}; sectorMapDB = {};
  aplicarStockServidor('dep_a', docs['stock/dep_a']);
};

test('Guardado: no pisa lo que cambió otro dispositivo / una venta de MeLi', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async (inst) => {
      new Function(`return (${inst})`)()();
      // El Worker descuenta 3 de A por una venta de MeLi (el celular todavía no se enteró)
      __docs['stock/dep_a'].stock.A -= 3;
      // El celular, con su copia vieja, suma 2 de B y guarda
      setStockVal('B', getStockVal('B') + 2);
      await fbSaveStock();
      return JSON.parse(JSON.stringify(__docs['stock/dep_a'].stock));
    }, instalarFirestoreFalso.toString());
    assert.deepEqual(r, { A: 7, B: 6 }, 'la venta de MeLi (A: 10→7) debe sobrevivir al guardado del celular');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Guardado: un cambio del servidor durante un traslado no borra lo local sin guardar', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async (inst) => {
      new Function(`return (${inst})`)()();
      setStockVal('A', getStockVal('A') - 4); // cambio local aún sin guardar
      // llega un snapshot del servidor (otra venta: A 10→9)
      const srv = JSON.parse(JSON.stringify(__docs['stock/dep_a'])); srv.stock.A = 9;
      __docs['stock/dep_a'] = srv;
      aplicarStockServidor('dep_a', srv);
      const local = stockDB.dep_a.A;
      await fbSaveStock();
      return { local, db: __docs['stock/dep_a'].stock.A };
    }, instalarFirestoreFalso.toString());
    assert.equal(r.local, 5, '9 del servidor − 4 local pendiente');
    assert.equal(r.db, 5);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Guardado: sectores y borrado de stock en cero; falla de red se reintenta y se registra', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async (inst) => {
      new Function(`return (${inst})`)()();
      setSectorForProduct('B', 's2'); setStockVal('A', 0);
      await fbSaveStock();
      const ok = JSON.parse(JSON.stringify(__docs['stock/dep_a']));
      // falla: no guarda, deja pendiente
      const real = _fb.setDoc; _fb.setDoc = async () => { throw new Error('sin red'); };
      setStockVal('B', 9); await fbSaveStock();
      _fb.setDoc = real; await fbSaveStock(); // reintento
      return { ok, final: JSON.parse(JSON.stringify(__docs['stock/dep_a'].stock)), errs: (window.__errores || []).map(e => e.tipo) };
    }, instalarFirestoreFalso.toString());
    assert.equal(r.ok.stock.A, 0); assert.equal(r.ok.sectorMap.B, 's2');
    assert.equal(r.final.B, 9, 'el reintento guarda lo pendiente');
    assert.ok(r.errs.includes('guardar-stock'), 'el error quedó registrado');
  } finally { await cerrar(); }
});

test('Control de cuentas: avisa si la lista no coincide con la base', async () => {
  const { page, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      catalog = {}; depositos = { dep_a: { nombre: 'A' } }; depActivo = 'dep_a'; filterDep = null; filterSec = null; searchQuery = '';
      stockDB = { dep_a: { X: 4, Y: 6 } };
      renderStock();
      return !!document.getElementById('ctrlCuentas');
    });
    assert.equal(r, false, 'consistente → sin aviso');
  } finally { await cerrar(); }
});
