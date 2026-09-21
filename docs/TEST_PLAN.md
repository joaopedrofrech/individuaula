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
| UC01 — cadastrar usuário | `tests/unit/validators.test.ts`, `tests/unit/auth.test.ts` | `tests/integration/auth-routes.test.ts` | `tests/e2e/auth-flows.spec.ts` |
| UC02 — realizar login | `tests/unit/validators.test.ts`, `tests/unit/auth.test.ts`, `tests/unit/session.test.ts` | `tests/integration/auth-routes.test.ts` | `tests/e2e/auth-flows.spec.ts`, `tests/e2e/security-flows.spec.ts` |
| UC03 — gerenciar disciplinas | `tests/unit/study-store.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC04 — gerenciar anotações | `tests/unit/study-store.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC05 — gerenciar avaliações e notas | `tests/unit/study-store.test.ts`, `tests/unit/academics.test.ts`, `tests/unit/validators.test.ts` | contratos de autenticação e persistência | `tests/e2e/academic-flows.spec.ts` |
| UC06 — acompanhar desempenho | `tests/unit/academics.test.ts`, `tests/unit/study-store.test.ts` | dashboard e dados agregados | `tests/e2e/academic-flows.spec.ts`, `tests/e2e/content-dashboard.spec.ts` |
| UC07 — pesquisar conteúdos | `tests/unit/youtube.test.ts`, `tests/unit/validators.test.ts` | `tests/integration/youtube-route.test.ts` | `tests/e2e/content-dashboard.spec.ts` |
| UC08 — visualizar dashboard | `tests/integration/dashboard.test.tsx` | dados agregados do usuário | `tests/e2e/content-dashboard.spec.ts`, `tests/e2e/accessibility-responsive.spec.ts` |

## rastreabilidade dos requisitos funcionais

- RF01–RF05: autenticação, sessão, recuperação e perfil em `tests/unit/auth.test.ts`, `tests/unit/session.test.ts` e `tests/integration/auth-routes.test.ts`;
- RF06–RF10: ciclo de vida e isolamento de disciplinas em `tests/unit/study-store.test.ts` e `tests/e2e/academic-flows.spec.ts`;
- RF11–RF16: ciclo de vida, pesquisa e datas de anotações nos contratos de persistência e no fluxo E2E acadêmico;
- RF17–RF23: avaliações, notas, média ponderada, média geral, histórico e estado vazio em `tests/unit/academics.test.ts`, `tests/unit/study-store.test.ts` e `tests/e2e/academic-flows.spec.ts`;
- RF24–RF29: validação, normalização, fallback, falhas da API e pesquisa contextual em `tests/unit/youtube.test.ts`, `tests/integration/youtube-route.test.ts` e `tests/e2e/content-dashboard.spec.ts`;
- RF30–RF33: resumo, disciplinas, médias e indicadores em `tests/integration/dashboard.test.tsx` e `tests/e2e/content-dashboard.spec.ts`.

## rastreabilidade dos requisitos não funcionais

- RNF03, RNF14, RNF15 e RNF16: navegação por teclado, nomes acessíveis, troca de tema, consistência de estados e ausência de overflow em `tests/e2e/accessibility-responsive.spec.ts` e `tests/integration/forms.test.tsx`;
- RNF05, RNF06, RNF07 e RNF09: senha não devolvida ao cliente, cookie HttpOnly, expiração, logout e isolamento entre usuários em `tests/unit/auth.test.ts`, `tests/unit/session.test.ts`, `tests/unit/study-store.test.ts` e `tests/e2e/security-flows.spec.ts`;
- RNF10, RNF11, RNF13 e RNF29: schemas, mensagens de validação, integridade das relações, erros e ciclos CRUD nos testes unitários e E2E;
- RNF17, RNF18, RNF24, RNF26 e RNF30: separação entre testes de domínio, integração, interface e E2E;
- RNF19 e RNF20: chave da API somente no servidor, normalização da busca, fallback e indisponibilidade em `tests/unit/youtube.test.ts` e `tests/integration/youtube-route.test.ts`;
- RNF01, RNF02, RNF04, RNF08, RNF21, RNF22, RNF23, RNF25, RNF27 e RNF28: aceite operacional da infraestrutura Cloudflare, HTTPS, backup, restauração, navegadores suportados, versionamento e política de exclusão na etapa de produção.

## critério de passagem

1. cada contrato deve continuar verde quando um módulo for alterado;
2. a suíte não pode depender de dados de outro teste, de ordem específica ou de credenciais reais;
3. testes de API devem verificar status, corpo, cookies, autorização e ausência de segredos;
4. testes de interface devem priorizar papéis, rótulos, teclado e estados visíveis;
5. antes de cada entrega, `typecheck`, `lint`, Vitest e Playwright devem passar em CI;
6. mudanças de infraestrutura devem adicionar testes de aceitação operacional antes da migração para produção.
