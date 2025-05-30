import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let query;
  let values = [];

  try {
    const body = JSON.parse(event.body);

    const id = event.pathParameters && event.pathParameters.id;
    const { name, image } = body;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id path parameter is required' }),
      };
    }

    // Build dynamic SET clause
    const updates = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (image !== undefined) {
      updates.push(`image = $${index++}`);
      values.push(image);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    values.push(id); // Last param is ID for WHERE clause

    query = `
      UPDATE category
      SET ${updates.join(', ')}
      WHERE id = $${index}
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

export const handler = withCors(mainHandler);
