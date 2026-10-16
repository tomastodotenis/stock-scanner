import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

// Los vectores se verificaron una vez decodificando las barras con ZXing (la misma librería que usa la cámara de la app).
const VECTORES = {
  "SEC-1A": "11010010000110111010001000110100010001000110100110111001001110011010100011000110111010001100011101011",
  "SEC-10": "11010010000110111010001000110100010001000110100110111001001110011010011101100110111000101100011101011",
  "SEC-PASILLO3": "11010010000110111010001000110100010001000110100110111001110111011010100011000110111010001100010001010001101110100011011101000111011011001011100110110011001100011101011"
};

test('Carteles: el código de barras Code128 coincide con los vectores verificados y rechaza lo no imprimible', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(v => {
      const out = { iguales: Object.entries(v).every(([t, bits]) => code128Modulos(t) === bits) };
      out.sinTexto = code128Modulos('');
      out.conAcento = code128Modulos('SEC-Ñ');
      return out;
    }, VECTORES);
    assert.equal(r.iguales, true, 'las barras de cada código coinciden con las verificadas');
    assert.equal(r.sinTexto, null);
    assert.equal(r.conAcento, null, 'un carácter fuera de ASCII no genera barras (no imprime un código equivocado)');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Carteles: imprime un cartel por sector con su nombre y su código, ordenados', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      depositos = { d1: { nombre: 'Depósito Central' } }; depActivo = 'd1';
      sectoresDB = { d1: {
        a: { id: 'a', nombre: '10-B', codigo: 'SEC-10B' },
        b: { id: 'b', nombre: '2-A', codigo: 'SEC-2A' },
        c: { id: 'c', nombre: 'Ñandú', codigo: 'SEC-Ñ' },
      } };
      let escrito = '', impreso = false;
      window.open = () => ({ document: { write: h => { escrito += h; }, close() {} }, focus() {}, print() { impreso = true; } });
      imprimirCarteles();
      const todos = escrito;
      escrito = ''; imprimirCarteles('b'); const uno = escrito;
      return { todos, uno };
    });
    const cantidad = (h, t) => h.split(t).length - 1;
    assert.equal(cantidad(r.todos, '<section class="cartel">'), 2, 'el sector con código imposible se omite, los otros dos salen');
    assert.ok(r.todos.indexOf('2-A') < r.todos.indexOf('10-B'), 'orden numérico: 2-A antes que 10-B');
    assert.ok(r.todos.includes('SEC-2A') && r.todos.includes('SEC-10B'));
    assert.ok(r.todos.includes('Depósito Central'));
    assert.equal(cantidad(r.uno, '<section class="cartel">'), 1, 'un solo cartel desde el botón del sector');
    assert.ok(r.uno.includes('<svg') && r.uno.includes('2-A'));
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Carteles de pasillos: 12 horizontales + 8 verticales, códigos tipo 1H-PA, filtro por planta', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      let escrito = '';
      window.open = () => ({ document: { write: h => { escrito += h; }, close() {} }, focus() {}, print() {} });
      imprimirCartelesPasillos(''); const todos = escrito;
      escrito = ''; imprimirCartelesPasillos('PA'); const pa = escrito;
      escrito = ''; imprimirCartelesPasillos('PB'); const pb = escrito;
      const codigos = h => [...h.matchAll(/<div class="cod">([^<]+)<\/div>/g)].map(m => m[1]);
      return { todos: codigos(todos), pa: codigos(pa), pb: codigos(pb), barras: (todos.match(/<svg/g) || []).length, lados: (todos.match(/<div class="lados"><div class="lado">A<\/div><div class="cod">[^<]+<\/div><div class="lado">B<\/div><\/div>/g) || []).length, desc: todos.includes('Fila 3 · Horizontal · Planta Alta') && todos.includes('Fila 4 · Vertical · Planta Baja') };
    });
    assert.equal(r.todos.length, 20);
    assert.equal(r.todos.filter(c => c.includes('H-')).length, 12);
    assert.equal(r.todos.filter(c => c.includes('V-')).length, 8);
    assert.equal(r.pa.length, 10); assert.equal(r.pb.length, 10);
    assert.ok(r.pa.every(c => c.endsWith('-PA')) && r.pb.every(c => c.endsWith('-PB')));
    assert.ok(r.todos.includes('1H-PA') && r.todos.includes('6H-PB') && r.todos.includes('4V-PA') && !r.todos.includes('5V-PA'));
    assert.equal(r.barras, 20, 'cada cartel lleva su código de barras');
    assert.equal(r.lados, 20, 'cada cartel lleva la A a la izquierda y la B a la derecha, debajo del código de barras');
    assert.equal(r.desc, true);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});

test('Pasillos: escanear 1H-PA en Stock muestra solo los sectores de esa fila y planta', async () => {
  const { page, errores, cerrar } = await abrirApp();
  try {
    const r = await page.evaluate(() => {
      const mk = (b, n) => ({ name: n, sku: 'S' + b, barcode: b, talle: '40', canonical: b });
      catalog = { 1: mk('1', 'Prod en 1H-PA'), 2: mk('2', 'Prod en 1H-PB'), 3: mk('3', 'Prod en 2H-PA'), 4: mk('4', 'Prod en 1V-PA'), 5: mk('5', 'Prod sin sector') };
      depositos = { d: { nombre: 'Soler' } }; depActivo = 'd'; filterDep = ''; filterSec = ''; searchQuery = '';
      sectoresDB = { d: {
        s1: { id: 's1', nombre: '1H-PA-M1A-E1', codigo: 'SEC-1HPAM1AE1' },
        s2: { id: 's2', nombre: '1H-PB-M1A-E1', codigo: 'SEC-1HPBM1AE1' },
        s3: { id: 's3', nombre: '2H-PA-M1A-E1', codigo: 'SEC-2HPAM1AE1' },
        s4: { id: 's4', nombre: '1V-PA-M1A-E1', codigo: 'SEC-1VPAM1AE1' },
      } };
      sectorMapDB = { d: { 1: 's1', 2: 's2', 3: 's3', 4: 's4' } };
      stockDB = { d: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 } };
      const nombres = () => [...document.querySelectorAll('#stockList .rname')].map(e => e.textContent);
      renderStock(); const antes = nombres().length;
      stockScanSector('1H-PA'); const pasillo = nombres();
      const chip = document.getElementById('pasChip').style.display;
      stockScanSector('1h-pb'); const pb = nombres();
      stockScanSector('9H-PA'); const noExiste = nombres(); // sin sectores: no cambia el filtro
      stockScanSector('SEC-2HPAM1AE1'); const sector = nombres(); const chipSector = document.getElementById('pasChip').style.display;
      stockScanSector('1H-PA'); pasLimpiar(true); const limpio = nombres().length;
      return { antes, pasillo, chip, pb, noExiste, sector, chipSector, limpio };
    });
    assert.equal(r.antes, 5);
    assert.deepEqual(r.pasillo, ['Prod en 1H-PA'], 'solo la fila 1 horizontal de planta alta (no 1H-PB, 2H-PA ni 1V-PA)');
    assert.equal(r.chip, 'flex', 'se ve el aviso del pasillo filtrado');
    assert.deepEqual(r.pb, ['Prod en 1H-PB'], 'mayúsculas/minúsculas da igual');
    assert.deepEqual(r.noExiste, ['Prod en 1H-PB'], 'pasillo sin sectores: avisa y no cambia lo que se ve');
    assert.deepEqual(r.sector, ['Prod en 2H-PA'], 'escanear un sector concreto reemplaza el filtro de pasillo');
    assert.equal(r.chipSector, 'none');
    assert.equal(r.limpio, 5, 'quitar el filtro vuelve a mostrar todo');
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
