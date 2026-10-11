# Melhorias implementadas — Db Mongo Jhuly Site

Atualização de outubro de 2026 baseada na auditoria deste projeto.

## Implementado

- Corrigido o IDOR no upload: a foto é salva para a identidade assinada no JWT.
- JWT exige segredo forte, algoritmo HS256, emissor, público, expiração inteira, `sub` igual ao `userId` e cabeçalho Bearer válido.
- Cadastro e login validam e-mail, nome e senha; senhas ficam entre 8 caracteres e 72 bytes UTF-8 para evitar truncamento bcrypt.
- A API e `/health` têm limite geral; login/cadastro e upload têm cotas próprias. Upload em memória é limitado a 5 MB, um único arquivo e 10 tentativas/hora/IP, com validação de assinatura JPEG/PNG/WebP.
- Cloudinary é configurado sob demanda; ausência de credenciais não impede as demais rotas.
- Feed público de comentários tem paginação, limite de 50 e população do usuário sem consulta por comentário; preserva os campos atuais da resposta.
- Avaliações e conteúdo são validados, e novos comentários exigem um usuário existente.
- CORS usa allowlist, Helmet adiciona cabeçalhos e os corpos HTTP têm limite de 100 KB.
- A conexão Mongo falha explicitamente no início local e é verificada em `/health`.
- Configuração centralizada; removidos segredos da árvore atual, adicionados `.env.example` e regras para ignorar arquivos sensíveis.
- Dependências reduzidas ao runtime necessário, fixadas e acompanhadas por lockfile.
- Docker com Node 24 e usuário sem privilégios; Compose usa volume persistente, health check e porta local restrita `3101`.
- OpenAPI gerado localmente, README, SECURITY.md e CI adicionados.

## Verificações desta atualização

- `npm run build`: aprovado.
- `npm audit --audit-level=high`: sem vulnerabilidades de alta severidade.
- Verificação sintática dos arquivos JavaScript: aprovada.
- `docker compose config --quiet`: aprovado.
- `docker build`: aprovado.
- Após o hardening de senha, JWT e multipart, `node --check` e `git diff --check` passaram; não executei testes.
- A suíte de testes não foi executada; não há casos automatizados no projeto.

## Pendências externas

As credenciais que existiam em versões antigas precisam ser rotacionadas nos
serviços MongoDB/Cloudinary. Elas permanecem no histórico Git; a limpeza desse
histórico deve ser coordenada com os consumidores depois da rotação. Configure
as novas variáveis de ambiente também no projeto de deploy antes de publicar a
versão atualizada.
