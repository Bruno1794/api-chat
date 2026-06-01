const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

async function optionalAuthMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return next();
    }

    const token = authorization.replace('Bearer ', '').trim();
    const decoded = verifyAccessToken(token);
    const user = await User.findByPk(decoded.id);

    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
    return next();
  }
}

module.exports = optionalAuthMiddleware;
