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

    const query = `
      SELECT
        recipe_id,
        produced_item_id,
        production_time,
        cooking_description,
        ingredient1_id,
        ingredient2_id,
        ingredient3_id
      FROM ingestor.Recipe
      WHERE produced_item_id = $1
    `;
    const result = await client.query(query, [id]);

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (err) {
    console.error('Error fetching recipe:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  } finally {
    await client.end();
  }
};

export const handler = mainHandler;
