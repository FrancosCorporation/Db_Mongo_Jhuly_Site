const fs = require('node:fs');
const path = require('node:path');

const document = {
  openapi: '3.0.3',
  info: {
    title: 'Db Mongo Jhuly Site API',
    version: '1.0.0',
    description: 'Cadastro, autenticação, fotos de perfil e comentários.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/': {
      get: { summary: 'Verifica a rota inicial', responses: { 200: { description: 'API disponível.' } } },
    },
    '/health': {
      get: { summary: 'Verifica a API e o MongoDB', responses: { 200: { description: 'Serviço saudável.' }, 503: { description: 'MongoDB indisponível.' } } },
    },
    '/register': {
      post: {
        summary: 'Cria uma conta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                  name: { type: 'string', maxLength: 100 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Conta criada.' }, 409: { description: 'E-mail já cadastrado.' }, 422: { description: 'Dados inválidos.' } },
      },
    },
    '/login': {
      post: {
        summary: 'Autentica uma conta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'JWT Bearer emitido.' }, 401: { description: 'Credenciais inválidas.' }, 429: { description: 'Limite de tentativas atingido.' } },
      },
    },
    '/upload_foto_profile': {
      post: {
        summary: 'Atualiza a foto da conta autenticada',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', required: ['fotoPerfil'], properties: { fotoPerfil: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: { 200: { description: 'Foto atualizada.' }, 401: { description: 'Token inválido.' }, 413: { description: 'Arquivo maior que 5 MB.' }, 415: { description: 'Formato de imagem não aceito.' } },
      },
    },
    '/comentarios': {
      get: {
        summary: 'Lista comentários públicos paginados',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 50 } },
        ],
        responses: { 200: { description: 'Comentários recentes sem e-mail ou senha.' }, 400: { description: 'Paginação inválida.' } },
      },
      post: {
        summary: 'Cria um comentário da conta autenticada',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conteudo', 'avaliacao'],
                properties: { conteudo: { type: 'string', maxLength: 2000 }, avaliacao: { type: 'number', minimum: 1, maximum: 5 } },
              },
            },
          },
        },
        responses: { 201: { description: 'Comentário criado.' }, 400: { description: 'Dados inválidos.' }, 401: { description: 'Token inválido.' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
};

fs.writeFileSync(path.join(__dirname, 'swagger_output.json'), `${JSON.stringify(document, null, 2)}\n`);
