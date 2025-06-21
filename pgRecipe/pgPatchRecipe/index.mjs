import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let query;
  let values = [];

  try {
    const id = event.pathParameters && event.pathParameters.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id path parameter is required' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    if (
      'produced_item_id' in body &&
      (body.produced_item_id === null || body.produced_item_id === undefined)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'produced_item_id must not be null' }),
      };
    }

    if (
      'ingredient1_id' in body &&
      (body.ingredient1_id === null || body.ingredient1_id === undefined)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ingredient1_id must not be null' }),
      };
    }

    // Build dynamic SET clause
    const fields = [
      'produced_item_id',
      'production_time',
      'cooking_description',
      'ingredient1_id',
      'ingredient2_id',
      'ingredient3_id',
    ];

    const updates = [];

    fields.forEach((field) => {
      if (body.hasOwnProperty(field)) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push(body[field]);
      }
    });

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    values.push(id); // WHERE clause value

    query = `
      UPDATE ingestor.Recipe
      SET ${updates.join(', ')}
      WHERE recipe_id = $${values.length}
      RETURNING *;
    `;

    console.log('Query:', query, 'with values:', values);
  } catch (err) {
    console.error('Error parsing body:', err);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  try {
    await client.connect();

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Record not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0]),
    };
  } catch (err) {
    console.error('Database error:', err);

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
