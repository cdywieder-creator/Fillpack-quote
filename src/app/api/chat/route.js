import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/lib/db';
import { guarded } from '@/lib/api-helpers';
import { recipeWithIngredients, quoteWithDetail, validateRecipeBody } from '@/lib/queries';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant for Fillpack, a product quoting application. You help users create recipes, manage quotes, and configure products.

When users ask you to:
- Create or manage recipes: Use the recipe tools
- Create or manage quotes: Use the quote tools
- Add or manage ingredients: Use the ingredient tools
- Add or manage packaging: Use the packaging tools

Always be clear about what you're doing and confirm results. Use the available tools to fulfill requests.`;

const tools = [
  {
    name: 'list_ingredients',
    description: 'Get all active ingredients in the system',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_ingredient',
    description: 'Create a new ingredient',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Oil name (required)' },
        cost_per_unit: { type: 'number', description: 'Cost per unit in dollars' },
        unit_type: { type: 'string', description: 'Unit type (default: oz)' },
        supplier: { type: 'string', description: 'Supplier name' },
      },
      required: ['name', 'cost_per_unit'],
    },
  },
  {
    name: 'list_packaging',
    description: 'Get all active packaging components',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_packaging',
    description: 'Create a new packaging component',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bottle', 'cap', 'label', 'box', 'other'], description: 'Type of packaging' },
        description: { type: 'string', description: 'Description of the packaging' },
        unit_cost: { type: 'number', description: 'Cost per unit in dollars' },
        unit_type: { type: 'string', description: 'Unit type (e.g., each)' },
      },
      required: ['type', 'description', 'unit_cost'],
    },
  },
  {
    name: 'list_recipes',
    description: 'Get all recipes',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_recipe',
    description: 'Create a new recipe with ingredients',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Recipe name' },
        items: {
          type: 'array',
          description: 'Array of ingredients with percentages',
          items: {
            type: 'object',
            properties: {
              ingredient_id: { type: 'number', description: 'Ingredient ID' },
              percentage: { type: 'number', description: 'Percentage in recipe (0-100)' },
            },
            required: ['ingredient_id', 'percentage'],
          },
        },
        sg: { type: 'number', description: 'Specific gravity' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['name', 'items'],
    },
  },
  {
    name: 'list_quotes',
    description: 'Get all quotes',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_quote',
    description: 'Create a new quote',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name' },
        customer_company: { type: 'string', description: 'Customer company' },
        customer_email: { type: 'string', description: 'Customer email' },
        recipe_id: { type: 'number', description: 'Recipe ID' },
        quantity: { type: 'number', description: 'Quantity to quote' },
        packaging_ids: {
          type: 'array',
          description: 'Array of packaging component IDs',
          items: { type: 'number' },
        },
      },
      required: ['customer_name', 'customer_email', 'recipe_id', 'quantity', 'packaging_ids'],
    },
  },
  {
    name: 'get_quote',
    description: 'Get detailed information about a specific quote',
    input_schema: {
      type: 'object',
      properties: {
        quote_id: { type: 'number', description: 'Quote ID' },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'update_quote_status',
    description: 'Update quote status (draft, sent, accepted, declined)',
    input_schema: {
      type: 'object',
      properties: {
        quote_id: { type: 'number', description: 'Quote ID' },
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'accepted', 'declined'],
          description: 'New status',
        },
      },
      required: ['quote_id', 'status'],
    },
  },
];

async function executeTool(toolName, toolInput) {
  const db = getDb();

  switch (toolName) {
    case 'list_ingredients': {
      const ingredients = db.prepare('SELECT * FROM ingredients WHERE active = 1 ORDER BY name').all();
      return { success: true, data: ingredients };
    }

    case 'create_ingredient': {
      const { name, cost_per_unit, unit_type = 'oz', supplier } = toolInput;
      const info = db
        .prepare('INSERT INTO ingredients (name, cost_per_unit, unit_type, supplier, active) VALUES (?, ?, ?, ?, 1)')
        .run(name, cost_per_unit, unit_type, supplier || null);
      return { success: true, data: { id: info.lastInsertRowid, name, cost_per_unit, unit_type, supplier } };
    }

    case 'list_packaging': {
      const packaging = db.prepare('SELECT * FROM packaging_components WHERE active = 1 ORDER BY type, description').all();
      return { success: true, data: packaging };
    }

    case 'create_packaging': {
      const { type, description, unit_cost, unit_type = 'each' } = toolInput;
      const info = db
        .prepare(
          'INSERT INTO packaging_components (type, description, unit_cost, unit_type, active) VALUES (?, ?, ?, ?, 1)'
        )
        .run(type, description, unit_cost, unit_type);
      return { success: true, data: { id: info.lastInsertRowid, type, description, unit_cost, unit_type } };
    }

    case 'list_recipes': {
      const recipes = db.prepare('SELECT * FROM recipes ORDER BY name').all();
      return {
        success: true,
        data: recipes.map((r) => recipeWithIngredients(db, r.id)),
      };
    }

    case 'create_recipe': {
      const { name, items, sg, notes } = toolInput;
      validateRecipeBody({ name, items, sg, notes });
      const id = db.transaction(() => {
        const info = db
          .prepare('INSERT INTO recipes (name, specific_gravity, notes) VALUES (?, ?, ?)')
          .run(name, sg, notes);
        const ins = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, percentage) VALUES (?, ?, ?)');
        for (const it of items) ins.run(info.lastInsertRowid, it.ingredient_id, Number(it.percentage));
        return info.lastInsertRowid;
      })();
      return { success: true, data: recipeWithIngredients(db, id) };
    }

    case 'list_quotes': {
      const quotes = db.prepare('SELECT id FROM quotes ORDER BY id DESC').all();
      return {
        success: true,
        data: quotes.map((q) => quoteWithDetail(db, q.id)),
      };
    }

    case 'create_quote': {
      const { customer_name, customer_company, customer_email, recipe_id, quantity, packaging_ids } = toolInput;

      const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipe_id);
      if (!recipe) return { success: false, error: 'Recipe not found' };

      const id = db.transaction(() => {
        const info = db
          .prepare(
            'INSERT INTO quotes (customer_name, customer_company, customer_email, recipe_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(customer_name, customer_company, customer_email, recipe_id, quantity, 'draft');

        const quoteId = info.lastInsertRowid;
        const ins = db.prepare('INSERT INTO quote_packaging (quote_id, packaging_component_id) VALUES (?, ?)');
        for (const pkgId of packaging_ids) {
          ins.run(quoteId, pkgId);
        }

        return quoteId;
      })();

      return { success: true, data: quoteWithDetail(db, id) };
    }

    case 'get_quote': {
      const { quote_id } = toolInput;
      const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quote_id);
      if (!quote) return { success: false, error: 'Quote not found' };
      return { success: true, data: quoteWithDetail(db, quote_id) };
    }

    case 'update_quote_status': {
      const { quote_id, status } = toolInput;
      db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(status, quote_id);
      return { success: true, data: quoteWithDetail(db, quote_id) };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

export const POST = guarded(async (request) => {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    let response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: tools,
      messages: messages,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((block) => block.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: tools,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });
    }

    const textContent = response.content.find((block) => block.type === 'text');
    return NextResponse.json({
      message: textContent?.text || 'No response generated',
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
