/* Testes da camada de interpretação (parte pura, sem navegador).  Rodar:  node farmacia-interpretacao.test.js
 * A parte que depende do chat completo (classificadores + orquestrador) é conferida no navegador; ver o relatório. */
"use strict";
var I = require("./farmacia-interpretacao.js");
var pass = 0, fail = 0, falhas = [];
function eq(nome, got, want) { if (got === want) pass++; else { fail++; falhas.push(nome + "\n   esperado: " + JSON.stringify(want) + "\n   obtido:   " + JSON.stringify(got)); } }
function txt(h) { return String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

// 1. normalização: original e normalizado coexistem
var n = I.normalizar("OIIII, oq é Farmacologia?");
eq("original preservado", n.original, "OIIII, oq é Farmacologia?");
eq("normalizado", n.normalizado, "oii o que e farmacologia");
eq("abreviação n", I.normalizar("n entendi").normalizado, "nao entendi");
eq("acentos", I.normalizar("farmacocinética").normalizado, "farmacocinetica");

// 2. reescrita para a forma canônica
function can(s) { var r = I.preparar(s); return r.canonico; }
eq("oq significa X", can("oq significa biodisponibilidade"), "o que é biodisponibilidade");
eq("n entendi oq é X", can("n entendi oq é farmacocinética"), "o que é farmacocinetica");
eq("prefixo reformular", I.preparar("n entendi oq é farmacocinética").prefixo, "Sem problema, vou explicar de outro jeito.");
eq("me explica X", can("me explica farmacodinamica"), "o que é farmacodinamica");
eq("meia vida simples", can("tem como me explicar o que é meia vida de um jeito facil"), "o que é meia vida");
eq("não reescreve acadêmico", can("me explica a disciplina de farmacologia"), null);
eq("não reescreve 'explica de novo'", can("explica de novo"), null);
eq("frase já limpa fica intacta", can("o que é farmacocinética"), null);
eq("com número não vira conta aqui", can("quanto é 20% de 500"), null);

// 3. conversa, gíria e pedido de ajuda: respondem com pergunta de esclarecimento
function resp(s) { var r = I.preparar(s); return r.resposta ? txt(r.resposta.html) : null; }
["awui", "divou", "oxe"].forEach(function (g) {
  var r = resp(g); eq("gíria '" + g + "' tem resposta", !!r, true); eq("gíria '" + g + "' não diz 'não entendi'", /nao entendi|não entendi|não consegui/i.test(r || ""), false);
  eq("gíria '" + g + "' faz pergunta", /\?/.test(r || ""), true);
});
["me ajuda numa conta", "faz esse calculo pra mim", "preciso de ajuda com uma conta", "vc pode me ajudar com matematica", "queria fazer uma continha"].forEach(function (s) {
  eq("pedido de conta: " + s, /Me manda a conta/.test(resp(s) || ""), true);
});
eq("conta com número vai para o motor", resp("me ajuda a calcular 20% de 500"), null);
eq("saudação não é capturada aqui", resp("Oi"), null);
eq("'oxe, n entendi' sem assunto pergunta o quê", /O que você não entendeu/.test(resp("oxe, n entendi") || ""), true);

// 4. esclarecimento no lugar do "não entendi" genérico
var e = I.esclarecer("blablabla xyz");
eq("esclarecer devolve html", typeof e.html, "string");
eq("esclarecer devolve chips", e.chips.length > 0, true);
eq("esclarecer não diz 'Não entendi o que você quis dizer'", /Não entendi o que você quis dizer/.test(e.html), false);
eq("esclarecer pergunta algo", /\?/.test(txt(e.html)), true);
eq("esclarecer escapa HTML", /<script/.test(I.esclarecer("<script>alert(1)</script>").html), false);


// 5. pacote de conhecimento offline + casos de ambiguidade e segurança
global.FarmaConhecimento = require("./farmacia-conhecimento.js");
eq("118 elementos", global.FarmaConhecimento.dados.elementos.length, 118);
eq("elemento por nome", /Sódio \(Na\).*22,99/.test(resp("massa atômica do sódio") || ""), true);
eq("elemento por símbolo", /Ferro \(Fe\)/.test(resp("numero atomico do Fe") || ""), true);
eq("elemento por número atômico", /Ferro \(Fe\)/.test(resp("qual o elemento de número atômico 26") || ""), true);
eq("halogênios", /Flúor.*Cloro.*Bromo.*Iodo/.test(resp("quais são os halogênios") || ""), true);
eq("fórmula da molaridade", /C = n\/V/.test(resp("fórmula da molaridade") || ""), true);
eq("como calcular meia-vida", /0\.693\/kel/.test(resp("como calcular a meia vida") || ""), true);
eq("regra de três", /x = b\*c\/a/.test(resp("como faço uma regra de três?") || ""), true);
eq("grupo funcional", /Alcano.*C-C/.test(resp("o que é um alcano") || ""), true);
eq("conceito potência", /Quantidade\/concentração necessária/.test(resp("o que é potência") || ""), true);
eq("conceito AUC", /exposição sistêmica/.test(resp("o que é área sob a curva") || ""), true);
eq("fórmula com números vai ao motor", resp("fórmula da molaridade com 2 mol em 4 L"), null);
eq("'o que é álcool' não vira grupo funcional", resp("o que é álcool"), null);
eq("ambiguidade pede dados", /concentração.*volume/s.test(resp("Tenho uma solução e preciso saber quanto usar.") || ""), true);
eq("pressão: não conclui", /não consigo dizer/.test(resp("A conta estimou uma pressão de 15. Isso significa que o recipiente vai explodir?") || ""), true);
eq("pressão: pede unidade/absoluta/manométrica/temperatura", /unidade.*absoluta.*manométrica.*temperatura/s.test(resp("A conta estimou uma pressão de 15. Isso significa que o recipiente vai explodir?") || ""), true);
eq("calcula a concentração dessa solução", /massa.*volume/s.test(resp("calcula a concentração dessa solução") || ""), true);
eq("n entendi essa conta", /passo a passo/.test(resp("n entendi essa conta") || ""), true);
eq("como faço uma conta?", /Me manda a conta/.test(resp("como faço uma conta?") || ""), true);

// 6. coerência entre o pacote (tabela periódica) e o motor de cálculo (massas molares)
(function () {
  var Calc = require("./farmacia-calculo.js"), K = global.FarmaConhecimento.dados.elementos;
  [["H2O", ["H", 2, "O", 1]], ["NaCl", ["Na", 1, "Cl", 1]], ["C6H12O6", ["C", 6, "H", 12, "O", 6]]].forEach(function (c) {
    var esp = 0; for (var i = 0; i < c[1].length; i += 2) { var el = K.filter(function (e) { return e[1] === c[1][i]; })[0]; esp += el[4] * c[1][i + 1]; }
    var mm = Calc.massaMolar(c[0]).mm; eq("massa molar " + c[0] + " (pacote x motor, tolerância 0,05)", Math.abs(mm - esp) < 0.05, true);
  });
})();
console.log("passaram: " + pass + "  falharam: " + fail);
if (falhas.length) console.log("\n" + falhas.join("\n\n"));
process.exit(fail ? 1 : 0);
