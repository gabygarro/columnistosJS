import 'dotenv/config';
import { login, sendWoot } from 'wafrn-sdk';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';
import { getYesterdaysDate } from '../utils/date.js';
import { getBot, sendMessage } from '../utils/telegram.js';
import { ALL_WOMAN, ALL_WOMAN_COAUTHOR, ALL_WOMAN_SINGULAR, DAILY_REPORT, DAILY_REPORT_SINGULAR, NO_WOMAN, NO_WOMAN_SINGULAR, ONE_MAN, ONE_WOMAN, ONE_WOMAN_COAUTHOR, ONE_WOMAN_COAUTHOR_SINGULAR, SOME_WOMAN, SOME_WOMAN_COAUTHOR } from '../utils/templateTexts.js';
import { sendDms } from './sendDms.js';

const getRandomInt = (max) =>
  Math.floor(Math.random() * max);
const checkPreviousRun = async (conn, date) =>
  conn.query(`
    SELECT 1 FROM columnistos.log WHERE last_woot_date = ? LIMIT 1
  `, [date]);
const setRunForToday = async (conn, date) =>
  conn.query(`
    INSERT INTO columnistos.log(last_woot_date) VALUES(?)
  `, [date]);
const getStats = async (conn) =>
  conn.query(`
    SELECT
      s.name AS site_name,
      SUM(au.gender = 'M') AS male_count,
      SUM(au.gender = 'F') AS female_count,
      SUM(au.gender = 'NB') AS non_binary_count,
      SUM(au.gender = 'CF') AS coauthor_female_count,
      COUNT(DISTINCT CASE WHEN au.gender = 'M' THEN au.id END) AS male_author_count,
      COUNT(DISTINCT CASE WHEN au.gender = 'F' THEN au.id END) AS female_author_count,
      COUNT(CASE
        WHEN au.gender IS NOT NULL AND au.gender != 'X'
        THEN ar.id
      END) AS total_articles
    FROM article ar
    JOIN site s ON ar.site_id = s.id
    JOIN author au ON ar.author_id = au.id
    WHERE ar.date_added >=
      (UTC_DATE() - INTERVAL 1 DAY + INTERVAL 6 HOUR)
      AND ar.date_added <
      (UTC_DATE() + INTERVAL 6 HOUR)
    GROUP BY s.id
    ORDER BY s.name;
  `);

const getArticlesBreakdown = async (conn) =>
  conn.query(`
    SELECT
      s.name AS site_name,
      ar.title AS article_title,
      au.name AS author_name
    FROM article ar
    JOIN site s ON ar.site_id = s.id
    JOIN author au ON ar.author_id = au.id
    WHERE ar.date_added >=
      (UTC_DATE() - INTERVAL 1 DAY + INTERVAL 6 HOUR)
      AND ar.date_added <
      (UTC_DATE() + INTERVAL 6 HOUR)
    ORDER BY s.name, ar.id;
  `);

const MIN_PERCENT_SOME = 30;

export const selectText = (femaleCount, totalArticles, maleCount) => {
  if (totalArticles === 0) return "";
  const randomIndex = getRandomInt(2);
  if (femaleCount === 0) {
    if (maleCount !== totalArticles) return NO_WOMAN[0];
    return totalArticles === 1 ? NO_WOMAN_SINGULAR : NO_WOMAN[randomIndex];
  } else if (femaleCount === totalArticles) {
    return totalArticles === 1 ? ALL_WOMAN_SINGULAR : ALL_WOMAN[randomIndex];
  } else if (femaleCount === 1) {
    return ONE_WOMAN[randomIndex];
  } else if (maleCount === 1 && femaleCount === totalArticles - 1 &&
    (1 / totalArticles * 100) < MIN_PERCENT_SOME
  ) {
    return ONE_MAN[randomIndex];
  }
  return SOME_WOMAN[randomIndex];
};

export const selectCoauthorsText = (coauthorFemaleCount, totalArticles) => {
  if (totalArticles === 0 || coauthorFemaleCount === 0) return "";
  if (totalArticles === 1) return ONE_WOMAN_COAUTHOR_SINGULAR;
  const randomIndex = getRandomInt(2);
  if (coauthorFemaleCount === totalArticles) {
    return ALL_WOMAN_COAUTHOR[randomIndex];
  } else if (coauthorFemaleCount === 1) {
    return ONE_WOMAN_COAUTHOR[randomIndex];
  }
  return SOME_WOMAN_COAUTHOR[randomIndex];
};

export const formatText = (template, date, siteStats) => template
  .replace('{fecha}', date)
  .replace('{medio}', siteStats.site_name)
  .replace('{total}', siteStats.total_articles)
  .replace('{mujeres}', siteStats.female_count)
  .replace('{coautoras}', siteStats.coauthor_female_count)
  .replace('{autoras}', Number(siteStats.female_author_count) === 1 ? 'una mujer' : 'mujeres')
  .replace('{autores}', Number(siteStats.male_author_count) === 1 ? 'un varón' : 'varones');

export async function handler() {
  let conn;
  try {
    conn = await dbConnect();
    const date = getYesterdaysDate();
    const [previousRun] = await checkPreviousRun(conn, date);
    if (previousRun) {
      console.log('Already posted for today');
      dbEnd(conn);
      return;
    }
    const [pendingAuthor] = await conn.query(`
      SELECT a.id
      FROM columnistos.author a
      WHERE a.gender IS NULL
        AND EXISTS (
          SELECT 1
          FROM columnistos.article ar
          WHERE ar.author_id = a.id
            AND ar.date_added >= (UTC_DATE() - INTERVAL 1 DAY + INTERVAL 6 HOUR)
            AND ar.date_added < (UTC_DATE() + INTERVAL 6 HOUR)
        )
      LIMIT 1`
    );
    if (pendingAuthor) {
      const bot = getBot();
      await sendDms(conn, bot, true);
      dbEnd(conn);
      return;
    }
    const stats = await getStats(conn);
    const dailyArticleCount = stats.reduce((total, siteStats) => total + Number(siteStats.total_articles), 0);
    const dailyTemplate = dailyArticleCount === 1
      ? DAILY_REPORT_SINGULAR
      : DAILY_REPORT[getRandomInt(DAILY_REPORT.length)];
    let dailySummary = dailyTemplate.replace('{fecha}', date);
    let textsToWoot = [];
    let coAuthorTextsToWoot = [];
    for (const siteStats of stats) {
      const totalArticles = Number(siteStats.total_articles);
      if (totalArticles === 0) continue;
      const siteName = siteStats.site_name;
      const femaleCount = Number(siteStats.female_count);
      const maleCount = Number(siteStats.male_count);
      const coAuthorFemaleCount = Number(siteStats.coauthor_female_count);
      const percentOfWomen = Math.round(femaleCount / totalArticles * 100);
      const percentOfWomenCoauthors =
        coAuthorFemaleCount !== 0
          ? Math.round(coAuthorFemaleCount / totalArticles * 100)
          : 0;

      dailySummary = `${dailySummary}\n\t${siteName}: ${percentOfWomen}% (${femaleCount} de ${totalArticles})`;
      if (coAuthorFemaleCount > 0) {
        const coauthorLabel = coAuthorFemaleCount === 1 ? 'Columna con' : 'Columnas con';
        dailySummary = `${dailySummary}\n\t\t${coauthorLabel} al menos una mujer como coautora: ${
          percentOfWomenCoauthors
        }% (${coAuthorFemaleCount} de ${totalArticles})`;
      }
      const templateText = selectText(femaleCount, totalArticles, maleCount);
      if (templateText !== "") {
        textsToWoot.push(formatText(templateText, date, siteStats));
      }
      const coAuthorTemplateText = selectCoauthorsText(coAuthorFemaleCount, totalArticles);
      if (coAuthorTemplateText !== "") {
        coAuthorTextsToWoot.push(formatText(coAuthorTemplateText, date, siteStats));
      }
    }
    const token = await login();
    await sendWoot(dailySummary, { token });
    await Promise.all(textsToWoot.map(text => sendWoot(text, { token })));
    await Promise.all(coAuthorTextsToWoot.map(text => sendWoot(text, { token })));

    try {
      const articles = await getArticlesBreakdown(conn);
      const articlesBySite = new Map();
      for (const { site_name, article_title, author_name } of articles) {
        if (!articlesBySite.has(site_name)) articlesBySite.set(site_name, []);
        articlesBySite.get(site_name).push({ article_title, author_name });
      }
      const breakdownLines = [];
      for (const [siteName, siteArticles] of articlesBySite) {
        breakdownLines.push(`- ${siteName}:`);
        for (const { article_title, author_name } of siteArticles) {
          breakdownLines.push(`  - ${author_name}: ${article_title}`);
        }
      }
      const postedTexts = [dailySummary, ...textsToWoot, ...coAuthorTextsToWoot].join('\n\n');
      const telegramMessage = breakdownLines.length > 0
        ? `${postedTexts}\n\n${breakdownLines.join('\n')}`
        : postedTexts;
      const bot = getBot();
      await sendMessage(bot, telegramMessage, { disable_web_page_preview: true });
    } catch (telegramError) {
      console.log('Failed to send Telegram summary');
      console.log(telegramError);
    }

    await setRunForToday(conn, date);
    dbEnd(conn);
  } catch (error) {
    console.log(error);
    dbEnd(conn);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running locally...");
  await handler();
  process.exit(0);
};
