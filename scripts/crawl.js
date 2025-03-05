import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';

const loadCrawlers = async () => {
  const crawlerDir = process.env.CRAWLER_DIR;
  if (!crawlerDir) {
    throw new Error("Missing crawler directory");
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const crawlersDir = path.resolve(__dirname, `../crawlers/${process.env.CRAWLER_DIR}`);
  const crawlerFiles = fs.readdirSync(crawlersDir).filter(file => file.endsWith('.js'));
  const crawlers = await Promise.all(
    crawlerFiles.map(async file => {
      const { default: crawler } = await import(path.join(crawlersDir, file));
      return crawler;
    })
  );
  return crawlers;
};

export async function handler() {
  let conn;
  try {
    conn = await dbConnect();
    const crawlers = await loadCrawlers();
    const results = await Promise.allSettled(crawlers.map(async crawler => {
      const { articles, siteName, siteUrl } = await crawler();
      const { insertId: siteId } = await conn.query(`
        INSERT INTO columnistos.site(name, url)
          VALUES(?, ?)
          ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id)`,
        [siteName, siteUrl]);
      for (const article of articles) {
        const { title, author, url, date_last_seen } = article;
        console.log(article);
        const { insertId: authorId } = await conn.query(`
          INSERT INTO columnistos.author(name)
            VALUES(?)
            ON DUPLICATE KEY UPDATE
              id = LAST_INSERT_ID(id)`,
          [author]);
        await conn.query(`
          INSERT INTO columnistos.article(title, url, date_last_seen, site_id, author_id)
            VALUES(?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              date_last_seen = VALUES(date_last_seen)`,
          [title, url, date_last_seen, siteId, authorId]);
      };
    }));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error processing crawler ${index}:`, result.reason);
      }
    });
    dbEnd(conn);
    return;
  } catch (error) {
    console.log(error);
    dbEnd(conn);
    return;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  await handler();
  process.exit(0);
};
