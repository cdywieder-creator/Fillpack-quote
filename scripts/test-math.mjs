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

check('recipe pct valid', validateRecipePercentages([{ percentage: 60 }, { percentage: 40 }]).valid ? 1 : 0, 1);
check('recipe pct invalid', validateRecipePercentages([{ percentage: 60 }, { percentage: 39 }]).valid ? 1 : 0, 0);
// float noise: 33.33 + 33.33 + 33.34 = 100
check('recipe pct float noise', validateRecipePercentages([{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }]).valid ? 1 : 0, 1);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll quote-math tests passed');
