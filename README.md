# 📚 BookLevel

Gamificação de hábitos de leitura em React Native — XP, níveis, streaks e grupos, com Firebase como backend.

<!--
  📸 ADICIONE AQUI 2-4 SCREENSHOTS OU UM GIF DO APP RODANDO.
  Isso pesa mais do que qualquer parágrafo de texto neste README.
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

- **Context API em vez de Redux.** Estado global se resume a autenticação, tema e contagem de pedidos de amizade — três contextos isolados resolvem isso sem o boilerplate de uma store centralizada.
- **Firebase (Auth + Firestore) em vez de backend próprio.** Projeto solo com prazo fixo: terceirizar autenticação e persistência liberou tempo pra lógica de gamificação, o diferencial do produto.
- **JavaScript puro, sem TypeScript.** Escolha consciente pra primeira versão, dado o tamanho do time (1 pessoa) e o prazo — ver roadmap abaixo.
- **Patch de persistência condicional no Firebase Auth.** O SDK web do Firebase não expõe `getReactNativePersistence`; o projeto resolve isso detectando a plataforma em runtime (`src/config/firebase.js`) pra funcionar em Expo Web e iOS/Android nativo.
- **Credenciais via variável de ambiente (`EXPO_PUBLIC_*`).** Nenhuma chave de API no código-fonte — tudo lido de `.env.local`, que não é versionado.

## Fluxo de desenvolvimento

Projeto desenvolvido com Claude Code como par de programação, usando configuração própria (`.claude/`, `.agents/`) pra manter consistência num desenvolvimento solo, entre sessões separadas por dias ou semanas:

- **Entrega sempre em arquivo completo, nunca em snippet ou find-and-replace** — elimina edição parcial que quebra um arquivo sem eu perceber.
- **Postura crítica obrigatória da IA** — configurei o assistente pra nunca validar uma decisão minha por padrão; ele testa a ideia antes de concordar, o que exigiu mais rigor nas escolhas de arquitetura.
- **Handoff estruturado entre sessões** — cada sessão termina com um bloco "estado atual" (implementado, pendente, próximo passo), colado no início da sessão seguinte.

Trato isso como parte do meu processo de engenharia: as regras acima são decisão minha sobre como usar a ferramenta, e todo código gerado foi revisado por mim antes de entrar no repositório.

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

src/
config/firebase.js # init do Firebase + patch de persistência web/native
context/
AuthContext.jsx
ThemeContext.jsx
FriendshipContext.jsx
navigation/
RootNavigator.jsx
AppNavigator.jsx
AuthNavigator.jsx
screens/
home/ books/ progress/ ranking/ profile/ groups/ auth/
services/ # toda a lógica de negócio isolada da UI
userService.js readingService.js bookService.js achievementService.js
friendshipService.js groupService.js chatService.js authService.js
notificationService.js
utils/
levelSystem.js # fórmula de XP/nível
xpCalculator.js
constants/colors.js
assets/


A separação `screens/` → `services/` → `Firestore` existe pra manter a UI sem regra de negócio. Exceção conhecida: a busca da Google Books API é chamada direto de três telas (`ProfileScreen`, `SetGoalScreen`, `BookListScreen`) em vez de passar por um service — ver roadmap.

## Rodando localmente

**Pré-requisitos:** Node.js LTS, app Expo Go no celular, projeto próprio no Firebase (Authentication + Firestore habilitados) e uma chave da Google Books API.

```bash
git clone https://github.com/wiegertluizghost/Book-Level.git
cd Book-Level
npm install
```

Crie um `.env.local` na raiz (não versionado) com suas próprias credenciais:

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=


```bash
npx expo start
```

`w` abre no navegador (porta 8082) · escaneie o QR code com o Expo Go pra testar em dispositivo físico (Metro na porta 8081).

## O que eu faria diferente / próximos passos

- [ ] Migrar para TypeScript
- [ ] Endurecer as regras do Firestore (hoje é `allow read, write: if request.auth != null`, liberado demais para produção)
- [ ] Mover a busca da Google Books API para um `bookSearchService.js` dedicado
- [ ] Cobrir `utils/levelSystem.js` e `utils/xpCalculator.js` com testes unitários
- [ ] Persistir a preferência de tema entre sessões
- [ ] Remover cores fixas que quebram no modo escuro (`AddReadingScreen`, `RankingScreen`)
- [ ] CI básico (lint + build) no GitHub Actions

## Sobre o projeto

Desenvolvido individualmente por **Luiz Eduardo Wiegert**, estudante de Sistemas de Informação na UNIVAG, como projeto de extensão do curso — construído e mantido como projeto pessoal, do zero, sem boilerplate ou template pronto.
