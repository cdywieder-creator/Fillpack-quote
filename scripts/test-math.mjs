import {
  deriveFillWeightLb,
  computeQuote,
  validateRecipePercentages,
  priceFromCost,
  WATER_LB_PER_FLOZ,
} from '../src/lib/quote-math.js';

let failed = 0;
function check(name, actual, expected, tol = 1e-6) {
  const ok = Math.abs(actual - expected) < tol;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual}, expected ${expected}`);
}

// 16 fl oz of SG-0.91 oil: 16 × (8.345/128) × 0.91
check('fill weight 16oz SG .91', deriveFillWeightLb(16, 0.91), 16 * WATER_LB_PER_FLOZ * 0.91);
check('fill weight ~0.949 lb', deriveFillWeightLb(16, 0.91), 0.9493, 1e-3);

// margin on selling price: $1.00 cost at 30% → $1.4286
check('margin pricing', priceFromCost(1.0, 30, 'margin'), 1 / 0.7);
// markup: $1.00 at 30% → $1.30
check('markup pricing', priceFromCost(1.0, 30, 'markup'), 1.3);

const totals = computeQuote({
  fillWeightLb: 1.0,
  ingredients: [
    { percentage: 70, costPerLb: 2.0 }, // 1.40
    { percentage: 30, costPerLb: 10.0 }, // 3.00
  ],
  components: [
    { unitCost: 0.5, qtyPerUnit: 1 },
    { unitCost: 0.1, qtyPerUnit: 2 },
  ],
  marginPct: 50,
  quantity: 1000,
  method: 'margin',
});
check('oil cost', totals.oilCost, 4.4);
check('packaging cost', totals.packagingCost, 0.7);
check('bom', totals.bomCost, 5.1);
check('unit price at 50% margin', totals.unitPrice, 10.2);
check('total price', totals.totalPrice, 10200);
check('realized margin', totals.marginOnPrice, 0.5);

// Filling is its own cost line: rate × fills per unit, folded into BOM.
const withFilling = computeQuote({
  fillWeightLb: 1,
  ingredients: [{ percentage: 100, costPerLb: 2 }],
  components: [{ unitCost: 0.5, qtyPerUnit: 1 }],
  marginPct: 50,
  quantity: 100,
  method: 'margin',
  fillingRate: 1.7,
  fillingQty: 1,
});
check('filling cost', withFilling.fillingCost, 1.7);
check('bom includes filling', withFilling.bomCost, 4.2);
check('price reflects filling', withFilling.unitPrice, 8.4);

const twoFills = computeQuote({
  fillWeightLb: 1,
  ingredients: [{ percentage: 100, costPerLb: 2 }],
  components: [{ unitCost: 0.5, qtyPerUnit: 1 }],
  marginPct: 50,
  quantity: 100,
  fillingRate: 1.7,
  fillingQty: 2,
});
check('filling scales with fills/unit', twoFills.fillingCost, 3.4);

// Quotes created before the filling line existed default to zero.
const noFilling = computeQuote({
  fillWeightLb: 1,
  ingredients: [{ percentage: 100, costPerLb: 2 }],
  components: [{ unitCost: 0.5, qtyPerUnit: 1 }],
  marginPct: 50,
  quantity: 100,
});
check('filling defaults to 0', noFilling.fillingCost, 0);
check('bom unchanged without filling', noFilling.bomCost, 2.5);

// The house default: 25% margin means price = cost / 0.75.
const house = computeQuote({
  fillWeightLb: 1,
  ingredients: [{ percentage: 100, costPerLb: 1 }],
  components: [{ unitCost: 0.5, qtyPerUnit: 1 }],
  marginPct: 25,
  quantity: 1000,
  fillingRate: 0.25,
});
check('house bom', house.bomCost, 1.75);
check('house price is cost / 0.75', house.unitPrice, 1.75 / 0.75);
check('house realized margin', house.marginOnPrice, 0.25);

check('recipe pct valid', validateRecipePercentages([{ percentage: 60 }, { percentage: 40 }]).valid ? 1 : 0, 1);
check('recipe pct invalid', validateRecipePercentages([{ percentage: 60 }, { percentage: 39 }]).valid ? 1 : 0, 0);
// float noise: 33.33 + 33.33 + 33.34 = 100
check('recipe pct float noise', validateRecipePercentages([{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }]).valid ? 1 : 0, 1);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll quote-math tests passed');
