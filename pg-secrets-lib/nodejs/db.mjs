import { Client } from 'pg';
import { getDBCreds } from './secret.mjs';

export const getDbClient = async () => {

  const dbCreds = await getDBCreds();
  const [envHost, envPortString] = process.env.DB_HOST.split(":");

  return new Client({
    host: envHost,
    port: parseInt(envPortString || process.env.DB_HOST || 5432),
    user: dbCreds.username,
    password: dbCreds.password,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false  // Accept RDS self-signed cert
    }
  });
};
