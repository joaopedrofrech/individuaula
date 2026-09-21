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
