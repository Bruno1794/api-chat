const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

async function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new ApiError('Token não informado', 401);
    }

    const token = authorization.replace('Bearer ', '').trim();

    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new ApiError('Usuário não encontrado', 401);
    }

    req.user = user;

    return next();
  } catch (error) {
    return next(new ApiError('Token inválido ou expirado', 401));
  }
}

module.exports = authMiddleware;