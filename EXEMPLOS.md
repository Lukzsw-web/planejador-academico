# Exemplos de blocos para a FarmácIA

## Indicadores

Use apenas quando os valores forem conhecidos e sustentados pela pergunta/contexto.

```indicadores
{
  "titulo": "Resumo do experimento",
  "indicadores": [
    {"rotulo": "Amostras analisadas", "valor": 24, "unidade": "amostras"},
    {"rotulo": "Média observada", "valor": 7.8, "unidade": "mg/L"},
    {"rotulo": "Desvio-padrão", "valor": 0.6, "unidade": "mg/L", "descricao": "Conforme os dados fornecidos"}
  ]
}
```

## Planilha

```planilha
{
  "titulo": "Registro de amostras",
  "colunas": ["Amostra", "Concentração", "Unidade"],
  "linhas": [
    ["A1", "7,2", "mg/L"],
    ["A2", "7,8", "mg/L"],
    ["A3", "8,1", "mg/L"]
  ],
  "nomeArquivo": "registro-amostras"
}
```

Os números acima são apenas ilustrativos. Não os reutilize como dados reais.
