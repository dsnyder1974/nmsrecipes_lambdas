import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let item_id;
  let categoryIds;
  let query;

  item_id = event.pathParameters && event.pathParameters.id;

  if (!item_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'id path parameter is required' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    if (!Array.isArray(body.category_ids)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'category_ids array is required' }),
      };
    }

    categoryIds = body.category_ids.map(Number).filter((id) => Number.isInteger(id));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid category_ids array' }) };
  }

  try {
    await client.connect();
    await client.query('BEGIN');

    // Get current category_ids for the item
    const { rows: currentRows } = await client.query(
      'SELECT category_id FROM ingestor.ItemCategory WHERE item_id = $1',
      [item_id]
    );
    const currentIds = new Set(currentRows.map((r) => r.category_id));
    const newIds = new Set(categoryIds);

    console.log('Current IDs:', currentIds);
    console.log('New IDs:', newIds);

    // Calculate additions and deletions
    const toAdd = [...newIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    console.log('To Add:', toAdd);
    console.log('To Remove:', toRemove);
    
    // Perform deletions
    if (toRemove.length > 0) {
      await client.query(
        'DELETE FROM ingestor.ItemCategory WHERE item_id = $1 AND category_id = ANY($2)',
        [item_id, toRemove]
      );
    }

    // Perform insertions
    for (const category_id of toAdd) {
      await client.query('INSERT INTO ingestor.ItemCategory (item_id, category_id) VALUES ($1, $2)', [
        item_id,
        category_id,
      ]);
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Categories updated', added: toAdd, removed: toRemove }),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating item categories:', err);

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
