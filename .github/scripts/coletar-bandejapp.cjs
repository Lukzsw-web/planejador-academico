
const { chromium } = require("playwright");

const BASE_URL =
  "https://devmobufrj.github.io/BandejApp/#/Cardapio";

const FUNCTION_URL = process.env.SUPABASE_INGEST_URL;
const TOKEN = process.env.GITHUB_OIDC_TOKEN;

const restaurants = ["ct", "pv", "dc", "mc"];

const days = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

const meals = ["almoco", "janta"];

const fields = [
  "entrada",
  "pratoPrincipal",
  "pratoVeg",
  "guarnicao",
  "acompanhamento",
  "sobremesa",
];

async function main() {
  if (!FUNCTION_URL || !TOKEN) {
    throw new Error("Configuração de envio ausente.");
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const page = await browser.newPage({
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });

    await page.addInitScript(() => {
      localStorage.setItem("bandejapp:ruDefault", "ct");
      localStorage.removeItem("bandejapp:ultimoCardapio");
    });

    const nav = await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    if (!nav || !nav.ok()) {
      throw new Error(
        `BandejApp respondeu com status ${
          nav?.status() ?? "desconhecido"
        }.`
      );
    }

    await page.waitForFunction(() => {
      try {
        const value = JSON.parse(
          localStorage.getItem("bandejapp:ultimoCardapio") || "null"
        );

        return (
          value &&
          ["ct", "pv", "dc", "mc"].every(
            (key) => value[key] && value.semana
          )
        );
      } catch {
        return false;
      }
    }, { timeout: 90000 });

    const payload = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bandejapp:ultimoCardapio"))
    );

    if (!payload.semana || !payload.ultimaAtualizacao) {
      throw new Error("Cardápio sem dados de semana/atualização.");
    }

    for (const ru of restaurants) {
      for (const day of days) {
        for (const meal of meals) {
          const dish = payload?.[ru]?.[day]?.[meal];

          if (
            !dish ||
            typeof dish !== "object" ||
            !fields.every((field) => field in dish)
          ) {
            throw new Error(
              `Dados incompletos em ${ru}/${day}/${meal}; coleta cancelada.`
            );
          }
        }
      }
    }

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ payload }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(
        `Supabase ${response.status}: ${
          result.error || "falha ao salvar"
        }`
      );
    }

    console.log(
      JSON.stringify({
        status: "coletado",
        id: result.id,
        coletado_em: result.coletado_em,
      })
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Falha no scraping:", error.message);
  process.exitCode = 1;
});
