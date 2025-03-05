import 'dotenv/config';
import wafrn from '../wafrn/index.js';

export async function handler() {
  return wafrn();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  await handler();
  process.exit(0);
};
