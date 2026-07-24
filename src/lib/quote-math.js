// Pure quote-costing functions, shared by client preview and server persistence.

// Weight of 1 US fluid ounce of water in pounds (8.345 lb/gal / 128 fl oz/gal).
export const WATER_LB_PER_FLOZ = 8.345 / 128;

export const DEFAULT_SPECIFIC_GRAVITY = 0.91; // typical carrier oil

export const LB_PER_KG = 2.20462;

// Derive fill weight (lb of product per unit) from fluid-ounce size and specific gravity.
export function deriveFillWeightLb(sizeFlOz, specificGravity = DEFAULT_SPECIFIC_GRAVITY) {
  return sizeFlOz * WATER_LB_PER_FLOZ * specificGravity;
}

// ingredients: [{ percentage, costPerLb }] — percentage as 0-100
export function oilCostPerUnit(fillWeightLb, ingredients) {
  return ingredients.reduce(
    (sum, ing) => sum + fillWeightLb * (Number(ing.percentage) / 100) * Number(ing.costPerLb),
    0
  );
}

// components: [{ unitCost, qtyPerUnit }]
export function packagingCostPerUnit(components) {
  return components.reduce(
    (sum, c) => sum + Number(c.unitCost) * Number(c.qtyPerUnit ?? 1),
    0
  );
}

// method: 'margin' → price = cost / (1 - m); 'markup' → price = cost * (1 + m)
export function priceFromCost(bomCost, marginPct, method = 'margin') {
  const m = Number(marginPct) / 100;
  if (method === 'markup') return bomCost * (1 + m);
  if (m >= 1) return NaN;
  return bomCost / (1 - m);
}

export function computeQuote({ fillWeightLb, ingredients, components, marginPct, quantity, method = 'margin' }) {
  const oilCost = oilCostPerUnit(fillWeightLb, ingredients);
  const packagingCost = packagingCostPerUnit(components);
  const bomCost = oilCost + packagingCost;
  const unitPrice = priceFromCost(bomCost, marginPct, method);
  const unitProfit = unitPrice - bomCost;
  const qty = Number(quantity) || 0;
  return {
    oilCost,
    packagingCost,
    bomCost,
    unitPrice,
    unitProfit,
    marginOnPrice: unitPrice > 0 ? unitProfit / unitPrice : 0,
    totalPrice: unitPrice * qty,
    totalCost: bomCost * qty,
    totalProfit: unitProfit * qty,
  };
}

export function validateRecipePercentages(items) {
  const total = items.reduce((s, i) => s + Number(i.percentage || 0), 0);
  // tolerate float noise
  return { total, valid: Math.abs(total - 100) < 0.001 };
}

export const money = (n, dp = 2) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—';
