function parseOrigins() {
  const origins = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(',')
  ]
    .map(origin => origin && origin.trim())
    .filter(Boolean);

  return origins.length ? origins : '*';
}

function createCorsOptions() {
  const origins = parseOrigins();

  return {
    origin(origin, callback) {
      if (origins === '*' || !origin || origins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
    },
    credentials: true
  };
}

module.exports = {
  createCorsOptions
};
