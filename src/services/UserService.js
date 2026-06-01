const ApiError = require('../utils/ApiError');
const { User } = require('../models');

class UserService {
  async list() {
    return User.findAll({
      order: [['nome', 'ASC']]
    });
  }

  async create(data) {
    this.validate(data);

    const exists = await User.findOne({
      where: {
        email: data.email
      }
    });

    if (exists) {
      throw new ApiError('E-mail ja cadastrado', 409);
    }

    return User.create(data);
  }

  async update(id, data) {
    const user = await this.findOrFail(id);

    if (data.email && data.email !== user.email) {
      const exists = await User.findOne({
        where: {
          email: data.email
        }
      });

      if (exists) {
        throw new ApiError('E-mail ja cadastrado', 409);
      }
    }

    await user.update(data);

    return user;
  }

  async delete(id) {
    const user = await this.findOrFail(id);

    await user.destroy();

    return {
      success: true
    };
  }

  async findOrFail(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new ApiError('Usuario nao encontrado', 404);
    }

    return user;
  }

  validate(data) {
    if (!data.nome || !data.email || !data.senha) {
      throw new ApiError('Nome, e-mail e senha sao obrigatorios', 422);
    }
  }
}

module.exports = new UserService();
