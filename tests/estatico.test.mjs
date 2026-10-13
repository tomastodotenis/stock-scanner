import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const html = readFileSync(resolve(raiz, 'index.html'), 'utf8');

test('index.html se mantiene liviano (sin imágenes incrustadas)', () => {
  const kb = statSync(resolve(raiz, 'index.html')).size / 1024;
  assert.ok(kb < 450, `index.html pesa ${kb.toFixed(0)} KB (límite 450 KB). ¿Se incrustó una imagen en base64?`);
  assert.equal(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{2000,}/.test(html), false, 'hay una imagen grande en base64 dentro del código');
});

test('las imágenes referenciadas existen', () => {
  for (const f of ['img/logo.png', 'img/fondo.jpg']) assert.ok(existsSync(resolve(raiz, f)), `falta ${f}`);
});

test('APP_BUILD tiene formato AAAAMMDDNN', () => {
  assert.match(html, /const APP_BUILD = '\d{10}'/);
});

test('no quedan escrituras del catálogo completo en localStorage', () => {
  assert.equal(/localStorage\.setItem\('ss_catalog',JSON\.stringify\(catalog\)\)/.test(html), false);
});
