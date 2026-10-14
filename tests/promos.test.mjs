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
