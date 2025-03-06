import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUTCDateForDB } from '../../utils/date.js';

const BASE_URL = 'https://www.semanariouniversidad.com';
const SITE_URL = 'https://www.semanariouniversidad.com/opinion/';

export default async () => {
  const { data } = await axios.get(SITE_URL);
  const $ = cheerio.load(data);
  const date_last_seen = getUTCDateForDB();
  const articles = [];
  $('article').each((_, item) => {
    const title = $(item).find('h2').text().trim();
    const author = $(item).find('.entry-meta a').text().trim();
    const url = `${BASE_URL}${$(item).find('h2 a').attr('href')}`;
    articles.push({ title, author, url, date_last_seen });
  });
  return { articles, siteName: 'Semanario Universidad', siteUrl: SITE_URL };
};
