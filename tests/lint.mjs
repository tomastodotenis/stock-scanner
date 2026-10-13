// Revisión estática: variables/funciones sin definir, duplicados, código inalcanzable y sintaxis.
import { ESLint } from 'eslint';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const html = readFileSync(resolve(raiz, 'index.html'), 'utf8');
const bloques = [...html.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/g)];
const principal = bloques.map(b => b[2]).sort((a, b) => b.length - a.length)[0];
const esModulo = b => /type="module"/.test(b[1]);

const propias = Object.fromEntries([...new Set([...html.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]))].map(n => [n, 'writable']));
const navegador = ['window','document','navigator','localStorage','sessionStorage','fetch','console','setTimeout','clearTimeout','setInterval','clearInterval','alert','confirm','prompt','XLSX','ZXing','Blob','URL','FileReader','Audio','AudioContext','webkitAudioContext','indexedDB','location','Image','requestAnimationFrame','performance','Notification','atob','btoa','crypto','caches','CustomEvent','MutationObserver','getComputedStyle','TextEncoder','TextDecoder','FormData','AbortController','history','screen','event','Uint8Array','ArrayBuffer','Intl','Promise','Set','Map','JSON','Math','Date','Object','Array','Number','String','parseInt','parseFloat','isNaN','encodeURIComponent','decodeURIComponent','Error','RegExp'];
const globals = { ...propias, ...Object.fromEntries(navegador.map(n => [n, 'readonly'])) };

let hayErrores = false;
for (const [i, b] of bloques.entries()) {
  const codigo = b[2];
  const [r] = await new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ languageOptions: { ecmaVersion: 2023, sourceType: esModulo(b) ? 'module' : 'script', globals }, rules: { 'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error', 'no-func-assign': 'error', 'no-dupe-args': 'error' } }],
  }).lintText(codigo, { filePath: `index.html#script${i}.js` });
  for (const m of r.messages) { hayErrores = true; console.error(`❌ script ${i} línea ${m.line}: ${m.message}`); }
}
if (hayErrores) { console.error('\nLa revisión encontró errores. No se publica.'); process.exit(1); }
console.log(`✅ Revisión estática OK (${bloques.length} bloques de código, ${Object.keys(propias).length} funciones window.*)`);
