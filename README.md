# Planejador Acadêmico de Farmácia

Aplicativo web (PWA) para o aluno de Farmácia planejar o curso: marcar disciplinas cursadas, ver o que falta, decidir "o que puxar?" respeitando pré e co-requisitos, consultar contatos, comunicados e a **FarmacIA** (assistente de dúvidas acadêmicas). Funciona **offline** depois da primeira visita e guarda tudo **no próprio aparelho**.

Versão atual: **0.5.1**.

## Para o aluno
- Abra o endereço do site no celular ou computador e, se quiser, "Adicionar à tela inicial".
- Seus dados (disciplinas marcadas, anotações, preferências) ficam só neste aparelho. Limpar os dados do navegador apaga tudo.
- Comunicados e a IA online precisam de internet; o restante funciona sem.

## Para quem desenvolve
É um site estático: HTML, CSS e JavaScript puros, **sem build e sem dependências para instalar**.

Rodar localmente (qualquer servidor estático serve), por exemplo:
```
python3 -m http.server 8000
```
e abrir `http://localhost:8000/`. O Service Worker exige `localhost` ou HTTPS.

### Documentos
| Arquivo | Para quê |
|---|---|
| `ARCHITECTURE.md` | Arquitetura real, módulos, dependências, contratos críticos |
| `CONTRIBUTING.md` | Regras de contribuição e validação |
| `AGENTS.md` | Instruções para agentes de IA |
| `CHANGELOG.md` | Mudanças técnicas |

### Regras essenciais
- `disciplinas.js` (dados acadêmicos) só muda com autorização expressa.
- A versão está somente em `app.js` (`APP_VERSION`).
- Não renomeie IDs, funções globais, ações `data-pa-action`, chaves de `localStorage` nem a ordem dos scripts sem ler `ARCHITECTURE.md` §6.

### Estado atual
Ainda **não há** testes automatizados, CI nem lint. Validação é manual (ver `CONTRIBUTING.md`).

## Tecnologias e licenças de terceiros
markdown-it 14.2.0, DOMPurify 3.4.14, highlight.js 11.12.0 (build parcial), fonte Inter (`INTER-LICENSE.txt`), CSS utilitário pré-compilado (`tailwind.css`). Servidor opcional: Supabase (comunicados, área da equipe, IA online).

## Licença
Não consta licença do projeto na pasta analisada. **A definir pelo mantenedor** (nenhuma foi assumida).

> Nota: nenhum `README.md` existia no ZIP analisado. Se o repositório real já tiver um, mesclar este conteúdo com ele.
