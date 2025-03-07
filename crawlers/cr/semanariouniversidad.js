import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUTCDateForDB } from '../../utils/date.js';

const SITE_URL = 'https://semanariouniversidad.com/opinion/';

export default async () => {
  const { data } = await axios.get(SITE_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
  });
  const $ = cheerio.load(data);
  const date_last_seen = getUTCDateForDB();
  const articles = [];
  $('article').each((_, item) => {
    const title = $(item).find('h2').text().trim();
    const author = $(item).find('.entry-meta a').text().trim();
    const url = $(item).find('h2 a').attr('href');
    articles.push({ title, author, url, date_last_seen });
  });
  return { articles, siteName: 'Semanario Universidad', siteUrl: SITE_URL };
};
