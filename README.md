# Db Mongo Jhuly Site

API REST em **Node.js/Express** + **MongoDB** para o site da Jhuly:
autenticação JWT, comentários e upload de fotos, com documentação **Swagger**
e deploy preparado para a **Vercel**.

![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=flat-square&logo=jsonwebtokens)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-2023-legacy-lightgrey?style=flat-square)

## Sobre

Versão do back-end Mongo/Express dedicada ao site da **Jhuly**, mantendo a
mesma arquitetura da base "Db_Mongo_Empresa_Completo": registro/login de
usuários, comentários persistidos e upload de imagens via Cloudinary. Faz
parte do conjunto de projetos de 2023 que compartilham esse mesmo esqueleto.

## Funcionalidades

Comprovadas pelo código:

- **Autenticação JWT**: registro/login com bcryptjs
  (`controllers/authController.js`) e middleware de proteção de rotas
  (`controllers/authMiddleware.js`).
- **Comentários**: model `comentario` exposto pelas rotas.
- **Upload de fotos**: `multer` + **Cloudinary**
  (`controllers/upload_fotos.js`).
- **Swagger**: especificação gerada por `swagger-autogen` e servida em
  `/api-docs`.
- **Deploy**: `vercel.json` (serverless).

## Como rodar

```bash
npm install
# configure o .env:
# PORT=3001
# MONGO_URI=mongodb://...
# JWT_SECRET=...
# CLOUDINARY_URL=cloudinary://...
npm run generate-swagger
npm start
```

## Estrutura do projeto

```
index.js                # bootstrap do Express + Swagger
config/db.js            # conexão Mongo
controllers/            # auth, middleware e upload de fotos
models/                 # schemas mongoose (user, comentario)
routes/                 # rotas de autenticação
swagger.js / swagger_output.json
vercel.json
```

## Licença

MIT — veja [LICENSE](LICENSE).
