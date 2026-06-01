const ApiError = require('../utils/ApiError');

function errorMiddleware(error, req, res, next) {
  console.error(error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: true,
      message: error.message,
      details: error.details
    });
  }

  return res.status(error.statusCode || 500).json({
    error: true,
    message: error.message || 'Erro interno do servidor'
  });
}

module.exports = errorMiddleware;