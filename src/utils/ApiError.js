class ApiError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;