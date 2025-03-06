import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUTCDateForDB } from '../../utils/date.js';

const BASE_URL = 'https://www.nacion.com';
const SITE_URL = 'https://www.nacion.com/opinion/';

export default async () => {
  const { data } = await axios.get(SITE_URL);
  const $ = cheerio.load(data);
  const date_last_seen = getUTCDateForDB();
  const articles = [];
  $('article.lg-promo').each((_, item) => {
    const title = $(item).find('h3').text().trim();
    const url = `${BASE_URL}${$(item).find('h3 a').attr('href')}`;
    const author = $(item).find('span.ts-byline__names').text().trim();
    articles.push({ title, author, url, date_last_seen });
  });
  $('.list-item').each((_, item) => {
    const title = $(item).find('h3').text().trim();
    const url = `${BASE_URL}${$(item).find('h3').parent().attr('href')}`;
    const author = $(item).find('span.ts-byline__names').text().trim();
    articles.push({ title, author, url, date_last_seen });
  });
  return { articles, siteName: 'La Nación', siteUrl: SITE_URL };
};
