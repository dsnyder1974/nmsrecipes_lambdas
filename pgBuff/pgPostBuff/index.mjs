import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let body;

  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('Error parsing body:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  try {
    const { name, description } = body;

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'name is required' }),
      };
    }

    const query = `
      INSERT INTO ingestor.Buff (name, description)
      VALUES ($1, $2)
      RETURNING *;
    `;

    const values = [name, description || null];

    console.log('Query:', query, 'with values:', values);

    await client.connect();

    const result = await client.query(query, values);

    return {
      statusCode: 201, // Created
      body: JSON.stringify(result.rows[0]),
    };

} catch (err) {
    console.error('Error inserting record:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: err.message,
      }),
    };
  } finally {
    await client.end();
  }
};

export const handler = mainHandler;
