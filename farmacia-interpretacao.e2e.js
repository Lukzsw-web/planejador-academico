/* Teste de ponta a ponta no chat real (precisa de Playwright e de um servidor local: python3 -m http.server 8765). Imprime a resposta de cada frase. */
const { chromium } = require('playwright');
const ENT = [
 'Oi','OIIII','oq é farmacologia','n entendi oq é farmacocinética','me ajuda numa conta','awui',
 'qual a diferença entre farmacocinética e farmacodinâmica','oxe, n entendi','divou','quanto é 20% de 500',
 'tenho 500 mg em 10 ml, quanto tem em 2 ml','oq significa biodisponibilidade','faz esse calculo pra mim','preciso calcular uma diluição',
 'calcula a concentração dessa solução','como faço uma regra de três?','n entendi essa conta','o que é potência','o que é área sob a curva','massa atômica do ferro',
 'Uma caixa tem 3 cartelas com 10 comprimidos cada. Foram usados 7 comprimidos. Quantos restam?','Em um modelo de eliminação de primeira ordem, kel = 0,1 h⁻¹. Calcule a meia-vida.',
 'Tenho uma solução e preciso saber quanto usar.','A conta estimou uma pressão de 15. Isso significa que o recipiente vai explodir?','asdfgh qwerty zzz','vlw'
];
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  await pg.addInitScript(() => { try { localStorage.setItem('farmacia_nome', 'Teste'); } catch (_) {} });
  await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => window.FarmacIA.show()); await pg.waitForTimeout(400);
  for (const q of ['Maria','ela']) { await pg.evaluate(q => window.FarmacIA.ask(q), q); await pg.waitForTimeout(700); }
  for (const q of ENT) {
    await pg.evaluate(q => window.FarmacIA.ask(q), q);
    await pg.waitForFunction(() => !window.FarmacIA.ocupado(), null, { timeout: 8000 }).catch(()=>{});
    await pg.waitForTimeout(250);
    const r = await pg.evaluate(() => { const m = [...document.querySelectorAll('#farma-messages .farma-msg.is-bot')]; return m[m.length-1].innerText.replace(/\s+/g,' ').slice(0,170); });
    console.log('>', q, '\n   ', r);
  }
  await b.close();
})();
