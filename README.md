# Db Mongo Jhuly Site

API REST do site da Jhuly para cadastro e autenticação de usuários, comentários
e fotos de perfil. Usa Node.js 24, Express, MongoDB, JWT, bcryptjs e Cloudinary.
A documentação interativa fica em `/api-docs`.

## Requisitos

- Node.js 24 e npm 10 ou superior
- MongoDB local ou remoto
- Docker Compose, para executar o conjunto local

## Configuração local

```bash
cp .env.example .env
openssl rand -hex 32
```

Copie o valor gerado para `JWT_SECRET` no `.env` e configure `MONGO_URI`. Para
habilitar fotos, preencha `CLOUDINARY_USER` (nome da conta Cloudinary),
`CLOUDINARY_KEY` e `CLOUDINARY_SECRET`.

```bash
npm ci
npm start
```

A API inicia em `http://127.0.0.1:3000`; o Swagger fica em
`http://127.0.0.1:3000/api-docs`. O servidor local não inicia se o MongoDB não
estiver acessível.

## Executar com Docker Compose

```bash
cp .env.example .env
openssl rand -hex 32
# configure JWT_SECRET no .env

docker compose up --build -d
```

A API fica em `http://127.0.0.1:3101`. O Compose sobe um MongoDB local com
volume persistente, aguarda o health check do banco e publica a API somente na
interface de loopback do computador. Use um MongoDB gerenciado em produção.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `JWT_SECRET` | Sim | Segredo aleatório com pelo menos 32 bytes; gere um valor diferente por ambiente. |
| `MONGO_URI` | Sim | URI `mongodb://` ou `mongodb+srv://`. |
| `CLOUDINARY_USER` | Para fotos | Nome da conta Cloudinary. |
| `CLOUDINARY_KEY` | Para fotos | Chave da API Cloudinary. |
| `CLOUDINARY_SECRET` | Para fotos | Segredo da API Cloudinary. |
| `CORS_ORIGINS` | Não | Origens autorizadas, separadas por vírgula; vazio bloqueia origens externas do navegador. |
| `PORT` | Não | Porta HTTP; padrão `3000`. |
| `HOST` | Não | Interface de rede; padrão `127.0.0.1` (Compose usa `0.0.0.0` dentro do contêiner). |
| `TRUST_PROXY` | Não | Use `1` somente atrás de um proxy confiável. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Não | Emissor e público dos tokens; têm padrões próprios deste serviço. |

No deploy Vercel, configure essas variáveis no painel do projeto. Use uma URI
MongoDB acessível pelo deploy, um `JWT_SECRET` novo e as credenciais Cloudinary
se habilitar fotos. Configure `CORS_ORIGINS` com as origens reais do site. Não
armazene segredos em `vercel.json` nem no Git.

## Rotas

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/` | Público | Confirma que a API respondeu. |
| `GET` | `/health` | Público | Verifica a conexão MongoDB. |
| `POST` | `/register` | Público | Cria uma conta com nome, e-mail e senha. |
| `POST` | `/login` | Público | Retorna um JWT válido por duas horas. |
| `POST` | `/upload_foto_profile` | JWT | Atualiza a foto da conta autenticada; aceita JPEG, PNG ou WebP até 5 MB. |
| `GET` | `/comentarios` | Público | Lista comentários recentes paginados (`page`, `limit`, máximo 50). |
| `POST` | `/comentarios` | JWT | Cria um comentário com avaliação de 1 a 5. |

Rotas protegidas recebem `Authorization: Bearer <token>`. No upload, envie o
arquivo no campo `fotoPerfil`; a identidade vem do JWT e não de um e-mail enviado
pelo cliente. O feed público mantém o formato achatado com nome, comentário,
avaliação e foto, sem expor e-mail ou senha.

## Desenvolvimento e validações

- `npm run build` gera `swagger_output.json` localmente; o arquivo é ignorado pelo Git.
- `npm run dev` regenera a documentação e usa o modo watch do Node.
- `npm audit --audit-level=high` verifica vulnerabilidades das dependências.
- A CI instala pelo lockfile, gera a documentação, executa o audit e valida sintaxe JavaScript.

O projeto ainda não tem testes automatizados. A suíte de testes não foi executada
nesta atualização.

## Segurança

Veja [SECURITY.md](SECURITY.md) para comunicar vulnerabilidades. Nunca versione
`.env`; `.env.example` contém somente nomes e valores de exemplo sem credenciais.

## Licença

MIT — consulte [LICENSE](LICENSE).
