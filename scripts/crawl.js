import 'dotenv/config';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';
import nacionCrawler from '../crawlers/cr/nacion.js';

export async function handler() {
  let conn;
  try {
    conn = await dbConnect();
    const crawlerDir = process.env.CRAWLER_DIR;
    if (!crawlerDir) {
      throw new Error("Missing crawler directory");
    }
    const allCountryCrawlers = {
      cr: [nacionCrawler],
    }
    const crawlers = allCountryCrawlers[crawlerDir];
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
