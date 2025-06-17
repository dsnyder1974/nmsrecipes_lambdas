import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  const id = event.pathParameters && event.pathParameters.id;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'id path parameter is required' }),
    };
  }

  try {
    await client.connect();

    // Get item
    const { rows: itemRows } = await client.query('SELECT * FROM ingestor.Item WHERE item_id = $1', [id]);

    if (itemRows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Item not found' }),
      };
    }

    const item = itemRows[0];

    // Get categories
    const { rows: categoryRows } = await client.query(
      `
      SELECT c.category_id, c.name
      FROM ingestor.Category c
      JOIN ingestor.ItemCategory ic ON c.category_id = ic.category_id
      WHERE ic.item_id = $1
      `,
      [id]
    );

    item.categories = categoryRows;

    return {
      statusCode: 200,
      body: JSON.stringify(item),
    };
  } catch (err) {
    console.error('Error fetching item:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  } finally {
    await client.end();
  }
};

export const handler = mainHandler;
