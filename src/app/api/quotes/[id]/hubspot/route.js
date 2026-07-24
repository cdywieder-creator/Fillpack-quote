import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guarded } from '@/lib/api-helpers';
import { quoteWithDetail } from '@/lib/queries';

// Phase 2 stub: push this quote to HubSpot as a Deal.
// Planned implementation:
//   1. POST /crm/v3/objects/deals with dealname = `${quote_number} — ${customer_name}`,
//      amount = totals.totalPrice, dealstage from pipeline config.
//   2. Associate/create the contact from customer_email.
//   3. Create line items (recipe product + packaging) and associate with the deal.
//   4. Upload the customer PDF via the Files API and attach it to the deal.
// Requires HUBSPOT_ACCESS_TOKEN (private app token) in env.
export const POST = guarded(async (request, { params }) => {
  const { id } = await params;
  const quote = quoteWithDetail(getDb(), id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(
    {
      error: 'HubSpot integration is planned for Phase 2 and not yet enabled.',
      wouldSend: {
        dealName: `${quote.quote_number} — ${quote.customer_company || quote.customer_name}`,
        amount: Number(quote.totals.totalPrice.toFixed(2)),
        contactEmail: quote.customer_email,
        lineItems: [
          { name: `${quote.recipe_name} — ${quote.package_size_oz} oz`, quantity: quote.quantity, price: Number(quote.totals.unitPrice.toFixed(4)) },
        ],
        attachments: ['customer-quote.pdf'],
      },
    },
    { status: 501 }
  );
});
