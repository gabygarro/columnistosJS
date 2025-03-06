import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUTCDateForDB } from '../../utils/date.js';

const BASE_URL = 'https://www.delfino.cr';
const SITE_URL = 'https://www.delfino.cr/opinion/';

export default async () => {
  const { data } = await axios.get(SITE_URL);
  const $ = cheerio.load(data);
  const date_last_seen = getUTCDateForDB();
  const articles = [];
  $('div.info').each((_, item) => {
    const title = $(item).find('h2.title').text();
    const author = $(item).find('div.author').text().slice(0, -5);
    const links = $(item).find('a');
    const url = `${BASE_URL}${
      links.length === 1 ?
        links.attr('href') :
        $(links[1]).attr('href')
    }`;
    articles.push({ title, author, url, date_last_seen });
  });
  return { articles, siteName: 'Delfino', siteUrl: SITE_URL };
};
