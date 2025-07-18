USE columnistos;

CREATE TABLE author
(
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  -- M: Male
  -- F: Female
  -- NB: Non-binary
  -- X: Ignore author
  -- CF: Co authors with at least one female
  gender ENUM('M', 'F', 'NB', 'X', 'CF'),
  dm_sent BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY unique_author(name)
);

CREATE TABLE site
(
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  url VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_site(name, url)
);

CREATE TABLE article
(
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author_id INT NOT NULL,
  site_id INT NOT NULL,
  url VARCHAR(255) NOT NULL,
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (author_id) REFERENCES author(id),
  FOREIGN KEY (site_id) REFERENCES site(id),
  UNIQUE KEY unique_article_per_author_site (title, author_id, site_id)
);

CREATE TABLE dm
(
  id INT NOT NULL AUTO_INCREMENT,
  dm_id VARCHAR(40) NOT NULL,
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE log
(
  id INT NOT NULL AUTO_INCREMENT,
  last_woot_date VARCHAR(10) NOT NULL,
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
