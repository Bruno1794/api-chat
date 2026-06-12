const ApiError = require('../utils/ApiError');
const { Setting } = require('../models');

const SETTING_KEY = 'chat_popup_config';
const LIST_SETTING_KEY = 'chat_popup_configs';

function readBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function readNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

class ChatPopupService {
  defaultConfig() {
    const dismissDays = Math.max(
      0,
      readNumber(process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_DISMISS_DAYS, 1)
    );

    return {
      enabled: readBoolean(process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_ENABLED, false),
      id: process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_ID?.trim() || 'default',
      title: process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_TITLE?.trim() || '',
      message:
        process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_MESSAGE?.replace(/\\n/g, '\n').trim() ||
        '',
      imageUrl: process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_IMAGE_URL?.trim() || '',
      imageAlt:
        process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_IMAGE_ALT?.trim() ||
        'Imagem do aviso',
      ctaLabel: process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_CTA_LABEL?.trim() || '',
      ctaUrl: process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_CTA_URL?.trim() || '',
      dismissHours: Math.max(
        0,
        readNumber(
          process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_DISMISS_HOURS,
          dismissDays * 24
        )
      ),
      delayMs: Math.max(
        0,
        readNumber(process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_DELAY_MS, 500)
      ),
      allowMarkAsSeen: readBoolean(
        process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_ALLOW_MARK_AS_SEEN ??
          process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_ALLOW_DONT_SHOW_AGAIN,
        true
      ),
      closeOnBackdrop: readBoolean(
        process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_CLOSE_ON_BACKDROP,
        true
      ),
      requireConversation: readBoolean(
        process.env.NEXT_PUBLIC_CHAT_OPENING_POPUP_REQUIRE_CONVERSATION,
        false
      )
    };
  }

  sanitize(input = {}) {
    const fallback = this.defaultConfig();

    return {
      enabled: Boolean(input.enabled),
      id: String(input.id || fallback.id).trim() || 'default',
      title: String(input.title || '').trim(),
      message: String(input.message || '').trim(),
      imageUrl: String(input.imageUrl || '').trim(),
      imageAlt: String(input.imageAlt || fallback.imageAlt).trim() || fallback.imageAlt,
      ctaLabel: String(input.ctaLabel || '').trim(),
      ctaUrl: String(input.ctaUrl || '').trim(),
      dismissHours: Math.max(0, Number(input.dismissHours) || 0),
      delayMs: Math.max(0, Number(input.delayMs) || 0),
      allowMarkAsSeen: Boolean(input.allowMarkAsSeen),
      closeOnBackdrop: Boolean(input.closeOnBackdrop),
      requireConversation: Boolean(input.requireConversation)
    };
  }

  sortConfigs(configs) {
    return [...configs].sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
      }

      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    });
  }

  withTimestamps(config, existing = {}) {
    const now = new Date().toISOString();

    return {
      ...config,
      createdAt: existing.createdAt || now,
      updatedAt: now
    };
  }

  async readLegacyConfig() {
    const setting = await Setting.findOne({ where: { key: SETTING_KEY } });

    if (!setting) {
      return null;
    }

    return this.withTimestamps(this.sanitize(setting.value));
  }

  async readList() {
    const setting = await Setting.findOne({ where: { key: LIST_SETTING_KEY } });

    if (!setting || !Array.isArray(setting.value)) {
      const legacyConfig = await this.readLegacyConfig();

      return legacyConfig ? [legacyConfig] : [];
    }

    return this.sortConfigs(
      setting.value
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          ...this.sanitize(item),
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
        }))
    );
  }

  async saveList(configs) {
    await Setting.upsert({
      key: LIST_SETTING_KEY,
      value: this.sortConfigs(configs)
    });
  }

  ensureCanManage(user) {
    if (user.role === 'ADMIN') {
      return;
    }

    throw new ApiError('Voce nao tem permissao para configurar o popup', 403);
  }

  validateActiveConfig(config) {
    if (config.enabled && !config.title && !config.message && !config.imageUrl) {
      throw new ApiError('Configure titulo, mensagem ou imagem antes de ativar.', 422);
    }
  }

  async getConfig() {
    const configs = await this.readList();
    const activeConfig = configs.find(config => config.enabled);

    return activeConfig || this.defaultConfig();
  }

  async listConfigs(user) {
    this.ensureCanManage(user);

    return this.readList();
  }

  async createConfig(data, user) {
    this.ensureCanManage(user);

    const config = this.withTimestamps(
      this.sanitize({
        ...data,
        id: data.id || `popup-${Date.now()}`
      })
    );
    this.validateActiveConfig(config);

    const configs = await this.readList();
    const exists = configs.some(item => item.id === config.id);

    if (exists) {
      throw new ApiError('Ja existe um popup com esta versao.', 409);
    }

    const nextConfigs = config.enabled
      ? configs.map(item => ({ ...item, enabled: false }))
      : configs;

    await this.saveList([config, ...nextConfigs]);

    return config;
  }

  async updateById(id, data, user) {
    this.ensureCanManage(user);

    const configs = await this.readList();
    const currentConfig = configs.find(item => item.id === id);

    if (!currentConfig) {
      throw new ApiError('Popup nao encontrado.', 404);
    }

    const config = this.withTimestamps(
      this.sanitize({
        ...currentConfig,
        ...data,
        id: data.id || currentConfig.id
      }),
      currentConfig
    );
    this.validateActiveConfig(config);

    if (config.id !== id && configs.some(item => item.id === config.id)) {
      throw new ApiError('Ja existe um popup com esta versao.', 409);
    }

    const nextConfigs = configs.map(item => {
      if (item.id === id) {
        return config;
      }

      return config.enabled ? { ...item, enabled: false } : item;
    });

    await this.saveList(nextConfigs);

    return config;
  }

  async deleteById(id, user) {
    this.ensureCanManage(user);

    const configs = await this.readList();
    const nextConfigs = configs.filter(item => item.id !== id);

    if (nextConfigs.length === configs.length) {
      throw new ApiError('Popup nao encontrado.', 404);
    }

    await this.saveList(nextConfigs);

    return { success: true };
  }

  async updateConfig(data, user) {
    this.ensureCanManage(user);

    const config = this.sanitize(data);
    this.validateActiveConfig(config);

    const configs = await this.readList();
    const currentConfig = configs.find(item => item.id === config.id);

    if (currentConfig) {
      return this.updateById(config.id, config, user);
    }

    return this.createConfig(config, user);
  }
}

module.exports = new ChatPopupService();
