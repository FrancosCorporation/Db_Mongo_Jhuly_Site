const jwt = require('jsonwebtoken');
const { jwtAudience, jwtIssuer, jwtSecret } = require('../config/env');

module.exports = (req, res, next) => {
  const authorization = req.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const decodedToken = jwt.verify(match[1], jwtSecret, {
      algorithms: ['HS256'],
      issuer: jwtIssuer,
      audience: jwtAudience,
    });

    if (typeof decodedToken === 'string' ||
        typeof decodedToken.userId !== 'string' ||
        typeof decodedToken.sub !== 'string' ||
        decodedToken.sub !== decodedToken.userId ||
        !Number.isSafeInteger(decodedToken.exp)) {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }

    req.user = { userId: decodedToken.userId };
    return next();
  } catch {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }
};
