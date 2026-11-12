# CHANGELOG (mudanças técnicas)

Registro **técnico** para quem mantém o projeto. O que o aluno vê fica em "Novidades" no `index.html`, não aqui. Formato inspirado em Keep a Changelog; datas em AAAA-MM-DD. O histórico anterior à 1.9.10 não está neste repositório e não foi reconstruído.

## [Não lançado]

### Corrigido / otimizado (refinamento técnico e visual)
- Nome no cabeçalho sumia: `loadUserProfile()` não dispara `planejador:profile` e `initNavDrawer` roda antes dele; `nucleo.js` agora chama `updateNavDrawerUser()` após carregar o perfil. Largura mínima de 5rem para o nome em telas ≥ 700 px (`base.css`).
- Faixa verde no cartão da aba inicial era a alça lateral `#nav-handle`; fica oculta na aba inicial e continua nas demais (`base.css`).
- Zoom: `syncZoomState` agrupado por quadro e com histerese (1,02 entra / 1,005 sai); `adjust` da FarmacIA sai cedo sem teclado; `backdrop-filter` só em modais abertos.
- Sanfonas de "O que puxar?": 66 px, intervalo de 14 px, indicador verde-acinzentado suave (`planejador.css`).

## [1.9.11]
Versão do app: **1.9.11** (`APP_VERSION` em `app.js`, a pedido do mantenedor). Não há seção "Não lançado" no momento. A versão anterior era 1.9.10.

### Adicionado (interface, a pedido do mantenedor)
- Menu lateral (drawer) aberto pela foto de perfil na aba Planejador: Início, O que puxar?, FarmacIA, Comunicados e, em "Preferências", Configurações, Aparência e Ajuda e suporte (todas já existiam; nenhuma rota nova). Reaproveita o sistema de foto/nome do perfil (`planejador_foto_v1`, `planejador_profile_v1`) e as telas de Configurações; não grava nada novo no aparelho. Fecha por toque fora, botão, Esc e deslize para a esquerda; fecha sempre antes de navegar; respeita áreas seguras, `prefers-reduced-motion` e "sem animações". Código em `navegacao.js` (seção `menu-lateral`), ações `drawer-open`/`drawer-close`/`drawer-go` em `nucleo.js`, marcação no fim do `index.html`, estilos no fim de `base.css`. Novos IDs: `nav-open`, `nav-scrim`, `nav-drawer`, `nav-user-name`, `nav-group-pref`.
- Textos do menu lateral no dicionário (`i18n.js`).

### Alterado (interface)
- Sanfonas de matérias (aba Planejador): cartões mais compactos (cadeado ao lado do nome, sem margem dupla, "Pré-req." na mesma linha quando cabe). 1º período no celular de 390 px: 748 → 536 px de altura. Só CSS (fim de `base.css`).
- "O que puxar?": cabeçalhos das sanfonas Obrigatórias / Escolha Condicionada menores (fim de `planejador.css`).
- Comunicados: marca-texto no modo escuro com âmbar translúcido e contraste do texto ≥ 4,5:1 (fim de `paginas.css`; modo claro inalterado).
- FarmacIA: menu dos três pontinhos refeito (linhas limpas, valor à direita, separador entre grupos). Tamanho da fonte agora "Pequeno / Padrão / Grande" com "Aa" em escala; os ids gravados (`compacto`, `padrao`, `ampliado`) e o formato de `planejador_farma_prefs_v1` não mudaram.
- "Novidades" do `index.html` atualizado para o aluno.

### Adicionado
- Documentação técnica: `AGENTS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`.
- FarmacIA: cliente da IA online opcional (consentimento do aluno, modo local-first, volta ao local ao esgotar a cota diária). O código do servidor (Edge Function) foi preparado fora do repositório; **não há confirmação de implantação**.

### Alterado
- Fusão de arquivos pequenos, preservando o conteúdo e a ordem das seções: `base.css` (fundamentos + base + navegação), `paginas.css` (comunicados + configurações + notas), `nucleo.js` (componentes + núcleo), `notas-janelas.js` (notas + janelas). A ordem de carregamento mudou em consequência (equivalência verificada byte a byte após remover comentários e normalizar espaços).
- Redesenho visual da FarmacIA e ajustes de ícones (espaçamento/sanfona).

### Linha de base de contratos (fora do repositório, P0-2)
- Levantamento reproduzível de IDs, globais, `data-*`, classes, eventos, chaves de `localStorage` (29), Service Worker e `manifest.json`; comparação original → atual sem perda de contrato.
- Correção do próprio levantamento: a primeira entrega contava 26 chaves de `localStorage`; o correto é **29** (`farma_checked_v4`, `planner_checked_v1`, `planejador-search-history` haviam ficado de fora).

### Segurança
- Auditoria dos usos de `innerHTML`: nenhuma falha explorável encontrada. Pendências **não corrigidas**: F1–F5 (ver `ARCHITECTURE.md` §11).

### Pendências conhecidas
- Teste do ciclo de atualização do Service Worker entre versões.
- Ícones `icon-*.png` ausentes no ZIP analisado: confirmar no repositório real.
- Processo de geração do `tailwind.css` não documentado.
- Testes automatizados, CI, lint e modelos `.github/` ainda não existem. O P1-2 (estrutura de testes) está **pausado**: só existem os auxiliares em `tests/helpers/` (não incluídos nesta entrega).
- A linha de base P0-2 foi comparada com o código atual após estas mudanças: 0 FALHA, 0 AVISO; só acréscimos (3 ações, 5 IDs, classes `nav-*`). Ela deve ser regenerada quando o mantenedor aprovar.
