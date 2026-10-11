const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const { rateLimit } = require('express-rate-limit');
const config = require('./config/env');
const connectToDatabase = require('./config/db');
const swaggerDocument = require('./swagger_output.json');

const app = express();
app.set('trust proxy', config.trustProxy);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)),
  credentials: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.get('/health', async (req, res) => {
  try {
    await connectToDatabase();
    return res.status(200).json({ status: 'ok' });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (error) {
    console.error('MongoDB unavailable:', error?.name ?? 'UnknownError');
    return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
  }
});

require('./controllers/authController')(app);
require('./routes/authRoutes')(app);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: status === 413 ? 'A imagem excede 5 MB.' : 'Upload inválido.' });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'A requisição excede 100 KB.' });
  }

  console.error('Request failed:', error?.name ?? 'UnknownError');
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});

if (require.main === module) {
  connectToDatabase()
    .then(() => {
      app.listen(config.port, config.host, () => {
        console.info(`API disponível na porta ${config.port}.`);
      });
    })
    .catch((error) => {
      console.error('API startup failed; verify environment and MongoDB connectivity:', error?.name ?? 'UnknownError');
      process.exitCode = 1;
    });
}

module.exports = app;
