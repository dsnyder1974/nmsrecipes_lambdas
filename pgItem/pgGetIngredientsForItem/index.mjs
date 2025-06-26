import { getDbClient } from '/opt/nodejs/db.mjs';
import { withCors } from '/opt/nodejs/withCors.mjs';

// export async function handler(event) {
const mainHandler = async (event) => {
  const client = await getDbClient();

  let query;
  let id;

  try {
    id = event.pathParameters && event.pathParameters.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'id path parameter is required' }),
      };
    }

    query = `
      WITH RECURSIVE FullTree AS (
        -- 🌱 Base case: root item's recipe ingredients
        SELECT
          r.recipe_id,
          r.produced_item_id,
          i.item_id AS ingredient_item_id,
          i.name AS ingredient_name,
          1 AS depth,
          1::NUMERIC AS quantity,
          ARRAY[root.item_id] AS path
        FROM ingestor.Item root
        JOIN LATERAL (
          SELECT r.*
          FROM ingestor.Recipe r
          WHERE r.produced_item_id = root.item_id
          ORDER BY CASE
                    WHEN root.preferred_recipe_id IS NOT NULL AND r.recipe_id = root.preferred_recipe_id THEN 0
                    ELSE 1
                  END,
                  r.recipe_id
          LIMIT 1
        ) r ON TRUE
        JOIN ingestor.Item i ON i.item_id = r.ingredient1_id
        WHERE root.item_id = $1

        UNION ALL

        SELECT r.recipe_id, r.produced_item_id, i.item_id, i.name, 1, 1::NUMERIC, ARRAY[root.item_id]
        FROM ingestor.Item root
        JOIN LATERAL (
          SELECT r.*
          FROM ingestor.Recipe r
          WHERE r.produced_item_id = root.item_id
          ORDER BY CASE
                    WHEN root.preferred_recipe_id IS NOT NULL AND r.recipe_id = root.preferred_recipe_id THEN 0
                    ELSE 1
                  END,
                  r.recipe_id
          LIMIT 1
        ) r ON TRUE
        JOIN ingestor.Item i ON i.item_id = r.ingredient2_id
        WHERE root.item_id = $1 AND r.ingredient2_id IS NOT NULL

        UNION ALL

        SELECT r.recipe_id, r.produced_item_id, i.item_id, i.name, 1, 1::NUMERIC, ARRAY[root.item_id]
        FROM ingestor.Item root
        JOIN LATERAL (
          SELECT r.*
          FROM ingestor.Recipe r
          WHERE r.produced_item_id = root.item_id
          ORDER BY CASE
                    WHEN root.preferred_recipe_id IS NOT NULL AND r.recipe_id = root.preferred_recipe_id THEN 0
                    ELSE 1
                  END,
                  r.recipe_id
          LIMIT 1
        ) r ON TRUE
        JOIN ingestor.Item i ON i.item_id = r.ingredient3_id
        WHERE root.item_id = $1 AND r.ingredient3_id IS NOT NULL

        -- 🔁 Recursive expansion of ingredients
        UNION ALL

        SELECT
          r.recipe_id,
          r.produced_item_id,
          ing.item_id,
          ing.name,
          ft.depth + 1,
          ft.quantity * 1,
          ft.path || r.produced_item_id
        FROM FullTree ft
        JOIN ingestor.Item it ON it.item_id = ft.ingredient_item_id

        LEFT JOIN LATERAL (
          SELECT r.*
          FROM ingestor.Recipe r
          WHERE r.produced_item_id = it.item_id
          ORDER BY CASE
                    WHEN it.preferred_recipe_id IS NOT NULL AND r.recipe_id = it.preferred_recipe_id THEN 0
                    ELSE 1
                  END,
                  r.recipe_id
          LIMIT 1
        ) r ON TRUE

        -- expand ingredients into rows
        JOIN LATERAL (
          SELECT i1.item_id, i1.name FROM ingestor.Item i1 WHERE i1.item_id = r.ingredient1_id
          UNION ALL
          SELECT i2.item_id, i2.name FROM ingestor.Item i2 WHERE i2.item_id = r.ingredient2_id
          UNION ALL
          SELECT i3.item_id, i3.name FROM ingestor.Item i3 WHERE i3.item_id = r.ingredient3_id
        ) ing ON TRUE

        -- ✅ cycle protection
        WHERE r.recipe_id IS NOT NULL
          AND NOT (ing.item_id = ANY(ft.path))
      )

      -- 🎯 Final leaf-node aggregation
      SELECT
        ft.ingredient_item_id,
        ft.ingredient_name,
        SUM(ft.quantity) AS total_quantity
      FROM FullTree ft
      LEFT JOIN ingestor.Recipe r2 ON r2.produced_item_id = ft.ingredient_item_id
      WHERE r2.recipe_id IS NULL
      GROUP BY ft.ingredient_item_id, ft.ingredient_name
      ORDER BY total_quantity DESC, ft.ingredient_name;
    `;
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

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Record not found' }),
      };
    }

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
