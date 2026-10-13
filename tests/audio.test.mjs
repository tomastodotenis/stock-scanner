import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './harness.mjs';

test('Sonido: suena en todos los estados del audio del navegador', async () => {
  const { page, errores, cerrar } = await abrirApp({ audioFalso: true });
  try {
    const r = await page.evaluate(async () => {
      const out = {}; const w = ms => new Promise(r => setTimeout(r, ms));
      __log.length = 0; playBeep(true); out.A_inmediato = __log.length; await w(250); out.A_trasResume = __log.length;
      __log.length = 0; playBeep(true); out.B_corriendo = __log.length;
      __instances[0].state = 'suspended'; __log.length = 0; playBeep(false); await w(250); out.C_trasSuspension = __log.length;
      __instances[0].state = 'closed'; playBeep(true); await w(250); out.D_instancias = __instances.length;
      __instances[__instances.length - 1].state = 'suspended'; document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' })); await w(250);
      out.E_trasTecla = __instances[__instances.length - 1].state;
      __instances[__instances.length - 1].state = 'suspended'; __resumeFail = true; __log.length = 0; playBeep(true); await w(250); out.F_fallaSinSonido = __log.length === 0;
      __resumeFail = false; __resumeDelay = 1500; __instances[__instances.length - 1].state = 'suspended'; __log.length = 0; playBeep(true); await w(1700); out.G_lentoDescartado = __log.length === 0;
      return out;
    });
    assert.equal(r.A_inmediato, 0, 'suspendido: no programa el beep antes de reanudar');
    assert.equal(r.A_trasResume, 1, 'suspendido: suena cuando reanuda');
    assert.equal(r.B_corriendo, 1);
    assert.equal(r.C_trasSuspension, 1);
    assert.equal(r.D_instancias, 2, 'contexto cerrado: crea uno nuevo');
    assert.equal(r.E_trasTecla, 'running', 'una tecla de la pistola destraba el audio');
    assert.equal(r.F_fallaSinSonido, true);
    assert.equal(r.G_lentoDescartado, true);
    assert.deepEqual(errores, []);
  } finally { await cerrar(); }
});
