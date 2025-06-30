import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

import { createClient } from 'redis';

const redisUri = `redis://${process.env.REDIS_ENDPOINT}:6379`;
const redisClient = createClient({ url: redisUri });
await redisClient.connect();

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let query;
  let values = [];

  try {
    const body = JSON.parse(event.body);

    const id = event.pathParameters && event.pathParameters.id;
    const { preferred_recipe_id } = body;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id path parameter is required' }),
      };
    }

    if (!preferred_recipe_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'preferred_recipe_id is required' }),
      };
    }

    query = `
      UPDATE ingestor.Item SET preferred_recipe_id = $1 WHERE item_id = $2 RETURNING *
    `;

    await client.connect();

    const result = await client.query(query, [preferred_recipe_id, id]);

    await redisClient.incr('preferredRecipesVersion');

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
