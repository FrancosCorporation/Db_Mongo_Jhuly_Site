const jwt = require('jsonwebtoken');
const meusegredo = process.env.MEUSEGREDO;

module.exports = (req, res, next) => {
  // Obtenha o token JWT do cabeçalho da requisição
  const token = req.header('Authorization');
  // Verifique se o token está presente no cabeçalho da requisição
  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token JWT não fornecido.' });
  }

  try {
    // Verifique e decodifique o token JWT
    const decodedToken = jwt.verify(token.replace('Bearer ', ''), meusegredo); // Substitua 'seu_segredo' pelo segredo usado para gerar os tokens

    // Adicione o usuário autenticado ao objeto de requisição para que ele possa ser utilizado nas rotas que utilizam esse middleware
    req.user = decodedToken;

    // Chame a próxima função (rota ou middleware)
    next();
  } catch (error) {
    // Caso o token seja inválido ou ocorra algum erro na verificação
    return res.status(401).json({ error: 'Acesso não autorizado. Token JWT inválido.' });
  }
};
