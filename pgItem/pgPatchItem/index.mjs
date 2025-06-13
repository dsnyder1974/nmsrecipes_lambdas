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
    const { name, description, buff_id, buff_bonus_text, buff_duration_minutes, image_url } = body;

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

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (buff_id !== undefined) {
      updates.push(`buff_id = $${index++}`);
      values.push(buff_id);
    }

    if (buff_bonus_text !== undefined) {
      updates.push(`buff_bonus_text = $${index++}`);
      values.push(buff_bonus_text);
    }

    if (buff_duration_minutes !== undefined) {
      updates.push(`buff_duration_minutes = $${index++}`);
      values.push(buff_duration_minutes);
    }

    if (image_url !== undefined) {
      updates.push(`image_url = $${index++}`);
      values.push(image_url);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    values.push(id); // Last param is ID for WHERE clause

    query = `
      UPDATE ingestor.Item
      SET ${updates.join(', ')}
      WHERE item_id = $${index}
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
