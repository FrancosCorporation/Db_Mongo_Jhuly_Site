const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger_output.json'; // Especifique o arquivo de saída para a especificação Swagger

const endpointsFiles = ['./routes/*.js', './controllers/*.js']; // Especifique os arquivos que contêm as suas rotas

// Gere a especificação Swagger automaticamente
swaggerAutogen(outputFile, endpointsFiles);
