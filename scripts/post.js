import 'dotenv/config';
import { connect as dbConnect, end as dbEnd } from '../db/index.js';
import { login, sendWoot } from '../wafrn/index.js';
import { NO_WOMAN, ONE_WOMAN, ONE_MAN, SOME_WOMAN, ALL_WOMAN, ONE_WOMAN_COAUTHOR, DAILY_REPORT } from '../utils/templateTexts.js';
import { getYesterdaysDate } from '../utils/date.js';
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
      COUNT(DISTINCT CASE
        WHEN au.gender IS NOT NULL AND au.gender != 'X'
        THEN au.id
      END) AS total_authors
    FROM article ar
    JOIN site s ON ar.site_id = s.id
    JOIN author au ON ar.author_id = au.id
    WHERE ar.date_added >=
      (UTC_DATE() - INTERVAL 2 DAY + INTERVAL 6 HOUR)
      AND ar.date_added <
      (UTC_DATE() - INTERVAL 1 DAY + INTERVAL 6 HOUR)
    GROUP BY s.id
    ORDER BY s.name;
  `);

const MIN_NEW_ARTICLES = 2;
const MIN_PERCENT_SOME = 25;

const selectText = (female_count, total_authors, percentOfWomen) => {
  const randomIndex = getRandomInt(2);
  if (percentOfWomen === 0) {
    return NO_WOMAN[randomIndex];
  } else if (female_count === 1) {
    return ONE_WOMAN[randomIndex];
  } else if (female_count === total_authors - 1) {
    return ONE_MAN[randomIndex];
  } else if (percentOfWomen < MIN_PERCENT_SOME) {
    return SOME_WOMAN[randomIndex];
  } else if (female_count === total_authors) {
    return ALL_WOMAN[randomIndex];
  }
  return "";
};

const selectCoauthorsText = (coauthor_female_count) => {
  const randomIndex = getRandomInt(2);
  if (coauthor_female_count === 1) {
    return ONE_WOMAN_COAUTHOR[randomIndex];
  }
  return "";
};


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
      SELECT id, name FROM columnistos.author
        WHERE gender IS NULL
        LIMIT 1`
    );
    if (pendingAuthor) {
      const token = await login();
      await sendDms(conn, token, true);
      dbEnd(conn);
      return;
    }
    const stats = await getStats(conn);
    let dailySummary = DAILY_REPORT[getRandomInt(4)].replace('{fecha}', date);
    let textsToWoot = [];
    let coAuthorTextsToWoot = [];
    for (const siteStats of stats) {
      const totalAuthors = Number(siteStats.total_authors);
      const siteName = siteStats.site_name;
      const femaleCount = Number(siteStats.female_count);
      const coAuthorFemaleCount = Number(siteStats.coauthor_female_count);
      const percentOfWomen = femaleCount === 0 ? Math.round(femaleCount / totalAuthors * 100) : 0;
      const percentOfWomenCoauthors =
        coAuthorFemaleCount === 0
          ? Math.round(coAuthorFemaleCount / totalAuthors * 100)
          : 0;

      dailySummary = `${dailySummary}\n\t${siteName}: ${percentOfWomen}% (${femaleCount} de ${totalAuthors})`;
      if (coAuthorFemaleCount > 0) {
        dailySummary = `${dailySummary}\n\t\tArtículos con al menos una mujer co autora: ${
          percentOfWomenCoauthors
        }% (${coAuthorFemaleCount} de ${totalAuthors})`;
      }
      if (totalAuthors.length < MIN_NEW_ARTICLES) {
        console.log(`Not enough new articles for ${siteName}`);
      } else {
        const templateText = selectText(femaleCount, totalAuthors, percentOfWomen);
        if (templateText !== "") {
          textsToWoot.push(templateText
            .replace('{fecha}', date)
            .replace('{medio}', siteName)
            .replace('{total}', totalAuthors)
            .replace('{mujeres}', femaleCount));
        }
        const coAuthorTemplateText = selectCoauthorsText(coAuthorFemaleCount);
        if (coAuthorTemplateText !== "") {
          coAuthorTextsToWoot.push(coAuthorTemplateText
            .replace('{fecha}', date)
            .replace('{medio}', siteName)
            .replace('{total}', totalAuthors)
            .replace('{coautoras}', coAuthorFemaleCount));
        }
      }
    }
    const token = await login();
    await sendWoot(dailySummary, { token });
    await Promise.all(textsToWoot.map(text => sendWoot(text, { token })));
    await Promise.all(coAuthorTextsToWoot.map(text => sendWoot(text, { token })));
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
