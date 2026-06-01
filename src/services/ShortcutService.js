const { Op } = require('sequelize');

const ApiError = require('../utils/ApiError');
const { Shortcut, User } = require('../models');

class ShortcutService {
  async list({ user, query = {} }) {
    const where = this.buildVisibilityWhere(user);

    if (query.search) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { shortcut: { [Op.like]: `%${query.search}%` } },
            { title: { [Op.like]: `%${query.search}%` } },
            { message: { [Op.like]: `%${query.search}%` } }
          ]
        }
      ];
    }

    if (query.active !== undefined) {
      where.active = query.active === 'true' || query.active === true;
    }

    return Shortcut.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user'
        }
      ],
      order: [
        ['shortcut', 'ASC'],
        ['title', 'ASC']
      ]
    });
  }

  async suggestions({ user, query = '' }) {
    const normalized = String(query || '').replace(/^\//, '');
    const where = {
      ...this.buildVisibilityWhere(user),
      active: true
    };

    if (normalized) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { shortcut: { [Op.like]: `%${normalized}%` } },
            { title: { [Op.like]: `%${normalized}%` } }
          ]
        }
      ];
    }

    return Shortcut.findAll({
      where,
      limit: 10,
      order: [
        ['shortcut', 'ASC'],
        ['title', 'ASC']
      ]
    });
  }

  async create(data, user) {
    this.validate(data);

    return Shortcut.create({
      user_id: data.global ? null : user.id,
      shortcut: this.normalizeShortcut(data.shortcut),
      title: data.title,
      message: data.message,
      active: data.active !== undefined ? data.active : true
    });
  }

  async update(id, data, user) {
    const shortcut = await this.findOrFail(id);

    this.ensureCanManage(shortcut, user);

    const payload = { ...data };

    if (payload.shortcut) {
      payload.shortcut = this.normalizeShortcut(payload.shortcut);
    }

    if (payload.global !== undefined) {
      payload.user_id = payload.global ? null : user.id;
      delete payload.global;
    }

    await shortcut.update(payload);

    return shortcut;
  }

  async delete(id, user) {
    const shortcut = await this.findOrFail(id);

    this.ensureCanManage(shortcut, user);

    await shortcut.destroy();

    return {
      success: true
    };
  }

  async findOrFail(id) {
    const shortcut = await Shortcut.findByPk(id);

    if (!shortcut) {
      throw new ApiError('Atalho nao encontrado', 404);
    }

    return shortcut;
  }

  validate(data) {
    if (!data.shortcut || !data.title || !data.message) {
      throw new ApiError('shortcut, title e message sao obrigatorios', 422);
    }
  }

  normalizeShortcut(shortcut) {
    const value = String(shortcut).trim().replace(/^\//, '');

    if (!value) {
      throw new ApiError('Atalho invalido', 422);
    }

    return value;
  }

  buildVisibilityWhere(user) {
    if (user.role === 'ADMIN') {
      return {};
    }

    return {
      [Op.or]: [{ user_id: user.id }, { user_id: null }]
    };
  }

  ensureCanManage(shortcut, user) {
    if (user.role === 'ADMIN') {
      return;
    }

    if (shortcut.user_id === user.id) {
      return;
    }

    throw new ApiError('Voce nao tem permissao para gerenciar este atalho', 403);
  }
}

module.exports = new ShortcutService();
