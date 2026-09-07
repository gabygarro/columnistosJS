import axios from 'axios';
import 'dotenv/config';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';
import { fetchUpdates, getBot, sendMessage } from '../utils/telegram.js';

const markDmAsProcessed = async (conn, dmId) => conn.query(
  'INSERT INTO columnistos.dm(dm_id) VALUES(?)',
  [String(dmId)]
);

// Reuses the columnistos.dm.dm_id column (VARCHAR(40)) which previously stored
// wafrn DM ids. Telegram update_ids are numeric-only, so we cast to UNSIGNED to
// compute the next offset. Legacy wafrn ids won't collide with numeric ids.
const getNextUpdateOffset = async (conn) => {
  const [row] = await conn.query(
    `SELECT COALESCE(MAX(CAST(dm_id AS UNSIGNED)), 0) AS max_id FROM columnistos.dm`
  );
  return Number(row.max_id) + 1;
};

const processUpdate = async (conn, bot, updateId, message) => {
  try {
    const messageId = message.message_id;
    const text = (message.text || '').trim();
    const [existingDm] = await conn.query(
      'SELECT dm_id FROM columnistos.dm WHERE dm_id = ?',
      [String(updateId)]
    );
    if (existingDm) {
      console.log('Skipping already processed update', updateId);
      return;
    }
    const [authorId, gender] = text.split(/\s+/);
    const formattedGender = (gender || '').toUpperCase();
    if (
      !authorId ||
      !formattedGender ||
      Number.isNaN(Number(authorId)) ||
      !['M', 'F', 'NB', 'X', 'CF'].includes(formattedGender)
    ) {
      await markDmAsProcessed(conn, updateId);
      console.log(`Ignoring update ${updateId}: not a valid command ("${text}")`);
      return;
    }
    await conn.query('UPDATE columnistos.author SET gender = ? WHERE id = ?',
      [formattedGender, authorId]);
    await markDmAsProcessed(conn, updateId);
    await sendMessage(
      bot,
      `Confirmo ${authorId} ${formattedGender}`,
      { reply_to_message_id: messageId }
    );
    console.log(`Processed update ${updateId}: ${authorId} ${formattedGender}`);
  } catch (error) {
    console.log('Error processing update');
    console.log(error);
  }
};

export const sendDms = async (conn, bot, ignoreDmSent = false) => {
  const aiWorkerUrl = process.env.AI_WORKER_URL;
  const authors = await conn.query(`
    SELECT id, name FROM columnistos.author
      WHERE gender IS NULL ${ignoreDmSent === false ? 'AND dm_sent = 0' : ''}
      LIMIT 5`
  );
  if (authors.length === 0) {
    console.log('No more authors to process');
    return;
  }
  for (const author of authors) {
    const { id, name } = author;
    let llmResponse;
    let chooseLlmResponse;
    let llmError;
    try {
      const response = await axios.post(aiWorkerUrl, {
        name
      });
      llmResponse = response.data;
      const { gender } = llmResponse;
      chooseLlmResponse = (gender === 'M' || gender === 'F');
      if (chooseLlmResponse) {
        await conn.query('UPDATE columnistos.author SET gender = ? WHERE id = ?',
          [gender, id]
        );
      }
    } catch (error) {
      llmError = error;
    }
    const [{ url, title }] = await conn.query(`
      SELECT url, title FROM article WHERE author_id = ? ORDER BY id DESC LIMIT 1
    `, [id]);
    const genderResponse = llmResponse?.gender || '?';
    await sendMessage(bot, `Nuevo autor: ${id} ${name}
Predicción: ${genderResponse}
La predicción fue guardada: ${chooseLlmResponse === true ? 'Sí' : 'No'}${llmError ? `
Error: ${llmError}` : ''}
Buscar: https://duckduckgo.com/?q=${encodeURI(name)}&iax=images&ia=images
Artículo: ${url}
Título: ${title}
Responde si es hombre: ${id} M
Si es mujer: ${id} F
Si es no binarie: ${id} NB
Si es un grupo de co autores con al menos una mujer: ${id} CF
Si es editorial o una organización: ${id} X`);
    console.log(`Requested gender for author ${id} ${name}`);
    if (chooseLlmResponse) console.log(`  Saved author gender ${genderResponse}`);
    else console.log(`  Did not save author gender ${genderResponse}`);
    await conn.query('UPDATE columnistos.author SET dm_sent = 1 WHERE id = ?', [id]);
  }
};

export const sendPrivateWootToAdmins = async (bot, text) => {
  await sendMessage(bot, text);
};

export async function handler() {
  let conn;
  try {
    conn = await dbConnect();
    const bot = getBot();
    // Read replies
    const offset = await getNextUpdateOffset(conn);
    const { messages } = await fetchUpdates(bot, offset);
    for (const { updateId, message } of messages) {
      await processUpdate(conn, bot, updateId, message);
    }
    // Send new-author prompts
    await sendDms(conn, bot);
    dbEnd(conn);
  } catch (error) {
    console.log(error);
    dbEnd(conn);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running locally...');
  await handler();
  process.exit(0);
}
