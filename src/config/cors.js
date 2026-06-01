const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function parseOrigins() {
  return [
    ...defaultOrigins,
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(',')
  ]
    .map(origin => origin && origin.trim())
    .filter(Boolean);
}

function isAllowedVercelOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);

    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function createCorsOptions() {
  const origins = parseOrigins();

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin) || isAllowedVercelOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
  };
}

module.exports = {
  createCorsOptions
};
