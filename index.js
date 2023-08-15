const http = require('http');

// Criar um servidor HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Olá, mundo!</h1>');
});

// Definir a porta em que o servidor vai ouvir
const port = process.env.PORT || 3000;

// Iniciar o servidor na porta especificada
server.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
