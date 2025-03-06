import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUTCDateForDB } from '../../utils/date.js';
import { removeAdditionalSpaces } from '../../utils/string.js';

const BASE_URL = 'https://www.elfinancierocr.com';
const SITE_URL = 'https://www.elfinancierocr.com/opinion/';

export default async () => {
  const { data } = await axios.get(SITE_URL);
  const $ = cheerio.load(data);
  const date_last_seen = getUTCDateForDB();
  const articles = [];
  $('article.lg-promo').each((_, item) => {
    const title = $(item).find('h3').text();
    const url = `${BASE_URL}${$(item).find('h3 a').attr('href')}`;
    const author = removeAdditionalSpaces($(item).find('span.ts-byline__names').text());
    articles.push({ title, author, url, date_last_seen });
  });
  $('.list-item').each((_, item) => {
    const title = $(item).find('h3').text();
    const url = `${BASE_URL}${$(item).find('h3').parent().attr('href')}`;
    const author = removeAdditionalSpaces($(item).find('span.ts-byline__names').text());
    articles.push({ title, author, url, date_last_seen });
  });
  return { articles, siteName: 'El Financiero', siteUrl: SITE_URL };
};
