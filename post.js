import 'dotenv/config';
import wafrn from './wafrn/index.js';

export async function handler(event) {
  return wafrn();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  handler();
}
