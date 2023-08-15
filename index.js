require('dotenv').config();
const now = new Date();
require('./controllers/upload_fotos')
// Convert Date.now() to the time in São Paulo's timezone
const saoPauloTime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json');// Importe a especificação Swagger gerada pelo swagger-autogen
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors');
const port = process.env.PORT;
const IP = process.env.IP_MACHINE;

app.use(bodyParser.json())

// Middleware para tratar erros de parsing JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    res.status(400).json({ error: 'JSON inválido. Verifique a sintaxe. Existem campos indevidos' });
  } else {
    next();
  }
});
// Habilitar o CORS para todas as rotas
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
require('./controllers/authController')(app)
require('./routes/authRoutes')(app)
require('./config/db')(app)


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.listen(port, () => {
  console.log(`Servidor rodando desde a: ${saoPauloTime} no endereço:  http://localhost${":"+port}`);
});