import 'dotenv/config';
import { getDms, login, sendPrivateWoot, sendPrivateReplyWoot } from 'wafrn-sdk';
import axios from 'axios';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';

let adminHandlesString;

const getAdminHandles = () => {
  const adminHandles = process.env.ADMIN_HANDLES;
  if (!adminHandles) {
    throw new Error("Missing admin handles");
  }
  const adminHandleList = adminHandles.split(',');
  return adminHandleList.map(handle => `@${handle}`).join(' ');
};

const markDmAsProcessed = async (conn, dmId) => conn.query(
  'INSERT INTO columnistos.dm(dm_id) VALUES(?)',
  [dmId]
);

const processDm = async (conn, token, dm) => {
  try {
    const { id: dmId, markdownContent } = dm;
    const [existingDm] = await conn.query(
      'SELECT dm_id FROM columnistos.dm WHERE dm_id = ?',
      [dmId]
    );
    if (existingDm) {
      console.log('Skipping already processed dm', dmId);
      return;
    }
    const [authorId, gender] = markdownContent.replace(/@\S+/g, '').trim().split(' ');
    const formattedGender = gender.toUpperCase();
    if (
      !authorId ||
      !formattedGender ||
      Number.isNaN(Number(authorId)) ||
      !['M', 'F', 'NB', 'X', 'CF'].includes(formattedGender)
    ) {
      await markDmAsProcessed(conn, dmId);
      throw new Error('Invalid dm content');
    }
    await conn.query('UPDATE columnistos.author SET gender = ? WHERE id = ?',
      [formattedGender, authorId]);
    await markDmAsProcessed(conn, dmId);
    await sendPrivateReplyWoot(`
      ${adminHandlesString}
      Confirmo ${authorId} ${formattedGender}
      `, { token, parent: dmId });
    console.log(`Processed dm ${dmId}: ${authorId} ${formattedGender}`);
    return;
  } catch (error) {
    console.log(`Error processing dm`);
    console.log(error);
    return;
  }
};

export const sendDms = async (conn, token, ignoreDmSent = false) => {
  const aiWorkerUrl = process.env.AI_WORKER_URL;
  adminHandlesString = getAdminHandles();
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
      const { gender, confidence } = llmResponse;
      chooseLlmResponse = (gender === 'M' || gender === 'F') && confidence >= 0.95;
      if (chooseLlmResponse) {
        await conn.query('UPDATE columnistos.author SET gender = ? WHERE id = ?',
          [gender, id]
        );
      }
    } catch (error) {
      llmError = error;
    }
    const genderResponse = llmResponse?.gender || '?';
    const percentageResponse = (llmResponse?.confidence || 0) * 100
    await sendPrivateWoot(`
      ${adminHandlesString}
      Nuevo autor: ${id} ${name}
      Predicción: ${genderResponse} Confianza: ${percentageResponse}%
      La predicción fue guardada: ${chooseLlmResponse === true ? 'Sí' : 'No' }${llmError ? `
      Error: ${llmError}` : ''}
      Buscar: https://duckduckgo.com/?q=${encodeURI(name)}&iax=images&ia=images
      Responde si es hombre: ${id} M
      Si es mujer: ${id} F
      Si es no binarie: ${id} NB
      Si es un grupo de co autores con al menos una mujer: ${id} CF
      Si es editorial o una organización: ${id} X`, { token });
    console.log(`Requested gender for author ${id} ${name}`);
    if (chooseLlmResponse) console.log(`  Saved author gender ${genderResponse} with ${percentageResponse}% confidence`);
    else console.log(`  Did not save author gender ${genderResponse} with ${percentageResponse}% confidence`);
    await conn.query('UPDATE columnistos.author SET dm_sent = 1 WHERE id = ?', [id]);
  }
};

export const sendPrivateWootToAdmins = async (token, text) => {
  adminHandlesString = getAdminHandles();
  await sendPrivateWoot(`
    ${adminHandlesString}
    ${text}
  `, { token });
};

export async function handler() {
  let conn;
  let token;
  try {
    const adminHandles = process.env.ADMIN_HANDLES;
    if (!adminHandles) {
      throw new Error("Missing admin handles");
    }
    conn = await dbConnect();
    token = await login();
    const { data: { users, posts } } = await getDms({ token });
    const adminHandleList = adminHandles.split(',')
    const allowedAdminIds = adminHandleList.map(handle => {
      const admin = users.find(user => user.url === handle);
      return admin.id;
    });
    adminHandlesString = adminHandleList.map(handle => `@${handle}`).join(' ')
    // Read dms sent to me
    const allowedDms = posts.filter(post => allowedAdminIds.includes(post.userId));
    for (const dm of allowedDms) {
      await processDm(conn, token, dm);
    }
    // Send dms
    await sendDms(conn, token);
    dbEnd(conn);
  } catch (error) {
    console.log(error);
    dbEnd(conn);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  await handler();
  process.exit(0);
};
