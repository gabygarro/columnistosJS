import 'dotenv/config';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';
import { login, sendWoot } from '../wafrn/index.js';

export async function handler() {
  let conn;
  try {
    conn = await dbConnect();
    const token = await login();
    await sendWoot("woot woot", { token });
  } catch (error) {
    console.log(error);
  } finally {
    dbEnd(conn);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  await handler();
  process.exit(0);
};
