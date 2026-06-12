const ApiError = require('../utils/ApiError');
const { Setting } = require('../models');

const SETTING_KEY = 'chat_popup_config';

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

  async getConfig() {
    const setting = await Setting.findOne({ where: { key: SETTING_KEY } });

    if (!setting) {
      return this.defaultConfig();
    }

    return this.sanitize(setting.value);
  }

  async updateConfig(data, user) {
    if (user.role !== 'ADMIN') {
      throw new ApiError('Voce nao tem permissao para configurar o popup', 403);
    }

    const config = this.sanitize(data);

    if (config.enabled && !config.title && !config.message && !config.imageUrl) {
      throw new ApiError('Configure titulo, mensagem ou imagem antes de ativar.', 422);
    }

    await Setting.upsert({
      key: SETTING_KEY,
      value: config
    });

    return config;
  }
}

module.exports = new ChatPopupService();
