import 'dotenv/config';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';

export async function handler() {
  const pool = await dbConnect();
  await dbEnd(pool);
  return;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  handler();
};
