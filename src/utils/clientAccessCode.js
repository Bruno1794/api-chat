const crypto = require('crypto');

function getSecret() {
  return process.env.CLIENT_CHAT_CODE_SECRET || process.env.JWT_SECRET;
}

function normalize(value) {
  return String(value || '').trim();
}

function generateClientAccessCode(cliente) {
  const id = normalize(cliente.id);
  const referencia = normalize(cliente.referencia || cliente.usuario_referencia);
  const telefone = normalize(cliente.telefone || cliente.phone);
  const payload = `${id}:${referencia}:${telefone}`;

  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 24);
}

function validateClientAccessCode(cliente, code) {
  const expected = generateClientAccessCode(cliente);
  const received = normalize(code);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );
}

module.exports = {
  generateClientAccessCode,
  validateClientAccessCode
};
