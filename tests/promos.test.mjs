import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Promos: fechas con errores de tipeo se interpretan; pausadas/finalizadas no son vigentes; precios absurdos se recalculan', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      const f = s => isVencida(s);
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const fut = new Date(hoy.getFullYear(), 11, 31);
      const esperado = Math.floor((fut - hoy) / 864e5);
      promociones = [
        { descripcion: 'Zapatilla Test Modelo s2543 Azul', fechaCad: 'PAUSADA POR ML', precioFinal: 1, descuentoPct: 10 },
        { descripcion: 'Zapatilla Test Modelo s2543 Azul', fechaCad: '31 de Diciembre', precioFinal: 1, descuentoPct: 10 },
      ];
      return {
        ocubre: f('31 de Ocubre') !== null, novimebre: f('30 de Novimebre') !== null, sinDe: f('30 noviembre') !== null,
        dic: f('31 de Diciembre') === esperado, pausada: f('PAUSADA POR ML'), final: f('FINALIZADA POR ML'), vacia: f(''),
        vigente: findPromo('Zapatilla Test Modelo s2543 Azul').fechaCad,
      };
    });
    assert.ok(r.ocubre && r.novimebre && r.sinDe && r.dic);
    assert.equal(r.pausada, null); assert.equal(r.final, null); assert.equal(r.vacia, null);
    assert.equal(r.vigente, '31 de Diciembre', 'ignora la promo pausada');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

const CSV = [
  '## Sheet name: PROMOCIONES',
  ',Sector,Descripcion,Nro de Publicacion,Fecha de Inicio,Fecha de Caducidad,Central de Promociones,Precio Lista,Descuento,Precio Final,Recibis,Meli+,Precio Final Meli,Recibis',
  'HI TEC',
  'Hombre,,"Zapatilla ""Test"" Uno, Azul",1250130773,,31 de Ocubre,https://x,"$100.000,00",30%,"$70.000,00","$55.000,00",50%,$50.000,"$40.000,00"',
  'Hombre,,"Zapatilla ""Test"" Uno, Azul",1250130773,,31 de Ocubre,https://x,"$100.000,00",30%,"$70.000,00","$55.000,00",50%,$50.000,"$40.000,00"',
  ',,Zapatilla Dos,"1,25919E+15",PAUSADA,,https://x,"$80.000,00",25%,-651415,"$1,00"',
  ',,Zapatilla Tres,222,,,https://x,"$60.000,00",20%,,"$30.000,00"',
].join('\r\n');

test('Promos: lee el CSV (comillas, encabezado, Meli+, repetidas, precios rotos) y arma las listas a revisar', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate((csv) => {
      const ps = parsearPromos(parseCSV(csv));
      return ps.map(p => ({ d: p.descripcion, lista: p.precioLista, fin: p.precioFinal, meli: p.meliFinal, mr: p.meliRecibis, mot: p.motivos, inact: promoInactiva(p) }));
    }, CSV);
    assert.equal(r.length, 3, 'la fila repetida se descarta');
    assert.equal(r[0].d, 'Zapatilla "Test" Uno, Azul');
    assert.equal(r[0].fin, 70000); assert.equal(r[0].meli, 50000); assert.equal(r[0].mr, 40000);
    assert.deepEqual(r[0].mot, [], 'fecha con tipeo se entiende → nada que revisar');
    assert.equal(r[1].fin, 60000, 'precio final negativo → recalculado con el descuento');
    assert.ok(r[1].inact);
    assert.ok(r[2].mot.includes('sin fecha de fin') && r[2].mot.includes('precio final de la planilla vacío o incorrecto'));
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Promos: si la planilla falla se usa la última copia guardada', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(async () => {
      promociones = [];
      await idbSet('ss_promos', { upd: new Date().toISOString(), promos: [{ descripcion: 'Zapatilla Copia', fechaCad: '31 de Diciembre', fechaInicio: '', precioLista: 100, precioFinal: 80, descuentoPct: 20, motivos: [] }] });
      await fetchPromos(true); // sin red en las pruebas → falla
      return { n: promociones.length, copia: promoDeCopia, estado: document.getElementById('promoSyncStatus').textContent };
    });
    assert.equal(r.n, 1); assert.ok(r.copia); assert.match(r.estado, /copia/);
  } finally { await cerrar(); }
});
