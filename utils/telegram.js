import TelegramBot from 'node-telegram-bot-api';

export const getBot = () => {
  const token = process.env.COLUMNISTOS_BOT_TOKEN;
  if (!token) throw new Error('Missing COLUMNISTOS_BOT_TOKEN');
  return new TelegramBot(token, { polling: false });
};

// Returns the configured chat id as a number, or null if unset (discovery mode).
// Telegram group/supergroup ids are negative, so we parse as a signed integer.
export const getChatId = () => {
  const raw = process.env.TELEGRAM_CHAT_ID;
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid TELEGRAM_CHAT_ID: ${raw}`);
  }
  return parsed;
};

export const sendMessage = async (bot, text, opts = {}) => {
  const chatId = getChatId();
  if (chatId === null) {
    console.log('[telegram] TELEGRAM_CHAT_ID not set, skipping sendMessage:');
    console.log(text);
    return null;
  }
  return bot.sendMessage(chatId, text, opts);
};

// Fetches new updates via long-polling `getUpdates`. Logs every raw update so
// the operator can discover the group chat id on first run. When
// TELEGRAM_CHAT_ID is set, only messages from that chat are returned.
export const fetchUpdates = async (bot, offset) => {
  const updates = await bot.getUpdates({
    offset,
    timeout: 0,
    allowed_updates: ['message'],
  });
  const chatId = getChatId();
  console.log(`[telegram] fetched ${updates.length} update(s) with offset=${offset}`);
  for (const update of updates) {
    console.log('[telegram] update:', JSON.stringify(update, null, 2));
    const chat = update.message?.chat;
    if (chat) {
      console.log(
        `[telegram] -> chat.id=${chat.id} type=${chat.type} title=${chat.title ?? ''}`
      );
    }
  }
  if (chatId === null) {
    console.log(
      '[telegram] TELEGRAM_CHAT_ID not set; skipping message processing. ' +
        'Copy the chat.id above into TELEGRAM_CHAT_ID and rerun.'
    );
    return { updates, messages: [] };
  }
  const messages = updates
    .filter((u) => u.message && u.message.chat && u.message.chat.id === chatId)
    .map((u) => ({ updateId: u.update_id, message: u.message }));
  return { updates, messages };
};
