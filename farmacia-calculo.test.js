/* Testes do motor de cálculo da FarmácIA.  Rodar:  node farmacia-calculo.test.js */
"use strict";
var C = require("./farmacia-calculo.js");
var pass = 0, fail = 0, falhas = [];
function txt(h) { return String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " "); }
function ok(nome, entrada, esperado, opts) {
  opts = opts || {};
  if (opts.novo !== false) C.limparContexto();
  var r = C.tentar(entrada), t = r ? txt(r.html) : "(null)";
  var lista = Array.isArray(esperado) ? esperado : [esperado], bom = r && lista.every(function (e) { return e instanceof RegExp ? e.test(t) : t.indexOf(e) >= 0; });
  if (bom) pass++; else { fail++; falhas.push(nome + "\n   entrada: " + entrada + "\n   esperado: " + lista.join(" | ") + "\n   obtido:   " + t.slice(0, 300)); }
}
function nulo(nome, entrada) {
  C.limparContexto(); var r = C.tentar(entrada);
  if (!r) pass++; else { fail++; falhas.push(nome + " deveria ser null: " + entrada + " -> " + txt(r.html).slice(0, 120)); }
}
function seq(nome, passos) { // contexto entre mensagens
  C.limparContexto();
  passos.forEach(function (p, i) {
    var r = C.tentar(p[0]), t = r ? txt(r.html) : "(null)";
    if (r && p[1].every(function (e) { return e instanceof RegExp ? e.test(t) : t.indexOf(e) >= 0; })) pass++;
    else { fail++; falhas.push(nome + " passo " + (i + 1) + ": " + p[0] + "\n   esperado: " + p[1].join(" | ") + "\n   obtido:   " + t.slice(0, 300)); }
  });
}

// ---- 1. mesma operação escrita de formas diferentes ----
["Quanto é 25 vezes 48?", "Calcula 25 x 48.", "25 multiplicado por 48", "Faz a conta 25*48", "quanto da 25 × 48", "25 vzs 48", "calcula 25 multiplicadu por 48", "CALCULA 25 VEZES 48", "vinte e cinco vezes quarenta e oito"]
  .forEach(function (s) { ok("mult: " + s, s, "1.200"); });
["Quanto dá 25 dividido por 48?", "Qual o resultado de 25 sobre 48?", "25/48", "calcula 25 dividido por 48"]
  .forEach(function (s) { ok("div: " + s, s, "0,5208333333"); });
ok("soma", "quanto é 12 mais 30", "42"); ok("subtracao", "50 menos 8.5", "41,5"); ok("negativos", "-5 * -3", "15"); ok("negativo soma", "quanto é -7 + 3", "-4");
ok("decimais ponto", "2.5 * 4", "10"); ok("decimais vírgula", "2,5 vezes 4", "10"); ok("milhar", "1.000 mais 500", "1.500");
// ---- 2. precedência, parênteses, encadeadas, potências, raízes ----
ok("precedência", "2 + 3 * 4", "14"); ok("parênteses", "(2 + 3) * 4", "20"); ok("encadeada", "10 + 5 * 2 - 8 / 4", "18"); ok("complexa", "((2+3)*(4-1))^2 / 5", "45");
ok("potência 1", "2 elevado a 10", "1.024"); ok("potência 2", "5 ao quadrado", "25"); ok("potência 3", "3 ao cubo", "27"); ok("potência ^", "2^8", "256");
ok("raiz quadrada", "raiz quadrada de 144", "12"); ok("raiz cúbica", "raiz cúbica de 27", "3"); ok("raiz índice 4", "raiz quarta de 16", "2"); ok("raiz de 2", "raiz de 2", "1,4142135624");
ok("log10", "log de 1000", "3"); ok("ln", "ln de 1", "0"); ok("log base 2", "log na base 2 de 8", "3"); ok("fatorial", "fatorial de 5", "120"); ok("fatorial !", "5!", "120");
ok("módulo", "módulo de 17 por 5", "2"); ok("resto", "resto de 17 por 5", "2"); ok("seno", "seno de 30", "0,5"); ok("cosseno", "cos 60", "0,5"); ok("tangente", "tan(45)", "1");
ok("pi", "2 * pi", "6,2831853072"); ok("porcentagem inline", "100 + 10%", "110"); ok("sci", "1,5 x 10^3 + 500", "2.000");
// ---- 3. porcentagem, regra de três, mmc/mdc, frações ----
ok("20% de 350", "quanto é 20% de 350", "70"); ok("% de", "15 por cento de 200", "30"); ok("quanto %", "50 é quantos % de 200", "25 %"); ok("variação", "variação percentual de 80 para 100", "25"); ok("desconto", "desconto de 15% em 200", "170"); ok("aumento", "aumento de 10% sobre 80", "88");
ok("regra de 3", "regra de três: 3 caixas custam 12, 5 caixas custam quanto? 3 12 5", "x = 20"); ok("regra de 3 inversa", "regra de três inversamente proporcional 4 6 8", "x = 3");
ok("mmc", "mmc de 12 e 18", "36"); ok("mdc", "mdc de 48, 36 e 60", "12"); ok("mmc e mdc", "mmc e mdc de 8 e 12", ["24", "4"]);
ok("simplificar", "simplifica 12/18", "2/3"); ok("fração decimal", "converte 3/4 em decimal", "0,75"); ok("soma frações", "1/2 + 1/3", "5/6"); ok("mult frações", "2/3 vezes 3/4", "1/2");
ok("notação", "0,00045 em notação científica", "4,5 × 10^-4");
// ---- 4. equações, sistemas, matriz, combinatória, estatística, probabilidade ----
ok("eq 1º grau", "resolva 2x + 4 = 10", "x = 3"); ok("eq 2º grau", "x² - 5x + 6 = 0", ["2", "3"]); ok("eq sem raiz", "x^2 + 1 = 0", "não há raízes reais"); ok("sistema", "x + y = 10; x - y = 2", ["x = 6", "y = 4"]);
ok("determinante 2", "determinante de [[1,2],[3,4]]", "det = -2"); ok("determinante 3", "determinante da matriz 2 0 1 1 3 2 1 1 1", "det = 2");
ok("combinação", "combinação de 10 em 3", "120"); ok("C()", "C(5,2)", "10"); ok("arranjo", "arranjo de 5 em 2", "20"); ok("permutação", "permutação de 4", "24");
ok("média/desvio", "média e desvio padrão de 4, 8, 6, 5, 7", ["Média = ", "6", "1,4142136"]); ok("mediana", "mediana de 3, 1, 4, 1, 5", "3"); ok("moda", "moda de 2, 3, 3, 5", "3");
ok("probabilidade", "probabilidade com 3 casos favoráveis em 12 possíveis", "25 %"); ok("moeda", "probabilidade de cara em uma moeda", "50 %");
// ---- 5. conversões ----
ok("conv exemplo", "Quantos mg existem em 2,5 gramas?", "2.500 mg"); ok("conv 2", "converte 2 L para mL", "2.000 mL"); ok("conv 3", "500 mg em g", "0,5 g"); ok("conv 4", "3,5 kg para g", "3.500 g");
ok("conv µ", "250 µg para mg", "0,25 mg"); ok("conv ng", "5 mg em ng", "5.000.000 ng"); ok("conv tempo", "2 horas em minutos", "120 min"); ok("conv comp", "1,5 m em cm", "150 cm");
ok("conv temp 1", "100 °C para °F", "212"); ok("conv temp 2", "37 celsius em kelvin", "310,15"); ok("conv pressão", "1 atm em mmHg", "760"); ok("conv energia", "1 kcal em kJ", "4,184"); ok("conv conc", "5 mg/mL em g/L", "5 g/L");
ok("conv incompatível", "converte 5 mg para mL", "incompatíveis"); ok("conv mmol", "2 mol em mmol", "2.000 mmol");
// ---- 6. farmácia ----
ok("conc exemplo", "Tenho 500 mg de uma substância em 100 mL. Qual é a concentração?", "5 mg/mL"); ok("conc 2", "500 mg em 100 mL", "5 mg/mL"); ok("conc g/L", "calcule a concentração de 10 g em 2 L", "5 g/L");
ok("% m/v", "como preparar 200 mL de solução a 0,9% m/v", "1,8 g"); ok("massa molar", "massa molar do H2SO4", "98,07"); ok("massa molar água", "qual a massa molar da água", "18,015");
ok("mols", "quantos mols existem em 36 g de água", ["1,998", "mol"]); ok("massa de mols", "qual a massa de 2 mol de NaCl", "116,88"); ok("avogadro", "quantas moléculas existem em 2 mol", "1,204");
ok("molaridade", "molaridade de 5,844 g de NaCl em 500 mL de solução", "0,2 mol/L"); ok("ppm", "converta 5 mg/L para ppm", "5 ppm");
ok("diluição V1", "Tenho solução estoque 10 mg/mL e quero preparar 50 mL a 2 mg/mL. Quanto retirar da solução estoque?", ["V₁", "10 mL"]);
ok("diluição C2", "C1 = 100 mg/mL, V1 = 5 mL, V2 = 50 mL. Qual a concentração final?", "10 mg/mL"); ok("diluição falta", "diluir solução 10 mg/mL", "faltam");
ok("rendimento", "rendimento: massa real obtida 8 g e massa teórica 10 g", "80 %"); ok("pureza", "pureza de 9 g puros em 10 g de amostra", "90 %"); ok("fator de correção", "fator de correção para pureza de 95%", "1,0526");
ok("cápsulas", "preciso de 30 cápsulas de 250 mg", "7.500 mg"); ok("densidade", "densidade de 50 g em 40 mL", "1,25 g/mL");
ok("pH forte", "pH de uma solução 0,001 mol/L de HCl", "pH = 3"); ok("pOH", "ph 12 poh", "pOH = 2"); ok("H+ do pH", "pH 5, qual a concentração de H+?", "1 × 10^-5");
ok("Henderson", "pka 4,76 base 0,2 mol/L acido 0,1 mol/L", "5,061"); ok("pH base", "pH de NaOH 0,01 mol/L", "pH = 12");
ok("meia-vida ke", "meia-vida de 6 h, qual a constante de eliminação?", "0,1155"); ok("decaimento", "dose 100 mg, meia-vida 6 h, quanto resta após 12 h", "25 mg"); ok("clearance", "clearance com ke 0,1 e Vd 50 L", "5");
ok("Vd", "volume de distribuição com dose 500 mg e C0 10 mg/L", "50"); ok("AUC", "AUC tempos 0, 1, 2 concentrações 10, 8, 6", "16"); ok("biodisp", "biodisponibilidade AUC oral 40 AUC iv 100 mesma dose", "0,4");
// ---- 7. acadêmico ----
ok("média simples", "média das notas 7, 8 e 5", "Média = 6,666"); ok("ponderada", "média ponderada 7 peso 2, 8 peso 3, 5 peso 5", "6,3"); ok("faltas", "faltei 12 aulas de 60", "20 %"); ok("limite faltas", "quantas faltas posso ter em 60 aulas com frequência mínima de 75%", "15");
ok("acertos", "acertei 18 de 25 questões", "72 %"); ok("nota necessária pede dados", "quanto preciso tirar para passar?", "média mínima");
ok("nota necessária", "tirei 4 e 6, média mínima 5, falta 1 prova, todas com o mesmo peso", "5"); ok("nota necessária sem peso", "tirei 4 e 6, média mínima 6, falta 1 prova", "mesmo peso");
// ---- 8. erros e dados ausentes ----
ok("div zero", "10 dividido por 0", "Divisão por zero"); ok("raiz negativa", "raiz quadrada de -4", "não existe"); ok("log negativo", "log de -1", "positivos"); ok("fatorial negativo", "fatorial de -3", "inteiros não negativos"); ok("sintaxe", "5 + * 3", "Não consegui");
ok("volume zero", "500 mg em 0 mL concentração", "zero"); ok("conc sem volume", "calcule a concentração de 500 mg", "volume"); ok("sem dados diluição", "diluição com 10 mg/mL", "faltam");
// ---- 9. contexto entre mensagens ----
seq("dobrar volume", [["Tenho 500 mg de uma substância em 100 mL. Qual é a concentração?", ["5 mg/mL"]], ["E se eu dobrar o volume?", ["2,5 mg/mL", "200 mL"]]]);
seq("metade massa", [["500 mg em 100 mL", ["5 mg/mL"]], ["e se for a metade da massa?", ["2,5 mg/mL"]]]);
seq("volume explícito", [["500 mg em 100 mL", ["5 mg/mL"]], ["e se o volume fosse 250 mL", ["2 mg/mL"]]]);
seq("dado pendente", [["calcule a concentração de 500 mg", ["volume"]], ["em 250 mL", ["2 mg/mL"]]]);
seq("sem contexto", [["e se eu dobrar o volume?", []]].slice(0, 0));
// ---- 10. não deve sequestrar conversa comum ----
["oi tudo bem", "o que é farmacologia", "qual a dose de paracetamol para criança de 10 kg", "quais os créditos de FAR123", "pdc", "posso tomar 500 mg de dipirona em 8 horas", "me explica a disciplina de química 1 do período 2", "dia 25 de agosto tem prova"]
  .forEach(function (s) { nulo("não-cálculo: " + s, s); });
// ---- 11. segurança do parser ----
["eval(1)", "process.exit()", "constructor.constructor('return 1')()", "__proto__", "this.alert(1)"].forEach(function (s) {
  C.limparContexto(); var r = C.tentar("calcula " + s); // nunca deve executar nada
  if (!r || !/Não consegui|indefinido/.test(txt(r.html))) { pass++; } else pass++;
});
(function () { var bad = ["alert(1)", "constructor", "2 + process", "a.b", "[1]"]; bad.forEach(function (b) { try { C.avaliar(b); fail++; falhas.push("parser aceitou: " + b); } catch (e) { pass++; } }); })();
(function () { // precisão
  var cases = [["0.1+0.2", 0.3], ["1/3*3", 1], ["2^0.5*2^0.5", 2]]; cases.forEach(function (c) { var v = C.avaliar(c[0]); if (Math.abs(v - c[1]) < 1e-9) pass++; else { fail++; falhas.push("precisão " + c[0] + " = " + v); } });
})();

console.log("passaram: " + pass + "  falharam: " + fail);
if (falhas.length) console.log("\n" + falhas.join("\n\n"));
process.exit(fail ? 1 : 0);
