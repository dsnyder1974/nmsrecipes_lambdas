import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let id;
  let query;

  try {
    id = event.pathParameters && event.pathParameters.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id path parameter is required' }),
      };
    }

    query = `
      SELECT c.category_id, c.name
      FROM ingestor.ItemCategory ic
      JOIN ingestor.Category c ON ic.category_id = c.category_id
      WHERE ic.item_id = $1;
    `;

    console.log('Query:', query, 'with item_id:', id);
  } catch (err) {
    console.error('Error parsing body:', err);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  try {
    await client.connect();

    const result = await client.query(query, [id]);

    // if (result.rowCount === 0) {
    //   return {
    //     statusCode: 404,
    //     body: JSON.stringify({ error: 'Record not found' }),
    //   };
    // }

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
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
