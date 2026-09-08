# 📚 BookLevel

Gamificação de hábitos de leitura em React Native — XP, níveis, streaks e grupos, com Firebase como backend.

<!--
  📸 ADICIONE AQUI 2-4 SCREENSHOTS OU UM GIF DO APP RODANDO.
  Isso pesa mais do que qualquer parágrafo de texto neste README.
  Sugestão de layout lado a lado:

  <p float="left">
    <img src="assets/screenshots/home.png" width="200" />
    <img src="assets/screenshots/progress.png" width="200" />
    <img src="assets/screenshots/groups.png" width="200" />
  </p>
-->

---

## O problema que o projeto ataca

Apps de leitura tradicionais têm alta taxa de abandono porque não dão nenhum retorno imediato pelo esforço do usuário — ler não gera feedback visível como um jogo gera. O BookLevel aplica a mesma lógica de progressão de apps como Duolingo (XP por ação, streaks diários, conquistas por marco) a uma atividade sem essa mecânica: cada página lida vira experiência, e o progresso fica visível em tempo real.

## Funcionalidades

- **XP e níveis** — cada página lida gera experiência; 50 níveis agrupados em 10 tiers.
- **Streaks** — sequência diária de leitura, com recuperação limitada (3x/mês, custo em XP crescente) para não punir o usuário demais por uma falha pontual.
- **Conquistas** — 13 marcos desbloqueáveis com base em regras de negócio (páginas totais, livros concluídos, streak).
- **Grupos de leitura** — metas coletivas, ranking interno e chat em tempo real.
- **Sistema de amizades** — busca por prefixo de nome, pedidos e perfis públicos.
- **Ranking global** entre amigos.
- **Tema claro/escuro.**
- **Busca de livros via Google Books API** para popular o catálogo sem manter um banco próprio.

## Decisões técnicas

Registrado aqui porque o "porquê" importa mais que a lista de tecnologias:

- **Context API em vez de Redux.** Estado global do app se resume a autenticação, tema e contagem de pedidos de amizade — três contextos isolados resolvem isso sem o boilerplate de uma store centralizada que não seria justificada pelo tamanho do app.
- **Firebase (Auth + Firestore) em vez de backend próprio.** Como projeto solo com prazo de entrega fixo, terceirizar autenticação e persistência liberou o tempo de desenvolvimento para a lógica de gamificação, que é o diferencial do produto.
- **JavaScript puro, sem TypeScript.** Escolha consciente para a primeira versão, dado o tamanho do time (1 pessoa) e o prazo. É o item mais no topo do roadmap de melhoria técnica — ver seção abaixo.
- **Patch de persistência condicional no Firebase Auth.** O SDK web do Firebase não expõe `getReactNativePersistence`; o projeto resolve isso detectando a plataforma em runtime (`src/config/firebase.js`) para funcionar tanto em Expo Web quanto em iOS/Android nativo.
- **Credenciais via variável de ambiente (`EXPO_PUBLIC_*`).** Nenhuma chave de API fica no código-fonte — tudo lido de `.env.local`, que não é versionado.

## Fluxo de desenvolvimento

Projeto desenvolvido com Claude Code como par de programação, usando uma configuração própria de projeto (`.claude/`, `.agents/`) para manter consistência num desenvolvimento solo, entre sessões separadas por dias ou semanas:

- **Entrega sempre em arquivo completo, nunca em snippet ou find-and-replace** — elimina edição parcial que quebra um arquivo sem eu perceber na hora.
- **Postura crítica obrigatória da IA** — configurei o assistente pra nunca validar uma decisão minha por padrão; ele testa a ideia antes de concordar, o que exigiu mais rigor nas escolhas de arquitetura do que eu teria sozinho sem esse filtro.
- **Handoff estruturado entre sessões** — cada sessão termina com um bloco "estado atual" (o que foi implementado, o que ficou pendente, próximo passo), colado no início da sessão seguinte. Substitui memória de curto prazo por processo documentado.

Trato isso como parte do meu processo de engenharia, não como atalho: as regras acima são decisão minha sobre como usar a ferramenta, e todo código gerado foi revisado por mim antes de entrar no repositório.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 54 + React Native |
| Linguagem | JavaScript (JSX) |
| Autenticação | Firebase Authentication |
| Banco de dados | Firebase Firestore |
| Dados externos | Google Books API |
| Navegação | React Navigation (bottom tabs + stack navigators) |
| Gerenciamento de estado | Context API |

## Estrutura do projeto
