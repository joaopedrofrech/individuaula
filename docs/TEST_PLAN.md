# Plano de testes do IndividuAula

Esta etapa contém a implementação funcional inicial e sua esteira de qualidade. Os testes documentam os contratos de domínio, os handlers, os componentes e os fluxos de navegador que devem continuar verdes durante a evolução do projeto.

## ferramentas e comandos

| camada | ferramenta | comando |
| --- | --- | --- |
| tipagem | TypeScript | `pnpm typecheck` |
| lint | ESLint | `pnpm lint` |
| unidade e integração | Vitest + Testing Library | `pnpm test` |
| cobertura | Vitest + V8 | `pnpm test:coverage` |
| fluxos de navegador | Playwright | `pnpm test:e2e` |
| inspeção interativa | Playwright UI | `pnpm test:e2e:ui` |

## rastreabilidade dos casos de uso

| caso de uso | contratos unitários | contratos de integração | fluxos E2E |
| --- | --- | --- | --- |
| UC01 — cadastrar usuário | `tests/unit/validators.test.ts`, `tests/unit/auth-service.test.ts` | `tests/integration/auth-routes.test.ts` | `tests/e2e/auth-flows.spec.ts` |
| UC02 — realizar login | `tests/unit/validators.test.ts`, `tests/unit/auth-service.test.ts`, `tests/unit/session.test.ts` | `tests/integration/auth-routes.test.ts` | `tests/e2e/auth-flows.spec.ts`, `tests/e2e/security-flows.spec.ts` |
| UC03 — gerenciar disciplinas | `tests/unit/study-state.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC04 — gerenciar anotações | `tests/unit/study-state.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC05 — gerenciar avaliações e notas | `tests/unit/study-state.test.ts`, `tests/unit/academics.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC06 — acompanhar desempenho | `tests/unit/academics.test.ts`, `tests/unit/study-state.test.ts` | dashboard e dados agregados | `tests/e2e/academic-flows.spec.ts`, `tests/e2e/content-dashboard.spec.ts` |
| UC07 — pesquisar conteúdos | `tests/unit/youtube.test.ts`, `tests/unit/validators.test.ts` | `tests/integration/youtube-route.test.ts` | `tests/e2e/content-dashboard.spec.ts` |
| UC08 — visualizar dashboard | `tests/integration/dashboard.test.tsx` | dados agregados do usuário | `tests/e2e/content-dashboard.spec.ts`, `tests/e2e/accessibility-responsive.spec.ts` |

## rastreabilidade dos requisitos funcionais

- RF01–RF05: autenticação, sessão e perfil em `tests/unit/auth-service.test.ts`, `tests/unit/session.test.ts` e `tests/integration/auth-routes.test.ts`;
- RF06–RF10: ciclo de vida e isolamento de disciplinas em `tests/unit/study-state.test.ts` e `tests/e2e/academic-flows.spec.ts`;
- RF11–RF16: ciclo de vida, pesquisa e datas de anotações nos contratos de persistência e no fluxo E2E acadêmico;
- RF17–RF23: avaliações, notas, média ponderada, média geral, histórico e estado vazio em `tests/unit/academics.test.ts`, `tests/unit/study-state.test.ts` e `tests/e2e/academic-flows.spec.ts`;
- RF24–RF29: validação, normalização, fallback, falhas da API e pesquisa contextual em `tests/unit/youtube.test.ts`, `tests/integration/youtube-route.test.ts` e `tests/e2e/content-dashboard.spec.ts`;
- RF30–RF33: resumo, disciplinas, médias e indicadores em `tests/integration/dashboard.test.tsx` e `tests/e2e/content-dashboard.spec.ts`.

## rastreabilidade dos requisitos não funcionais

- RNF03, RNF14, RNF15 e RNF16: navegação por teclado, nomes acessíveis, troca de tema, consistência de estados e ausência de overflow em `tests/e2e/accessibility-responsive.spec.ts` e `tests/integration/forms.test.tsx`;
- RNF05, RNF06, RNF07 e RNF09: senha não devolvida ao cliente, cookie HttpOnly, expiração, logout e isolamento entre usuários em `tests/unit/auth-service.test.ts`, `tests/unit/session.test.ts`, `tests/unit/study-state.test.ts` e `tests/e2e/security-flows.spec.ts`;
- RNF10, RNF11, RNF13 e RNF29: schemas, mensagens de validação, integridade das relações, erros e ciclos CRUD nos testes unitários e E2E;
- RNF17, RNF18, RNF24, RNF26 e RNF30: separação entre testes de domínio, integração, interface e E2E;
- RNF19 e RNF20: chave da API somente no servidor, normalização da busca, fallback e indisponibilidade em `tests/unit/youtube.test.ts` e `tests/integration/youtube-route.test.ts`;
- RNF01, RNF02, RNF04, RNF08, RNF21, RNF22, RNF23, RNF25, RNF27 e RNF28: aceite operacional da infraestrutura Cloudflare, HTTPS, backup, restauração, navegadores suportados, versionamento e política de exclusão na etapa de produção.

## segurança e robustez (etapa de endurecimento)

| risco | contrato | teste |
| --- | --- | --- |
| sessão sequestrada | token só como hash no banco; sessão vence em 7 dias; logout apaga a sessão no servidor; um aparelho não derruba o outro | `tests/unit/auth-service.test.ts`, `tests/e2e/persistence.spec.ts` |
| força bruta e abuso de cota | limite por cliente em login (10/min), cadastro (5/min) e busca (30/min), com `Retry-After` | `tests/unit/rate-limit.test.ts`, `tests/integration/auth-routes.test.ts`, `tests/integration/youtube-api-route.test.ts` |
| CSRF | rotas que alteram estado rejeitam `Origin` de outro site | `tests/unit/api.test.ts`, `tests/integration/auth-routes.test.ts` |
| vazamento de detalhes internos | erros de validação mostram só a primeira mensagem, nunca o dump do Zod | `tests/unit/api.test.ts`, `tests/integration/auth-routes.test.ts` |
| XSS em anotações | sanitização com e sem DOM; imagem restrita a PNG, JPG, WEBP e GIF em base64 | `tests/unit/notes.test.ts`, `tests/unit/validators.test.ts` |
| mass assignment | atualizações validam com schemas parciais e descartam campos como `userId` | `tests/unit/validators.test.ts`, `tests/integration/app-provider.test.tsx` |
| clickjacking e injeção de conteúdo | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy` | `tests/unit/security-headers.test.ts`, `tests/e2e/security-flows.spec.ts` |
| perda de dados no navegador | cota cheia avisa em vez de quebrar; dados corrompidos voltam ao estado vazio | `tests/integration/app-provider.test.tsx`, `tests/e2e/security-flows.spec.ts` |
| regressão de deploy | `keep_names` desligado (evita `__name is not defined` no tema) e nome do worker | `tests/unit/deploy-config.test.ts` |

## persistência no banco (D1)

| contrato | teste |
| --- | --- |
| contas, sessões e tokens vivem no D1; senha só como hash PBKDF2; token só como hash | `tests/unit/auth-service.test.ts` |
| contas: e-mail único mesmo com cadastros simultâneos, senha só como hash PBKDF2 com sal, mesma resposta para senha errada e e-mail inexistente | `tests/unit/auth-service.test.ts`, `tests/integration/auth-routes.test.ts` |
| dados acadêmicos isolados por aluno, exclusão em cascata e sem registros órfãos | `tests/unit/study-data.test.ts`, `tests/integration/data-routes.test.ts` |
| o cliente grava no banco em fila ordenada, desfaz se falhar e não usa o armazenamento do navegador | `tests/integration/app-provider.test.tsx` |
| dados persistem ao recarregar, aparecem em outro navegador e nunca chegam a outro aluno | `tests/e2e/persistence.spec.ts` |
| o schema testado é o de produção: as migrações reais são aplicadas no banco de teste | `tests/support/test-db.ts` |

Os testes de servidor rodam contra um D1 real em memória (miniflare). O teste do `AppProvider` precisa de DOM e usa um adaptador de D1 sobre o SQLite nativo do Node (`tests/support/sqlite-d1.ts`).

## rolagem infinita nos conteúdos

| contrato | teste |
| --- | --- |
| a página seguinte só é pedida quando o fim da lista aparece; vídeos novos entram sem tirar os anteriores; duplicados são descartados | `tests/integration/content-search.test.tsx`, `tests/e2e/infinite-scroll.spec.ts` |
| falha ao carregar mais mantém a lista e oferece "tentar de novo"; busca nova ignora respostas atrasadas da anterior | `tests/integration/content-search.test.tsx`, `tests/e2e/infinite-scroll.spec.ts` |
| limite de 8 páginas por busca para proteger a cota; aviso de fim da lista | `tests/integration/content-search.test.tsx` |
| servidor: 12 vídeos por página, token de página validado e nunca repassado se vier fora do formato | `tests/integration/youtube-route.test.ts` |

## limitações conhecidas

- os limites de tentativas vivem na memória de cada instância do worker; para um limite global, usar o Rate Limiting da Cloudflare;
- as telas (`app-shell`, listas e detalhes) são exercitadas pelos testes E2E, mas não aparecem na cobertura do Vitest;
- a recuperação de senha por e-mail foi retirada até haver um domínio para o envio; os testes dela voltam junto com o recurso.

## critério de passagem

1. cada contrato deve continuar verde quando um módulo for alterado;
2. a suíte não pode depender de dados de outro teste, de ordem específica ou de credenciais reais;
3. testes de API devem verificar status, corpo, cookies, autorização e ausência de segredos;
4. testes de interface devem priorizar papéis, rótulos, teclado e estados visíveis;
5. antes de cada entrega, `typecheck`, `lint`, Vitest e Playwright devem passar em CI;
6. mudanças de infraestrutura devem adicionar testes de aceitação operacional antes da migração para produção.
