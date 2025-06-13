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
    const { name, description, buff_id, buff_bonus_text, buff_duration_minutes, image_url, value } = body;

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'name is required' }),
      };
    }

    const query = `
      INSERT INTO ingestor.Item (name, description, buff_id, buff_bonus_text, buff_duration_minutes, image_url, value)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [name, description || null, buff_id || null, buff_bonus_text || null, buff_duration_minutes || null, image_url || null, value || 0 ];

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
