import { createPool } from 'mariadb';

export const connect = async () => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PWD;
  if (!host || !user || !password) throw new Error('Missing db credentials');
  const pool = createPool({
    host,
    user,
    password,
    database: 'columnistos',
    connectionLimit: 6,
    trace: true,
  });
  await pool.getConnection();
  console.log('Connected to db', pool.totalConnections());
  return pool;
};

export const end = async (pool) => {
  await pool.end();
  console.log('Disconnected from db');
};
