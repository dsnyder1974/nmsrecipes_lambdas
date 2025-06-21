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

    // Step 1: Get recipes that produce this item
    const recipesRes = await client.query(
      `SELECT
         r.recipe_id,
         r.production_time,
         r.cooking_description
       FROM ingestor.Recipe r
       JOIN ingestor.RecipeProducesItem rpi ON r.recipe_id = rpi.recipe_id
       WHERE rpi.item_id = $1`,
      [id]
    );

    console.log('recipesRes', recipesRes);

    const recipes = recipesRes.rows;
    if (recipes.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([]), // no recipes produce this item
      };
    }

    const recipeIds = recipes.map((r) => r.recipe_id);

    // Step 2: Fetch all ingredients for all of those recipes
    const ingredientsRes = await client.query(
      `SELECT
         ri.recipe_id,
         i.item_id AS input_item_id,
         i.name AS input_name,
         ri.quantity
       FROM ingestor.RecipeIngredient ri
       JOIN ingestor.Item i ON ri.item_id = i.item_id
       WHERE ri.recipe_id = ANY($1::int[])`,
      [recipeIds]
    );

    console.log('ingredientsRes', ingredientsRes);

    // Step 3: Group ingredients by recipe_id
    const ingredientsByRecipe = {};
    for (const row of ingredientsRes.rows) {
      if (!ingredientsByRecipe[row.recipe_id]) {
        ingredientsByRecipe[row.recipe_id] = [];
      }
      ingredientsByRecipe[row.recipe_id].push({
        input_item_id: row.input_item_id,
        input_name: row.input_name,
        quantity: row.quantity,
      });
    }

    console.log('ingredientsByRecipe', ingredientsByRecipe);

    // Step 4: Merge
    const result = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_name: r.recipe_name,
      production_time: r.production_time,
      cooking_description: r.cooking_description,
      ingredients: ingredientsByRecipe[r.recipe_id] || [],
    }));

    console.log('result', result);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
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
