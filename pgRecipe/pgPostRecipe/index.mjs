import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  try {
    const body = JSON.parse(event.body || '{}');

    const {
      produced_item_id,
      production_time,
      cooking_description,
      ingredient1_id,
      ingredient2_id,
      ingredient3_id,
    } = body;

    if (!produced_item_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing produced_item_id' }),
      };
    }
    if (!ingredient1_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing ingredient1_id' }),
      };
    }

    const query = `
      INSERT INTO ingestor.Recipe (
        produced_item_id,
        production_time,
        cooking_description,
        ingredient1_id,
        ingredient2_id,
        ingredient3_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      produced_item_id,
      production_time || 0,
      cooking_description || '',
      ingredient1_id,
      ingredient2_id || null,
      ingredient3_id || null,
    ];

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
