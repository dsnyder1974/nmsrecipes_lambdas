import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {

  const client = await getDbClient();

  try {
    await client.connect();

    const res = await client.query('SELECT * FROM category');
    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };

  } catch (err) {
    console.error('Database error:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
}

export const handler = withCors(mainHandler);
