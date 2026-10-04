# MELHORIAS — Db_Mongo_Jhuly_Site

> **Gerado por análise de código em 2026-10-02** · Stack: Node 18 + Express + Mongoose 7 + JWT + BCrypt + Cloudinary + multer
> Branch `main` · base (README 21/09) · 415 LOC · **0 testes** (`npm test` = `exit 1`) · sem CI
>
> **Este arquivo é um plano de execução.** Cada item tem ID, `arquivo:linha`, mudança exata,
> critério de aceite e comando de verificação.
>
> **Nota:** este repositório é **gêmeo** de `Db_Mongo_Empresa_Completo` (215 vs 216 linhas no mesmo
> `authController.js`, mesmo middleware, mesmo upload). A correção é a mesma, com **uma diferença**
> registrada em `BUG-01` (a validação de avaliação está **correta** aqui).

---

## 0. Como usar este documento

1. Execute na ordem **P0 → P1 → P2 → P3**, respeitando as ondas da §8.
2. Ao terminar um item: marque `- [x]`, rode o **Verificação**, comite `fix(<ID>): descrição`.
3. **`MEUSEGREDO` não tem fallback** — diferente das APIs irmãs. Sem a variável, o JWT é assinado
   com `undefined` e o `jwt.sign` **lança** no login (falha ruidosa) — mas o middleware
   `authMiddleware.js:14` verifica com `undefined`, o que também lança.Ou seja: **falha ao iniciar,
   não fica silencioso**. Ainda assim,falha explícita é melhor (ver `SEC-03`).
4. **Idioma:** português.

---

## 1. Diagnóstico executivo

API de cadastro/login de usuários, comentários com avaliação (1–5) e upload de foto de perfil para
Cloudinary, com MongoDB (Atlas). Estrutura MVC simples e legível.

**O que está bem (não reaça):**

| Item | Evidência |
|---|---|
| Senha com **BCrypt custo 10** | `authController.js:34` |
| `password` com **`select: false`** no schema | `models/user.js:22` — não vaza em `find()` |
| Resposta de login **uniforme** (`Credenciais inválidas`) | `authController.js:61,67,77` |
| E-mail **lowercase + unique** | `models/user.js:16-19` |
| Token com **2 h** e claim `userId` | `authController.js:73` |
| Middleware JWT **verifica assinatura** (não decodifica solto) | `authMiddleware.js:14` |
| Comentário usa `req.user.userId` (não o body) | `authController.js:138` |
| Validação de avaliação 1–5 para string | `authController.js:152` |
| Swagger gerado e servido | `app.js:35`, `swagger.js` |

**O que está quebrado:**

1. **IDOR no upload**: `/upload_foto_profile` busca o usuário pelo **`req.body.email`** em vez de
   `req.user.userId` (`authController.js:104`) — qualquer autenticado troca a foto de **qualquer
   conta**.
2. **`npm test` está quebrado por design**: `"test": "echo \"Error: no test specified\" && exit 1"`.
3. **145 dependências diretas** em `dependencies` — inclui `nodemon`, `swagger-autogen` (dev).
4. `MEUSEGREDO` sem validação de tamanho → chave curta é aceita.

---

## 2. Tabela de prioridades

| ID | Título | Sev | Arquivo | Depende de |
|---|---|---|---|---|
| SEC-01 | IDOR: upload troca a foto de qualquer usuário | **P0** | `controllers/authController.js:104` | — |
| SEC-02 | `GET /comentarios` **sem auth** e N+1 queries | **P1** | `controllers/authController.js:185-213` | — |
| SEC-03 | `MEUSEGREDO` sem validação (chave curta aceita) | **P1** | `controllers/authController.js:12` | — |
| SEC-04 | Upload sem limite de tamanho nem tipo de arquivo | **P1** | `controllers/authController.js:85-94` | — |
| SEC-05 | `cors()` aberto (qualquer origem) | **P1** | `app.js:26` | — |
| SEC-06 | Login/register sem rate limit | **P1** | `controllers/authController.js:18,53` | — |
| SEC-07 | Sem `helmet`/headers de segurança | **P2** | `app.js` | — |
| SEC-08 | `bodyParser.json()` sem limite | **P2** | `app.js:15` | — |
| BUG-01 | Validação de avaliação diverge do gêmeo (aqui está correta) | **P2** | `authController.js:157` | — |
| BUG-02 | `fs.unlinkSync` sem tratamento (arquivo fica se upload falhar) | **P2** | `authController.js:122` | — |
| BUG-03 | Falha de conexão do Mongo só vai para `console.error` | **P1** | `config/db.js:16` | — |
| BUG-04 | `swagger_output.json` gerado e versionado | **P2** | `app.js:7` | — |
| IMP-01 | Sem `POST /comentarios` verificando se o usuário existe | **P2** | `authController.js:162` | — |
| IMP-02 | Sem validação de e-mail no registro | **P2** | `authController.js:23` | — |
| TEST-01 | `npm test` falha por design (`exit 1`) | **P1** | `package.json:153` | SEC-01 |
| DEVOPS-01 | 145 dependências diretas (dev misturada) | **P2** | `package.json` | — |
| DEVOPS-02 | Sem CI | **P2** | *(ausente)* | — |
| DEVOPS-03 | Sem `.env.example` | **P2** | *(ausente)* | SEC-03 |
| DEVOPS-04 | Sem Dockerfile | **P3** | *(ausente)* | — |
| DOC-01 | README não documenta variáveis | **P2** | `README.md` | DEVOPS-03 |
| DOC-02 | Falta `SECURITY.md` | **P3** | *(ausente)* | SEC-01 |

**Placar: 1 P0 · 7 P1 · 11 P2 · 2 P3 = 21 itens.**

---

## 3. Segurança

### SEC-01 · IDOR: upload troca a foto de qualquer usuário · [P0]

- **Arquivo:** `controllers/authController.js:96-132`
- **Evidência:**
  ```javascript
  router.post('/upload_foto_profile', authMiddleware, upload.single('fotoPerfil'), async (req, res) => {
    if (!req.body.email) { return res.status(406).json({ error: 'Campo email é obrigatório' }); }
    const user = await User.findOne({ email: req.body.email });   // <-- linha 104
    ...
    user.photoUrl = photoUrl;
    await user.save();
  ```
  A rota tem `authMiddleware` (exige token), mas **ignora `req.user`** e busca o alvo pelo `email`
  do **corpo** da requisição. Note que o próprio projeto já faz certo na rota de comentários
  (`authController.js:138`: `const usuario = req.user.userId;`) — a rota de upload destoa.
- **Impacto:** **Insecure Direct Object Reference.** Qualquer usuário autenticado que saiba (ou chute) um
  e-mail cadastrado envia `email=vitima@x.com` + uma imagem e **sobrescreve a foto de perfil da
  vítima**. Isso é vandalismo de identidade — e como o app exibe a foto ao lado do nome/avaliação
  (`authController.js:201`, `foto: usuario.photoUrl`), permite suplantar visualmente uma pessoa
  (engenharia social: foto de outra pessoa + nome real).
- **Mudança:** (1) **remover o `email` do body** e usar a identidade do token:
  ```javascript
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  ```
  (2) se por UX o email for necessário no body, **comparar** com o do token e recusar divergência —
  mas o certo é **não aceitar** o campo; (3) o mesmo padrão do `authController.js:138`.
- **Aceite:** token de A + `email` de B → **404/403**, e a foto de B **não** muda.
- **Verificação:**
  ```bash
  # token de A, email de B:
  curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/upload_foto_profile \
    -H "Authorization: Bearer $TOKEN_A" -F 'email=vitima@x.com' -F 'fotoPerfil=@/tmp/foto.png'
  # esperado 404/403 (hoje: 200 e troca a foto da vítima)
  ```

### SEC-02 · `GET /comentarios` sem auth e com N+1 queries · [P1]

- **Arquivo:** `controllers/authController.js:185-213`
- **Evidência:** a rota **não** tem `authMiddleware`, e faz `Comentario.find()` seguido de
  `User.findById()` **dentro de um `for`** (linhas 194-195) — uma query por comentário.
- **Impacto:** (a) **dois** problemas: rota pública que devolve **nome, comentário, avaliação e foto
  de todos os usuários** — enumeração completa de usuários e conteúdo sem token; (b) **N+1**: 100
  comentários = **101** queries no banco, sequenciais (o `await` dentro do `for`, linha 195). Com
  muitos comentários, a rota **derruba** o servidor (event loop saturado por I/O) — DoS trivial por
  chamada repetida.
- **Mudança:** (1) decidir se a rota é pública: se for (feed de avaliações), **remover** `foto` e
  limitar (`limit`, `sort`, `populate`); se não for, exigir `authMiddleware`. (2) **eliminar o N+1**:
  ```javascript
  const comentarios = await Comentario.find()
    .sort({ criadoEm: -1 })
    .limit(50)
    .populate('usuario', 'name photoUrl');   // 1 query
  ```
  (3) paginação.
- **Aceite:** resposta vem com **1** query (não N+1); rota com limite de itens; sem PII além do
  necessário.
- **Verificação:**
  ```bash
  # ligar o log de query do mongoose e chamar a rota com 100 comentarios -> deve ver 1 query
  curl -s 'http://localhost:3000/comentarios' | jq 'length'   # <= 50
  ```

### SEC-03 · `MEUSEGREDO` sem validação (chave curta aceita) · [P1]

- **Arquivo:** `controllers/authController.js:12` e `controllers/authMiddleware.js:2`
- **Evidência:** `const meusegredo = process.env.MEUSEGREDO;` — sem validação, em **dois** arquivos
  (duplicação: o segredo é lido duas vezes).
- **Impacto:** sem a variável, o `jwt.sign` lança no login (falha ruidosa — bom), mas o
  `authMiddleware.js:14` com `undefined` também lança → **toda rota protegida dá 500** (porque o
  `catch` de `authMiddleware.js:21` só captura o que `jwt.verify` lançar — na verdade captura, então
  dá 401). O risco real é outro: **chave curta** (ex.: `"s"`) é aceita silenciosamente — HMAC com
  chave de 1 byte é quebrável por força bruta em segundos, e a API **não avisa**.
- **Mudança:** (1) ler **uma vez**, em `config/env.js`, validando presença e **≥ 32 bytes**, falhando
  alto no boot se inválida; (2) `authMiddleware.js` e `authController.js` importam desse módulo
  (elimina a duplicação); (3) o nome `MEUSEGREDO` → `JWT_SECRET` (nome descritivo).
- **Aceite:** sem `JWT_SECRET` (ou < 32 bytes) o processo não inicia; mensagem clara.
- **Verificação:**
  ```bash
  unset MEUSEGREDO; node app.js 2>&1 | grep -i 'MEUSEGREDO\|JWT_SECRET'   # falha alto
  MEUSEGREDO=curta node app.js   # deve recusar por tamanho
  ```

### SEC-04 · Upload sem limite de tamanho nem tipo de arquivo · [P1]

- **Arquivo:** `controllers/authController.js:85-94` (`multer.diskStorage`) e `:96`
- **Evidência:**
  ```javascript
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  });
  const upload = multer({ storage: storage });   // sem limits, sem fileFilter
  ```
  Sem `limits.fileSize` e **sem `fileFilter`**. O nome usa `file.originalname` cru.
- **Impacto:** (a) **DoS de disco**: `multer` sem limite aceita arquivo de qualquer tamanho até o
  disco encher — e a pasta `uploads/` **não é criada** no código (dá erro se não existir) nem
  limpa; (b) `file.originalname` pode conter `../` (**path traversal** na escrita) — o multer
  sanitiza parcialmente, mas relying nisso é frágil; (c) qualquer tipo é aceito (executável, script)
  e depois **sobe para o Cloudinary** (`upload_fotos.js:17`) e vira URL pública.
- **Mudança:** (1) `limits: { fileSize: 5 * 1024 * 1024 }` (5 MB para foto de perfil é folgado);
  (2) `fileFilter` aceitando **só** `image/jpeg`, `image/png`, `image/webp` (validar **magic bytes**,
  não só o MIME do cliente — este último é controlado pelo atacante); (3) gerar nome **próprio**
  (`crypto.randomUUID() + ext`) em vez de `originalname`; (4) garantir que `uploads/` existe
  (`fs.mkdirSync(..., { recursive: true })`).
- **Aceite:** arquivo > 5 MB → erro; `.exe`/`.html` → recusado; nome gerado pelo servidor.
- **Verificação:**
  ```bash
  # 1) upload de 20MB -> recusado
  head -c 20000000 /dev/urandom > /tmp/big.bin
  curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/upload_foto_profile \
    -H "Authorization: Bearer $TOKEN" -F 'email=meu@x.com' -F 'fotoPerfil=@/tmp/big.bin'   # 4xx
  # 2) upload de script -> recusado
  echo '<?php system($_GET["c"]); ?>' > /tmp/evil.php
  curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/upload_foto_profile \
    -H "Authorization: Bearer $TOKEN" -F 'email=meu@x.com' -F 'fotoPerfil=@/tmp/evil.php'   # 4xx
  ```

### SEC-05 · `cors()` aberto (qualquer origem) · [P1]

- **Arquivo:** `app.js:26` (`app.use(cors())`)
- **Evidência:** `cors()` **sem opções** = `Access-Control-Allow-Origin: *` para todas as rotas.
- **Impacto:** qualquer site pode chamar a API no navegador. As rotas de leitura são públicas
  (`SEC-02`), então isso **vaza** nome/foto/avaliação de todos sem token. Se depois houver rota com
  cookie, vira CSRF; com `Authorization` header, o atacante precisa do token (mas a rota de comentários
  **não** exige token — ver `SEC-02`).
- **Mudança:** `cors({ origin: <allowlist de env>, credentials: true })` — nunca `cors()` nu.
- **Aceite:** `Origin` fora da allowlist não recebe o header.
- **Verificação:**
  ```bash
  curl -sI http://localhost:3000/comentarios -H 'Origin: https://evil.example' \
    | grep -i 'access-control-allow-origin'   # ausente
  ```

### SEC-06 · Login/register sem rate limit · [P1]

- **Arquivo:** `controllers/authController.js:18` (`/register`) e `:53` (`/login`)
- **Evidência:** nenhuma proteção; o `package.json:153` confirma que não há teste de proteção nenhuma.
- **Impacto:** brute-force de senha (BCrypt custo 10 retarda, mas um laço paralelo faz milhares/min)
  + **enumeração de e-mail** (o `/register` devolve `409 Usuário já existe`, o que confirma se o
  e-mail tem conta) + flood de cadastro.
- **Mudança:** `express-rate-limit` — 5 tentativas/5 min por IP+e-mail no login; 10 cadastros/hora no
  register; resposta **uniforme**.
- **Aceite:** 6ª tentativa → `429`.
- **Verificação:**
  ```bash
  for i in $(seq 1 7); do
    curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/login \
      -H 'Content-Type: application/json' -d '{"email":"a@a.com","password":"errada"}'
  done; echo   # 401s e depois 429
  ```

### SEC-07 · Sem `helmet`/headers de segurança · [P2]

- **Arquivo:** `app.js` (só `bodyParser` e `cors`)
- **Evidência:** nenhum `helmet`.
- **Impacto:** sem `nosniff`, sem `X-Frame-Options` (Swagger pode ser *frameado*), sem HSTS.
- **Mudança:** `npm i helmet` + `app.use(helmet())`; observar que o `swagger-ui-express` pode
  precisar de ajuste de CSP.
- **Aceite:** headers presentes.
- **Verificação:**
  ```bash
  curl -sI http://localhost:3000/ | grep -iE 'x-frame-options|x-content-type-options'
  ```

### SEC-08 · `bodyParser.json()` sem limite · [P2]

- **Arquivo:** `app.js:15` (`app.use(bodyParser.json())`) e `:29` (`express.json()`)
- **Evidência:** sem `limit` (e os dois **em duplicidade**: `bodyParser.json()` e `express.json()`).
- **Impacto:** payload ilimitado em memória. E a duplicação faz o body ser parseado **duas vezes**.
- **Mudança:** `app.use(express.json({ limit: '100kb' }))` (só o `express`, remova o `body-parser`).
- **Aceite:** payload > 100 KB → `413`.
- **Verificação:**
  ```bash
  head -c 200000 /dev/zero | tr '\0' 'a' > /tmp/big.json
  curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/login \
    -H 'Content-Type: application/json' --data-binary @/tmp/big.json   # 413
  ```

---

## 4. Bugs e defeitos funcionais

### BUG-01 · Validação de avaliação divergente do repositório gêmeo · [P2]

- **Arquivo:** `controllers/authController.js:156-160`
- **Evidência:** aqui a condição é
  ```javascript
  if (typeof avaliacao == "number") {
    if (avaliacao < 1 || avaliacao > 5) { return res.status(400)...; }
  }
  ```
  que está **correta** (usa `||`, que é o certo aqui: fora de faixa **ou** não-número entra em erro).
  O gêmeo `Db_Mongo_Empresa_Completo` tem `if (avaliacao || avaliacao < 1 || avaliacao > 5)` — que é
  bug lá (sempre verdadeiro). **Aqui não há bug** — registrei só para não "consertar" o que está certo.
- **Impacto:** baixo neste repo. Mas a **duplicação** é o problema: duas cópias do mesmo arquivo
  divergiram, e o gêmeo está quebrado. Quem corrigir um pode quebrar o outro (ou o contrário).
- **Mudança:** (1) **não** alterar a condição (ela está correta); (2) tratar a causa raiz da
  divergência: **eliminar a duplicação** — extrair o `authController` para um módulo compartilhado
  (ou copiar após cada correção, com teste em ambos); (3) como o `BUG-01` do gêmeo mostra, o
  `||`-vs-`&&` é fácil de errar: unificar os dois ramos (string/número) num `Number()` com
  `!(v >= 1 && v <= 5)`, que é inequívoco nos **dois** repositórios.
- **Aceite:** os dois repositórios têm a mesma lógica e o mesmo teste; `avaliacao: 4` → `201`,
  `0`/`6`/`"abc"` → `400` em ambos.
- **Verificação:**
  ```bash
  for v in 4 0 6 '"3,5"' '"abc"'; do
    curl -s -o /dev/null -w "avaliacao=$v -> %{http_code}\n" -X POST http://localhost:3000/comentarios       -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'       -d "{\"conteudo\":\"bom\",\"avaliacao\":$v}"
  done
  ```

### BUG-02 · `fs.unlinkSync` sem tratamento · [P2]

- **Arquivo:** `controllers/authController.js:122` (`fs.unlinkSync(tempPath)`)
- **Evidência:** o arquivo temporário é apagado **após** o upload, mas o `catch` (linha 128) **não**
  apaga se o `uploadPhoto` lançar (linha 118).
- **Impacto:** upload falha (Cloudinary fora) → o arquivo fica em `uploads/` **para sempre**.
  Acumula disco. Repetir falha enche a pasta.
- **Mudança:** `try { ... } finally { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); }`
  — garante limpeza independente do resultado.
- **Aceite:** falha no upload não deixa arquivo em `uploads/`.
- **Verificação:**
  ```bash
  ls uploads/ | wc -l   # antes e depois de um upload que falha; deve ser igual
  ```

### BUG-03 · Falha de conexão do Mongo só vai para `console.error` · [P1]

- **Arquivo:** `config/db.js:16`
- **Evidência:** `.catch(err => console.error('Erro ao conectar ao MongoDB:', err));` — a aplicação
  **continua rodando** sem banco.
- **Impacto:** (a) toda requisição que toque o banco dá erro 500 (ou worse, dá `null` e o código
  segue — como em `authController.js:195`, `if (usuario)` protege); (b) o healthcheck/orquestrador
  não sabe que o serviço está inútil; (c) a **API "sobe" sem banco**, dando falsa impressão de
  funcionamento.
- **Mudança:** (1) falhar alto no boot (`process.exit(1)`) ou expor `/health` que reporta o estado
  do Mongo e faça o container **não** ser considerado pronto; (2) `retryWrites`, `serverSelectionTimeoutMS`
  e retry inicial.
- **Aceite:** sem Mongo, o processo não "sobe saudável".
- **Verificação:**
  ```bash
  MONGO_URI=mongodb://127.0.0.1:1/x node app.js   # deve falhar alto (ou /health = down)
  ```

### BUG-04 · `swagger_output.json` gerado e versionado · [P2]

- **Arquivo:** `app.js:7` (`require('./swagger_output.json')`) e `package.json:156`
  (`"generate-swagger": "node swagger.js"`)
- **Evidência:** o OpenAPI é **gerado** por `swagger.js` e importado por `app.js` — mas o arquivo
  gerado está versionado (verifique com `git ls-files`).
- **Impacto:** (a) **duas fontes de verdade**: se o código muda e o `swagger_output.json` não é
  regerado, a documentação mente; (b) commit gerado a cada mudança = diff ilegível; (c) o arquivo
  pode não existir em clone novo → **crash no boot**.
- **Mudança:** (1) gerar no **start** (`prestart`/`start` roda `node swagger.js` antes) ou em
  `postinstall`; (2) **gitignorar** `swagger_output.json`; (3) garantir que a API não suba sem ele
  (ou gerar fallback).
- **Aceite:** `rm swagger_output.json && npm start` funciona (gera antes de subir).
- **Verificação:**
  ```bash
  rm -f swagger_output.json && npm start   # deve funcionar
  git ls-files --error-unmatch swagger_output.json 2>/dev/null && echo 'ainda versionado' || echo OK
  ```

### IMP-01 · Comentário aceita `usuario` inexistente · [P2]

- **Arquivo:** `controllers/authController.js:162-166`
- **Evidência:** `const novoComentario = new Comentario({ usuario, ... })` com `usuario = req.user.userId`
  (linha 138) — **sem verificar** que o usuário existe no banco.
- **Impacto:** se o registro for removido mas o token ainda válido (2 h), o comentário é salvo
  apontando para usuário inexistente. Na leitura (`authController.js:195`, `if (usuario)`), o
  comentário **some silenciosamente** da listagem — dado perdido sem erro.
- **Mudança:** validar `User.findById(usuario)` antes de salvar, ou tornar `usuario` **obrigatório e
  com `ref`+índice** no schema, e validar no save.
- **Aceite:** comentário com usuário inexistente → `404`, não salvo.
- **Verificação:** (teste) token válido + usuário removido do banco → `404`.

### IMP-02 · Sem validação de e-mail no registro · [P2]

- **Arquivo:** `controllers/authController.js:23-25`
- **Evidência:** valida apenas **presença** (`if (!email || !password || !name)`) — não formato,
  nem tamanho mínimo de senha.
- **Impacto:** e-mail inválido (`"abc"`) cria conta irrecuperável (não pode logar); senha de 1
  caractere passa.
- **Mudança:** validar formato de e-mail e senha **≥ 8**; normalizar (`toLowerCase` já está no
  schema, mas `findOne({ email })` na linha 28 deve usar o mesmo normalizado).
- **Aceite:** `email: "abc"` ou `password: "a"` → `422`.
- **Verificação:**
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/register \
    -H 'Content-Type: application/json' -d '{"email":"abc","password":"a","name":"x"}'   # 422
  ```

---

## 5. Qualidade: testes

### TEST-01 · `npm test` falha por design (`exit 1`) · [P1]

- **Arquivo:** `package.json:153`
- **Evidência:** `"test": "echo \"Error: no test specified\" && exit 1"` — é o placeholder padrão do
  `npm init`. Rodar `npm test` **sempre** falha com código 1.
- **Impacto:** o projeto **não tem** nenhum teste, e o comando de teste **não funciona**. É o mesmo
  padrão de "teste do núcleo, nada de rota" que apareceu nos outros projetos — aqui nem existe o
  núcleo. O `SEC-01` (IDOR no upload) não tem como ser detectado.
- **Mudança:** (1) trocar por um runner real (`node --test` + `supertest`, mesmo padrão dos projetos
  novos da conta — `agendaflow-saas`, `kanbanex`); (2) cobertura mínima, com **os P0/P1 primeiro**:
  | Caso | Assertivo |
  |---|---|
  | token de A + `email` de B no upload | **404/403**, foto de B **não** muda (`SEC-01`) |
  | upload sem token | `401` |
  | upload de `.exe` / > 5 MB | `4xx` (`SEC-04`) |
  | `GET /comentarios` com 100 comentários | **1** query (`SEC-02`) |
  | `avaliacao: 4` (número) | `201` (regressão: o gêmeo está quebrado aqui) |
  | `avaliacao: 0` / `6` / `"abc"` | `400` |
  | login com senha errada | `401`, mensagem uniforme |
  | login 6× em 5 min | `429` (`SEC-06`) |
- **Aceite:** `npm test` roda **e passa** (≥ 8 casos); falha se o IDOR voltar.
- **Verificação:**
  ```bash
  npm test 2>&1 | tail -3   # passa; com o IDOR reintroduzido -> FALHA
  ```

---

## 6. DevOps / Infra

### DEVOPS-01 · 145 dependências diretas (dev misturada) · [P2]

- **Arquivo:** `package.json:6-151`
- **Evidência:** `dependencies` tem **145** entradas — inclui `nodemon`, `swagger-autogen`,
  `swagger-jsdoc`, `reload`, `simple-update-notifier`, `chokidar`, `readdirp` (tudo de
  **desenvolvimento**), além de ~120 transitivas que o npm hoisted para cá.
- **Impacto:** (a) **superfície de CVE** desnecessária em produção (dev deps não deveriam estar lá);
  (b) imagem de produção maior; (c) `npm audit` reporta ruído que ninguém consegue corrigir.
- **Mudança:** (1) mover dev deps para `devDependencies` (`nodemon`, `swagger-autogen`,
  `swagger-jsdoc`); (2) rodar `npm dedupe`; (3) o restante (transitivas) sai com um `npm install`
  limpo; (4) `npm audit --omit=dev` no CI.
- **Aceite:** `dependencies` só com o que roda em produção; `npm audit --omit=dev` limpo.
- **Verificação:**
  ```bash
  node -e "const p=require('./package.json');console.log(p.dependencies.length,'deps /',Object.keys(p.devDependencies||{}).length,'dev')"
  ```

### DEVOPS-02 · Sem CI · [P2]

- **Arquivo:** *(ausente)* `.github/workflows/`
- **Evidência:** sem workflow; e `npm test` nem funciona (`TEST-01`).
- **Impacto:** nada trava o IDOR de volta.
- **Mudança:** `ci.yml`: `npm ci`, `npm test`, `npm audit --omit=dev`, e (opcional) `node --check`
  em cada arquivo.
- **Aceite:** PR com IDOR ou falha de teste é bloqueado.
- **Verificação:**
  ```bash
  npm ci && npm test
  ```

### DEVOPS-03 · Sem `.env.example` · [P2]

- **Arquivo:** *(ausente)* `.env.example` · variáveis em `authController.js:12`,
  `upload_fotos.js:2-4`, `config/db.js:4,9`
- **Evidência:** o projeto lê `MEUSEGREDO`, `CLOUDINARY_USER/KEY/SECRET`, `DB_USER/DB_PASSWORD/DB_NAME`,
  `MONGO_URI`, `PORT`, `IP_MACHINE` — e **não há** exemplo versionado. (Confirmei que **não há
  `.env` versionado** — o `.gitignore` cobre.)
- **Impacto:** quem implanta não sabe o que definir; e `config/db.js:10` **monta a URI com senha** a
  partir de `DB_*` (ver `SEC-09` na §9, fora do escopo daqui) — sem exemplo, é fácil errar o formato.
- **Mudança:** `.env.example` com todas as variáveis, comentadas, **sem** valor real; e nome
  `JWT_SECRET` (ver `SEC-03`).
- **Aceite:** exemplo versionado cobre todas as `process.env.*`.
- **Verificação:**
  ```bash
  grep -rhoE 'process\.env\.[A-Z_]+' controllers/ config/ app.js | sort -u
  ```

### DEVOPS-04 · Sem Dockerfile · [P3]

- **Arquivo:** *(ausente)* `Dockerfile`
- **Evidência:** sem container (o `package.json:4` diz "usa Node 18.16.0").
- **Impacto:** baixo; o projeto roda com `node app.js`.
- **Mudança:** `Dockerfile` (`node:20-alpine`, `npm ci --omit=dev`, `USER node`, `HEALTHCHECK` em
  `/comentarios` ou um `/health`).
- **Aceite:** `docker build` + `run` sobe a API.
- **Verificação:**
  ```bash
  docker build -t dbempresa . && docker run --rm -e MONGO_URI=... -p 3000:3000 dbempresa
  ```

---

## 7. Documentação

### DOC-01 · README não documenta variáveis · [P2]

- **Arquivo:** `README.md`
- **Evidência:** o README é curto (README de instalação do acervo) e não lista as variáveis.
- **Impacto:** com `SEC-03` e `SEC-05`, a API exige configuração — sem doc, ninguém descobre.
- **Mudança:** seção "Variáveis de ambiente" (linkando `DEVOPS-03`) e "Rodando" (`npm i && npm start`).
- **Aceite:** README lista as variáveis e o comando.
- **Verificação:** `grep -n 'MONGO_URI\|JWT_SECRET' README.md`.

### DOC-02 · Falta `SECURITY.md` · [P3]

- **Arquivo:** *(ausente)* `SECURITY.md`
- **Evidência:** tem README/LICENSE.
- **Impacto:** o `SEC-01` é exatamente o tipo de falha que precisa de regra escrita: *"o alvo de
  qualquer escrita autenticada vem do token, nunca do body"*.
- **Mudança:** criar com canal + a invariante "identidade do token é a única autoridade".
- **Aceite:** arquivo existe com a invariante.
- **Verificação:** `ls SECURITY.md`

---

## 8. Ordem de execução (waves)

### Wave 1 — Fechar o IDOR (P0)
1. **`SEC-01`** — upload usa `req.user.userId`, não `req.body.email`.
2. **`TEST-01`** — `npm test` real, começando pelo caso do IDOR (trava a correção).

> Depois da Wave 1, ninguém troca a foto de outra pessoa.

### Wave 2 — Superfície pública e upload (P1)
3. **`SEC-04`** — limite de tamanho + filtro por tipo + nome próprio.
4. **`SEC-02`** — `/comentarios` com `populate` (1 query), paginação e decisão sobre auth.
5. **`SEC-05`** — CORS com allowlist.
6. **`SEC-06`** — rate limit em login/register.
7. **`SEC-03`** — `JWT_SECRET` validado, lido uma vez.

### Wave 3 — Robustez (P1/P2)
8. **`BUG-03`** — falhar alto sem Mongo (ou `/health`).
9. **`BUG-01`** — corrigir `||` → `&&` na validação de avaliação.
10. **`BUG-02`** — limpeza do temporário em `finally`.
11. **`SEC-07`**, **`SEC-08`** — `helmet` + limite de body.

### Wave 4 — Operação (P2)
12. **`DEVOPS-01`** — deps de dev separadas; `npm audit --omit=dev`.
13. **`BUG-04`** — gerar swagger no start, não versionar.
14. **`IMP-01`**, **`IMP-02`** — validações de usuário e e-mail.
15. **`DEVOPS-02`**, **`DEVOPS-03`**, **`DEVOPS-04`**, **`DOC-01`**.

### Wave 5 — Registro (P3)
16. **`DOC-02`**.

**Dependências que não podem ser invertidas:**
`SEC-01` antes de `TEST-01` (o teste travar a correção) · `SEC-05` depois de `SEC-02` (CORS é
defesa do que a rota expõe) · `SEC-04` antes de `BUG-02` (limite evita o arquivo gigante que o
`finally` apagaria) · `SEC-03` antes de `DEVOPS-03` (o exemplo usa o nome novo) ·
`DEVOPS-01` antes de `DEVOPS-02` (o CI roda `npm ci` com deps enxutas).

---

## 9. Fora de escopo / riscos

| Item | Decisão | Motivo |
|---|---|---|
| Trocar MongoDB Atlas por local | **Não** | A URI já aceita `MONGO_URI` (`config/db.js:9`). |
| Reescrever em TypeScript | **Não** | O `package.json:154` tem `"build": "tsc"` **sem** TS no projeto — dívida real, mas refactor. |
| Adicionar refresh token | **Não** | 2 h é razoável (`authController.js:73`). |
| Deletar a conta (GDPR) | **Não, ainda** | Feature. |

**Riscos desta execução:**

- **`SEC-01` pode quebrar o front** se ele enviar `email` no upload e o servidor começar a ignorar.
  Migre junto: ou mantenha o campo e **compare** com o token, ou tire do front.
- **`SEC-04` (filtro por tipo)** pode rejeitar `.heic`/`.webp` se você não listar. Liste o que o app
  usa.
- **`BUG-01` corrigido muda comportamento**: `avaliacao` numérica passa a ser **aceita** (hoje é
  rejeitada) — se o front contornava isso, pode duplicar envio. Teste antes.
- **`SEC-02` com `populate` muda a forma da resposta** (aninha `usuario` em vez de achatar
  `nome`/`foto`). Ajuste o front ou mantenha o achatamento no map.
- **`BUG-03` (falhar alto)** muda o comportamento de start: sem Mongo, o processo sai em vez de
  "rodar quebrado". Correto, mas é mudança de operação — ajuste o compose/orquestrador.

---

## 10. Definição de pronto (DoD)

**Segurança**
- [ ] `SEC-01` — token de A + `email` de B → 403/404, foto de B não muda
- [ ] `SEC-02` — `/comentarios` com **1** query, paginado, sem PII além do necessário
- [ ] `SEC-03` — `JWT_SECRET` ≥ 32 bytes validado no boot, lido uma vez
- [ ] `SEC-04` — upload > 5 MB ou tipo inválido → `4xx`; nome gerado pelo servidor
- [ ] `SEC-05` — CORS com allowlist; origem de fora sem header
- [ ] `SEC-06` — 6º login em 5 min → `429`
- [ ] `SEC-07` — headers do `helmet` presentes
- [ ] `SEC-08` — body > 100 KB → `413`

**Funcional**
- [ ] `BUG-01` — mesma lógica do gêmeo; `avaliacao: 4` → `201`; `0`/`6`/`"abc"` → `400`
- [ ] `BUG-02` — upload falho não deixa arquivo em `uploads/`
- [ ] `BUG-03` — sem Mongo, o processo não "sobe saudável"
- [ ] `BUG-04` — `rm swagger_output.json && npm start` funciona
- [ ] `IMP-01` — comentário com usuário inexistente → `404`
- [ ] `IMP-02` — e-mail/senha inválidos → `422`

**Testes e infra**
- [ ] `TEST-01` — `npm test` **passa** (≥ 8 casos) e falha se o IDOR voltar
- [ ] `DEVOPS-01` — deps de dev separadas; `npm audit --omit=dev` limpo
- [ ] `DEVOPS-02` — CI verde
- [ ] `DEVOPS-03` — `.env.example` com todas as variáveis
- [ ] `DEVOPS-04` — Dockerfile (opcional)
- [ ] `DOC-01` — README com variáveis
- [ ] `DOC-02` — `SECURITY.md`

**Validação final:**
```bash
npm test 2>&1 | tail -3   # >= 8 casos, 0 falhas
node -e "console.log(require('./package.json').dependencies.length)"   # bem menos que 145
grep -rn 'req.body.email' controllers/   # não deve existir em rota autenticada
```

---

*Fim do plano. Gerado por leitura direta do código em 2026-10-02. Nenhum item já estava corrigido.*
