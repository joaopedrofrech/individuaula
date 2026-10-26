# IndividuAula

Aplicação full stack do Projeto Integrador II da AEDB, criada para apoiar a rotina de estudos dos alunos do Colégio Estadual Marechal Souza Dantas, em Resende. O aluno organiza disciplinas, anotações e avaliações, acompanha médias e ritmo de estudo e encontra conteúdos de apoio.

Em produção: [app.individuaula.workers.dev](https://app.individuaula.workers.dev)

## funcionalidades

- cadastro, login, logout e edição de perfil, com sessão no servidor;
- disciplinas com cor e ícone, anotações com editor e imagem de apoio, avaliações com média ponderada;
- dashboard com média geral, disciplinas ativas e ritmo de estudos da semana;
- pesquisa de conteúdos educacionais (YouTube Data API, feita no servidor) com rolagem infinita: mais vídeos carregam sozinhos conforme o aluno desce a lista;
- tema claro e escuro, layout responsivo e identidade visual do colégio.

## tecnologias

| camada | tecnologia |
| --- | --- |
| aplicação | Next.js 16 (App Router), React 19 e TypeScript |
| interface | Tailwind CSS 4, shadcn/ui (base-ui) e lucide-react |
| validação | Zod |
| banco de dados | Cloudflare D1 (SQLite) com Drizzle ORM |
| hospedagem | Cloudflare Workers, via OpenNext |
| testes | Vitest, Testing Library e Playwright |

## arquitetura

```text
navegador (React)
   ↓  fetch, com cookie de sessão HttpOnly
rotas de API do Next.js   ← validação com Zod, checagem de origem, limite de tentativas
   ↓
serviços                  ← autenticação e dados acadêmicos; toda consulta filtra pelo dono
   ↓
Drizzle ORM
   ↓
Cloudflare D1
```

| responsabilidade | onde fica |
| --- | --- |
| telas e componentes | `app/`, `components/` |
| estado do cliente (sessão em memória, atualização imediata, fila de gravação) | `components/app-provider.tsx`, `lib/api-client.ts`, `lib/study-state.ts` |
| rotas de API | `app/api/**`, `server/api.ts`, `server/rate-limit.ts` |
| autenticação e senhas | `server/auth-service.ts`, `server/crypto.ts`, `lib/session.ts` |
| dados acadêmicos | `server/study-data.ts`, `server/demo-data.ts` |
| busca de vídeos e rolagem infinita | `server/youtube-search.ts`, `hooks/use-video-search.ts`, `components/study/content-search.tsx` |
| validação de entrada | `lib/validators.ts` |
| banco de dados | `db/schema.ts`, `drizzle/`, `server/db.ts` |
| testes | `tests/` (veja `docs/TEST_PLAN.md`) |

Rotas de API: `POST /api/auth/register|login|logout`, `GET /api/auth/session`, `GET|PATCH /api/auth/profile`, `GET /api/data`, `POST /api/demo-data`, `POST /api/disciplines`, `PATCH|DELETE /api/disciplines/[id]` (o mesmo para `notes` e `assessments`) e `GET /api/youtube/search`.

## persistência atual e evolução planejada

### persistência atual: Cloudflare D1 com Drizzle ORM

Contas, sessões e todos os dados acadêmicos ficam no banco **D1**. O navegador não guarda nada (sem `localStorage`): ele mantém só uma cópia em memória para a tela responder na hora, e cada alteração é gravada no banco por uma fila ordenada. Se uma gravação falhar, o aluno é avisado e a tela volta ao que está salvo.

**Modelagem**

```text
users ──1:N── sessions
users ──1:N── disciplines ──1:N── notes
                          └─1:N── assessments
users ──1:N── study_sessions
```

| tabela | o que guarda | pontos importantes |
| --- | --- | --- |
| `users` | nome, e-mail e hash da senha | e-mail único; senha só como hash PBKDF2 |
| `sessions` | sessões de login (uma por aparelho) | guarda só o hash do token; validade de 7 dias |
| `disciplines` | matérias do aluno | nome, descrição, cor e ícone |
| `notes` | anotações de uma disciplina | conteúdo em HTML higienizado e imagem opcional |
| `assessments` | provas e trabalhos | nota e peso, que alimentam a média ponderada |
| `study_sessions` | minutos estudados por dia | alimenta o gráfico semanal |

Todo registro acadêmico tem `user_id` do dono, e toda consulta filtra por ele: um aluno nunca enxerga os dados de outro. As chaves estrangeiras usam `ON DELETE CASCADE`, então excluir uma disciplina apaga suas anotações e avaliações sem deixar registros órfãos.

**Onde está cada coisa**

| arquivo | função |
| --- | --- |
| `db/schema.ts` | definição das tabelas em TypeScript (fonte da verdade do modelo) |
| `drizzle/*.sql` | migrações SQL geradas a partir do schema, versionadas no git |
| `drizzle.config.ts` | configuração do Drizzle Kit |
| `server/db.ts` | conecta o binding `DB` do D1 ao Drizzle |
| `server/auth-service.ts` | contas, login e sessões |
| `server/study-data.ts` | consultas e gravações de disciplinas, anotações e avaliações |
| `wrangler.jsonc` | declara o banco `individuaula-db` e o binding `DB` |

**Alterando o banco**

```bash
# 1. edite db/schema.ts
pnpm db:generate          # gera a migração SQL em drizzle/
pnpm db:migrate:local     # aplica no banco local (.wrangler/state, fora do git)
pnpm db:migrate:remote    # aplica no D1 de produção
```

### evolução planejada

- **confirmação de e-mail e recuperação de senha:** o fluxo chegou a ser implementado e testado, mas foi retirado até existir um domínio próprio para o envio de e-mails (Resend);
- **login com Google**, como alternativa ao cadastro por senha;
- **limite de tentativas global:** hoje cada instância do Worker conta as suas; o plano é usar as regras de Rate Limiting da Cloudflare;
- **imagens das anotações no R2:** hoje vão no D1, que limita cada linha a 2 MB (por isso o limite de 700 KB por imagem);
- **troca de e-mail da conta**, que depende da confirmação de e-mail.

## como executar

```bash
pnpm install
pnpm db:migrate:local   # cria o banco local e aplica as migrações
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). Para a busca real no YouTube, copie `.dev.vars.example` para `.dev.vars` e preencha `YOUTUBE_API_KEY`; sem a chave a busca devolve resultados de exemplo.

## testes

```bash
pnpm typecheck     # tipos
pnpm lint          # estilo e erros comuns
pnpm test          # unitários e integração (rotas e serviços contra um D1 real em memória)
pnpm test:coverage # cobertura
pnpm test:e2e      # fluxos completos no navegador (Chromium e iPhone)
```

O plano de testes, com a rastreabilidade dos requisitos, está em `docs/TEST_PLAN.md`.

## publicação na Cloudflare

```bash
pnpm exec wrangler login   # uma vez
pnpm db:migrate:remote     # aplica migrações novas no D1 de produção
pnpm run deploy            # build do OpenNext e publicação (use "run": `pnpm deploy` é um comando nativo do pnpm)
pnpm preview               # roda o build de produção localmente
pnpm exec wrangler secret put YOUTUBE_API_KEY   # ativa a busca real no YouTube
```

## segurança

- senhas com PBKDF2-SHA256 e sal individual, comparadas em tempo constante; o login de um e-mail inexistente gasta o mesmo tempo de um existente;
- sessões guardadas só como hash; cookie `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS;
- toda consulta filtra pelo dono do registro, e registros alheios respondem 404;
- limite de tentativas em login, cadastro e busca; checagem de origem contra CSRF; erros sem detalhes internos;
- cabeçalhos de segurança (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS) em `lib/security-headers.ts`;
- anotações higienizadas no navegador e no servidor; imagens restritas a PNG, JPG, WEBP e GIF.

## limitações conhecidas

- não há recuperação de senha por e-mail até existir um domínio para o envio;
- o e-mail da conta ainda não pode ser alterado;
- o limite de tentativas vive na memória de cada instância do Worker; a proteção global fica a cargo de uma regra de Rate Limiting da Cloudflare.
