import TelegramBot from 'node-telegram-bot-api';

export const getBot = () => {
  const token = process.env.COLUMNISTOS_BOT_TOKEN;
  if (!token) throw new Error('Missing COLUMNISTOS_BOT_TOKEN');
  return new TelegramBot(token, { polling: false });
};

// Returns the configured chat id as a number. Telegram group/supergroup ids
// are negative, so we parse as a signed integer. Throws if unset or invalid.
export const getChatId = () => {
  const raw = process.env.TELEGRAM_CHAT_ID;
  if (!raw) throw new Error('Missing TELEGRAM_CHAT_ID');
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid TELEGRAM_CHAT_ID: ${raw}`);
  }
  return parsed;
};

export const sendMessage = async (bot, text, opts = {}) =>
  bot.sendMessage(getChatId(), text, opts);

// Fetches new updates via long-polling `getUpdates`, filtered to TELEGRAM_CHAT_ID.
export const fetchUpdates = async (bot, offset) => {
  const updates = await bot.getUpdates({
    offset,
    timeout: 0,
    allowed_updates: ['message'],
  });
  const chatId = getChatId();
  console.log(`[telegram] fetched ${updates.length} update(s) with offset=${offset}`);
  const messages = updates
    .filter((u) => u.message && u.message.chat && u.message.chat.id === chatId)
    .map((u) => ({ updateId: u.update_id, message: u.message }));
  return { updates, messages };
};
