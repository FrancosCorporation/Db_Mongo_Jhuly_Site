## Node
Esse projeto usa o [Node](https://nodejs.org) versão 18.16.0.

## Para Gerar
npm init -y (NODE)

## Install Dependencies
npm i express (Express)
npm i mongoose (Mongoose) MongoDB
npm i mongodb (MongoDB)
npm i nodemon -d -g --save-dev (restart with nodemon)
scripts("start": "nodemon app.js")
npm i uuid (use uuid for the users)
npm i swagger-autogen express swagger-ui-express --save
scripts("generate-swagger": "node swagger.js")
npm run generate-swagger
npm i swagger-ui-express@4.1.4
npm i cloudinary (armazenar fotos)
npm i multer (serve para upar as fotos)
npm i jsonwebtoken --save (JWT)
npm install bcryptjs --save (criptografia)
npm install cors
npm cache clean --force (limpa cache)