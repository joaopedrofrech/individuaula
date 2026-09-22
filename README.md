# IndividuAula

Aplicação full stack do Projeto Integrador II da AEDB, criada para apoiar a rotina de estudos dos alunos do Colégio Estadual Marechal Souza Dantas, em Resende.

## estado atual

A primeira implementação funcional contempla:

- landing page editorial inspirada na referência visual enviada, com identidade própria do IndividuAula e conexão com o colégio;
- autenticação demonstrativa com cadastro, login, logout, recuperação de acesso e edição de perfil;
- dashboard com média geral, disciplinas ativas, atividades e ritmo de estudos;
- dashboard com disciplinas em destaque, gráfico semanal alimentado por dados de exemplo e leitura objetiva dos próximos passos;
- CRUD de disciplinas, anotações e avaliações;
- formulário completo de disciplina com descrição, cores, ícones e prévia visual;
- caderno com mini-construtor inline, formatação de texto e imagem de apoio por seleção ou arrastar e soltar;
- cálculo de médias ponderadas e histórico de desempenho;
- pesquisa de conteúdos educacionais com fallback demonstrativo e integração server-side preparada para YouTube Data API;
- tema claro/escuro com superfícies grafite no modo escuro, navegação responsiva e componentes da biblioteca shadcn/base-ui;
- layout com bordas retas e componentes reutilizáveis;
- suíte unitária, de integração e E2E cobrindo os casos de uso principais.

## tecnologias

- Next.js 16 com App Router e TypeScript;
- Tailwind CSS 4;
- shadcn/ui com base-ui e lucide-react;
- Vitest, Testing Library e Playwright;
- Zod para validação dos contratos de entrada.

## arquitetura da aplicação

O IndividuAula foi organizado em camadas para separar a interface, as regras de negócio, as validações e a persistência. Esse desenho facilita a manutenção do projeto e permite substituir a persistência demonstrativa por um banco de dados real em uma próxima etapa.

### fluxo principal

```text
usuário
   ↓
interface Next.js
   ↓
formulários e componentes shadcn/ui
   ↓
validação dos dados com Zod
   ↓
AppProvider e regras da aplicação
   ↓
persistência demonstrativa no navegador
   ↓
dashboard e resultados atualizados
```

### como os dados percorrem o sistema

1. o usuário interage com uma tela do sistema, como cadastro, disciplinas, anotações ou avaliações;
2. os formulários utilizam componentes reutilizáveis do shadcn/ui para manter consistência visual e acessibilidade;
3. os dados preenchidos são validados pelos schemas do Zod antes de qualquer alteração;
4. o `AppProvider` centraliza o estado da sessão e das informações acadêmicas do usuário;
5. as operações de criar, editar, excluir e consultar registros aplicam as regras de associação entre usuário, disciplina, anotação e avaliação;
6. o estado é salvo no `localStorage` do navegador usando a chave `individuaula-state-v1`;
7. os componentes do dashboard leem os dados atualizados e exibem médias, disciplinas, anotações e indicadores de estudo.

### camadas da aplicação

| camada | responsabilidade | principais arquivos |
| --- | --- | --- |
| interface | apresenta as telas e recebe as ações do usuário | `app/` e `components/` |
| componentes visuais | oferece botões, campos, diálogos, cards e navegação reutilizáveis | `components/ui/` |
| validação | verifica formato, obrigatoriedade e limites dos dados | `lib/validators.ts` |
| estado da aplicação | coordena sessão, disciplinas, anotações e avaliações | `components/app-provider.tsx` |
| regras acadêmicas | calcula médias e organiza as operações do domínio | `lib/academics.ts` e `lib/study-store.ts` |
| persistência demonstrativa | serializa e recupera os dados no navegador | `lib/client-store.ts` |
| testes | verifica regras, componentes, rotas e fluxos completos | `tests/` |

### rotas de API do Next.js

As rotas de API ficam dentro da própria aplicação Next.js e representam a camada de backend do projeto:

```text
rotas API Next.js
   ├── autenticação
   │   ├── cadastro
   │   ├── login
   │   ├── logout
   │   └── sessão e perfil
   ├── perfil do usuário
   └── busca de conteúdos no YouTube
```

As rotas de autenticação validam os dados recebidos, controlam a sessão e evitam que informações sensíveis sejam devolvidas ao cliente. A busca do YouTube acontece no servidor para que a chave da API não fique exposta no navegador. Quando a chave ainda não está configurada, a aplicação utiliza resultados demonstrativos para manter o fluxo navegável.

### persistência atual e evolução planejada

Nesta etapa acadêmica, a persistência é demonstrativa e utiliza o `localStorage`, permitindo que o sistema funcione sem depender de infraestrutura externa. O projeto também mantém os serviços de autenticação e domínio separados da interface, o que prepara a aplicação para uma futura migração para Better Auth, D1/Drizzle ou outro banco de dados relacional.

Em uma versão de produção, essa camada poderá ser substituída sem refazer as telas e os contratos de validação, mantendo o mesmo fluxo geral:

```text
interface → validação → regras da aplicação → banco de dados real → dashboard
```

## como executar

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para habilitar a busca real no YouTube, copie o arquivo de ambiente e informe a chave no servidor:

```bash
cp .env.example .env.local
```

```env
YOUTUBE_API_KEY=sua-chave-do-youtube-data-api
```

Sem a chave, a aplicação utiliza resultados demonstrativos para manter o fluxo navegável durante o desenvolvimento.

## comandos de qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm build
```

## próxima etapa de produção

O domínio, os handlers de autenticação e a integração externa já estão separados para evolução. Nesta etapa acadêmica, o estado de demonstração usa armazenamento local no navegador e serviços em memória para manter o app funcional sem infraestrutura externa. A próxima etapa pode substituir essas implementações por Better Auth, D1/Drizzle e Cloudflare Workers/OpenNext sem refazer as telas nem os contratos de validação.
