import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as templates from '../utils/templateTexts.js';
import { formatText, selectCoauthorsText, selectText } from './post.js';

test('selects matching article templates for every random variant', () => {
  const originalRandom = Math.random;
  try {
    for (const randomValue of [0, 0.99]) {
      Math.random = () => randomValue;
      const variant = Math.floor(randomValue * 2);
      assert.equal(selectText(0, 0, 0), '');
      assert.equal(selectText(0, 1, 1), templates.NO_WOMAN_SINGULAR);
      assert.equal(selectText(1, 1, 0), templates.ALL_WOMAN_SINGULAR);
      assert.equal(selectText(0, 1, 0), templates.NO_WOMAN[0]);
      assert.equal(selectText(0, 3, 3), templates.NO_WOMAN[variant]);
      assert.equal(selectText(0, 3, 2), templates.NO_WOMAN[0]);
      assert.equal(selectText(1, 2, 1), templates.ONE_WOMAN[variant]);
      assert.equal(selectText(1, 4, 3), templates.ONE_WOMAN[variant]);
      assert.equal(selectText(2, 3, 1), templates.ONE_MAN[variant]);
      assert.equal(selectText(2, 3, 0), templates.SOME_WOMAN[variant]);
      for (const [femaleCount, totalArticles] of [[2, 10], [9, 20], [3, 5]]) {
        assert.equal(selectText(femaleCount, totalArticles, 0), templates.SOME_WOMAN[variant]);
      }
      assert.equal(selectText(3, 3, 0), templates.ALL_WOMAN[variant]);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('selects singular, subset, and all-article coauthor templates', () => {
  const originalRandom = Math.random;
  try {
    for (const randomValue of [0, 0.99]) {
      Math.random = () => randomValue;
      const variant = Math.floor(randomValue * 2);
      assert.equal(selectCoauthorsText(0, 0), '');
      assert.equal(selectCoauthorsText(0, 3), '');
      assert.equal(selectCoauthorsText(1, 1), templates.ONE_WOMAN_COAUTHOR_SINGULAR);
      assert.equal(selectCoauthorsText(1, 3), templates.ONE_WOMAN_COAUTHOR[variant]);
      assert.equal(selectCoauthorsText(2, 3), templates.SOME_WOMAN_COAUTHOR[variant]);
      assert.equal(selectCoauthorsText(3, 3), templates.ALL_WOMAN_COAUTHOR[variant]);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('matches author plurality independently of the number of columns', () => {
  const siteStats = {
    site_name: 'Medio',
    total_articles: 3n,
    female_count: 2n,
    coauthor_female_count: 1n,
    female_author_count: 1n,
    male_author_count: 1n
  };
  for (const template of [...templates.ALL_WOMAN, ...templates.SOME_WOMAN]) {
    assert.match(formatText(template, '14/10/2026', siteStats), /escritas por una mujer\./);
    assert.match(formatText(template, '14/10/2026', {
      ...siteStats, female_author_count: 2n
    }), /escritas por mujeres\./);
  }
  assert.match(formatText(templates.NO_WOMAN[1], '14/10/2026', siteStats), /escritas por un varón\./);
  assert.match(formatText(templates.NO_WOMAN[1], '14/10/2026', {
    ...siteStats, male_author_count: 2n
  }), /escritas por varones\./);
  for (const templateGroup of Object.values(templates)) {
    for (const template of Array.isArray(templateGroup) ? templateGroup : [templateGroup]) {
      assert.doesNotMatch(formatText(template, '14/10/2026', siteStats), /\{[^}]+\}/);
    }
  }
});