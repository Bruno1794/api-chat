const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/jwt');

const { User } = require('../models');

class AuthService {
  async login({ email, senha }) {
    if (!email || !senha) {
      throw new ApiError('E-mail e senha são obrigatórios', 422);
    }

    const user = await User.findOne({
      where: {
        email
      }
    });

    if (!user) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    const passwordValid = await user.checkPassword(senha);

    if (!passwordValid) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    await user.update({
      online: true,
      ultimo_acesso: new Date()
    });

    const payload = {
      id: user.id,
      role: user.role
    };

    return {
      user,
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    };
  }

  async logout(userId) {
    const user = await User.findByPk(userId);

    if (user) {
      await user.update({
        online: false,
        ultimo_acesso: new Date()
      });
    }

    return {
      success: true
    };
  }

  async me(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    return user;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new ApiError('Refresh token não informado', 401);
    }

    let decoded;

    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new ApiError('Refresh token inválido ou expirado', 401);
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new ApiError('Usuário não encontrado', 401);
    }

    const payload = {
      id: user.id,
      role: user.role
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    };
  }
}

module.exports = new AuthService();