/*

· FarmácIA — Vocabulário de linguagem informal brasileira
· Arquivo independente. Não altera nem substitui farmacia.js ou farmacia-ia.js.
· 
· API global: window.FarmaGirias
· FarmaGirias.normalizar(texto)
· FarmaGirias.interpretar(texto) -> { original, normalizado, termos, sinais }
· FarmaGirias.buscar(texto) -> array de correspondências
· 
· Integração: carregue este arquivo depois dos scripts-base da FarmácIA.
· A aplicação precisa chamar FarmaGirias.interpretar(mensagem) no fluxo de entrada
· para que o vocabulário seja efetivamente utilizado.
  */
  (function (root) {
  "use strict";

const grupos = {
saudacao: {
intencao: "saudacao",
termos: ["oi", "olá", "ola", "eae", "e aí", "eai", "salve", "opa", "fala", "bom dia", "boa tarde", "boa noite", "tudo bem", "td bem", "tdb", "blz", "beleza"]
},
despedida: {
intencao: "despedida",
termos: ["tchau", "xau", "chau", "fui", "flw", "falou", "até mais", "até logo", "até amanhã", "vazei", "to indo", "tô indo"]
},
agradecimento: {
intencao: "agradecimento",
termos: ["obrigado", "obrigada", "obg", "valeu", "vlw", "brigado", "brigada", "brigadão", "tmj", "tamo junto", "agradeço", "gratidão"]
},
confirmacao: {
intencao: "confirmacao",
termos: ["sim", "ss", "s", "claro", "clr", "pode ser", "pode pá", "pdp", "pdc", "btf", "pse", "vdd", "exatamente", "com certeza", "correto", "isso mesmo", "fechado", "demorou", "dmr", "old", "fé"]
},
negacao: {
intencao: "negacao",
termos: ["não", "nao", "nn", "nop", "nope", "jamais", "de jeito nenhum", "nem ferrando", "sqn"]
},
duvida: {
intencao: "duvida",
termos: ["não entendi", "nao entendi", "como assim", "q", "q?", "oq", "o que", "qual diferença", "por quê", "porque", "como funciona", "pode repetir", "explica melhor", "to perdido", "tô perdido"]
},
pedido_explicacao: {
intencao: "pedido_explicacao",
termos: ["me explica", "explica melhor", "explica de novo", "resume", "faz resumo", "detalha", "exemplifica", "da exemplo", "dá exemplo", "simplifica", "compara", "fala sobre", "pesquisa", "procura", "me ajuda"]
},
vocativo: {
intencao: "vocativo_informal",
termos: ["mano", "mn", "man", "véi", "vei", "vey", "veyr", "cara", "pô", "viado", "bisha", "bicha", "bi", "klo", "clo", "migles", "migo", "miga", "migue", "parça", "cria", "pae", "pai", "fi", "amiga", "meu nobre", "meu consagrado", "divo", "diva"]
},
espanto: {
intencao: "espanto",
termos: ["mds", "mddc", "plmds", "plmdds", "slk", "slc", "seloko", "tmlc", "ox", "oxi", "oxe", "nss", "nossa", "oloco", "oloko", "credo", "caramba", "misericórdia", "socorro", "aff", "affs", "eu hein", "jura", "não acredito", "nao acredito", "isso não existe", "isso nao existe", "isso n existe", "é mole", "fala sério", "fala serio"]
},
avaliacao_positiva: {
intencao: "avaliacao_positiva",
termos: ["hit", "hitar", "brabo", "brabíssimo", "top", "massa", "maneiro", "daora", "irado", "impecável", "perfeito", "icônico", "lendário", "divou", "divei", "arrasou", "serviu", "entregou tudo", "10/10"]
},
avaliacao_negativa: {
intencao: "avaliacao_negativa",
termos: ["flop", "flopar", "flopado", "paia", "mid", "cringe", "tosco", "podre", "tenebroso", "ridículo", "nada a ver", "ndv", "brisou", "caducou", "viajou", "forçou", "sem nexo"]
},
humor: {
intencao: "humor",
termos: ["kkk", "kkkk", "ksks", "ksksks", "kakaka", "hahaha", "hehehe", "rs", "rsrs", "akakak", "perdi tudo", "morri", "passei mal", "não tankei", "nao tankei", "n tanko", "brinks", "brincs", "zoeira"]
},
abreviacoes: {
intencao: "abreviacao",
termos: ["vc", "vcs", "cê", "ce", "pq", "qnd", "qdo", "qd", "qnt", "qt", "qto", "qm", "ql", "qq", "qqr", "tb", "tbm", "tmb", "td", "tds", "hj", "amnh", "agr", "dps", "cmg", "ctg", "aq", "aki", "pf", "pfv", "obg", "vlw", "msm", "mt", "mto", "ngm", "sla", "sdds", "vdd", "gnt", "glr", "nd", "dnv", "qria", "qser", "fzr", "vms", "kd", "ctz", "msg", "ft", "zap", "dm", "rt", "fds"]
},
regional_carioca: {
intencao: "giria_regional",
termos: ["mermão", "mermao", "caô", "cao", "bolado", "boladona", "menor", "papo reto", "qual foi", "tá ligado", "ta ligado", "já é", "ja e", "partiu", "dá ideia", "da ideia", "vacilou", "vacilão", "esculacho", "meteu essa", "tá de caô", "ta de cao", "desenrolar"]
},
redes_e_memes: {
intencao: "referencia_redes",
termos: ["biscoito", "biscoitar", "exposed", "shade", "ranço", "ranco", "cancelado", "thread", "post", "mutual", "unfollow", "block", "pov", "trend", "viralizar", "bait", "rage bait", "hater", "fyp", "stalkear", "dix", "daily", "fomo", "delulu", "rizz", "slay", "ate", "gag", "mother", "main character", "pick me", "npc", "aura", "farmar aura", "peak", "cooked", "let him cook", "brainrot", "canon event", "plot twist", "lore", "side eye", "mood", "aesthetic", "based", "no cap", "sus", "goat", "glow up", "red flag", "green flag", "sigma", "skibidi"]
},
relacionamento: {
intencao: "relacionamento",
termos: ["crush", "contatinho", "ficante", "webnamoro", "ship", "shippar", "friendzone", "ghosting", "emocionado", "emocionada", "gado", "dar moral", "dar bola", "meter o louco", "fazer cu doce", "dar um perdido", "sumir"]
},
expressao_ambigua: {
intencao: "expressao_ambigua",
termos: ["ko", "oloco", "oloko", "credo", "old", "fds", "att", "bi", "viado", "divo", "diva"]
}
};

const aliases = new Map();
Object.keys(grupos).forEach(function (grupo) {
grupos[grupo].termos.forEach(function (termo) {
const chave = normalizar(termo);
if (!aliases.has(chave)) aliases.set(chave, []);
aliases.get(chave).push({
termo: termo,
grupo: grupo,
intencao: grupos[grupo].intencao
});
});
});

function normalizar(texto) {
return String(texto == null ? "" : texto)
.toLocaleLowerCase("pt-BR")
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.replace(/[’‘]/g, "'")
.replace(/[“”]/g, '"')
.replace(/[!?.,;:()[]{}]+/g, " ")
.replace(/\s+/g, " ")
.trim();
}

// Versão auxiliar para escrita expressiva: comprime sequências de 3+ letras.
// A mensagem original é sempre preservada; palavras ortográficas como "massa"
// e "carro" não são alteradas.
function normalizarRepeticoes(texto) {
return String(texto == null ? "" : texto).replace(/([a-záàâãéèêíïóôõöúçñ])\1{2,}/giu, "$1$1");
}

function escaparRegex(texto) {
return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buscar(texto) {
const original = String(texto == null ? "" : texto);
const normalizado = normalizar(original);
const resultado = [];
const vistos = new Set();

}

function interpretar(texto) {
const original = String(texto == null ? "" : texto);
const normalizado = normalizar(original);
return {
original: original,
normalizado: normalizado,
versaoComRepeticoesReduzidas: normalizarRepeticoes(original),
termos: buscar(original),
sinais: {
temRiso: /(^| )(kk+k+|ksks+|rsrs+|hahaha+|akakak+)( |$)/iu.test(normalizado),
        temNegacao: /(^| )(nao|nn|nop|nope)( |$)/u.test(normalizado),
temPergunta: /[?]/u.test(original),
temExpressaoHostil: /(^| )(smt|se mata(u)?)( |$)/u.test(normalizado)
}
};
}

root.FarmaGirias = Object.freeze({
versao: "1.0.0",
normalizar: normalizar,
normalizarRepeticoes: normalizarRepeticoes,
buscar: buscar,
interpretar: interpretar,
grupos: grupos
});
})(typeof window !== "undefined" ? window : globalThis);