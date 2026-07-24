import React from 'react';
import { getDb } from '@/lib/db';
import { guarded } from '@/lib/api-helpers';
import { quoteWithDetail } from '@/lib/queries';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const ORANGE = '#e8630a';
const NAVY = '#1a2b49';
const GRAY = '#6b7280';

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY },
  brandAccent: { color: ORANGE },
  tagline: { fontSize: 8, color: GRAY, marginTop: 2 },
  quoteTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  meta: { fontSize: 9, color: GRAY, textAlign: 'right', marginTop: 2 },
  rule: { borderBottomWidth: 2, borderBottomColor: ORANGE, marginVertical: 12 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  customerName: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 16 },
  th: { flexDirection: 'row', backgroundColor: NAVY, color: '#ffffff', paddingVertical: 6, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  colDesc: { flex: 5 },
  colQty: { flex: 1.4, textAlign: 'right' },
  colUnit: { flex: 1.6, textAlign: 'right' },
  colExt: { flex: 1.8, textAlign: 'right' },
  includes: { fontSize: 8, color: GRAY, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalBox: { backgroundColor: '#f5f6f8', padding: 10, minWidth: 200 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalGrand: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: NAVY, paddingTop: 4, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  termsBlock: { marginTop: 24 },
  termsText: { fontSize: 8, color: GRAY, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, textAlign: 'center', fontSize: 8, color: GRAY, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
});

const usd = (n, dp = 2) => `$${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

function QuotePdf({ quote }) {
  const t = quote.totals;
  const componentList = quote.components
    .map((c) => (c.qty_per_unit > 1 ? `${c.description} (x${c.qty_per_unit})` : c.description))
    .join(', ');
  return (
    <Document title={`Fillpack USA Quote ${quote.quote_number}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>
              FILLPACK <Text style={s.brandAccent}>USA</Text>
            </Text>
            <Text style={s.tagline}>Contract Manufacturing — Personal Care</Text>
          </View>
          <View>
            <Text style={s.quoteTitle}>QUOTATION</Text>
            <Text style={s.meta}>Quote No. {quote.quote_number}</Text>
            <Text style={s.meta}>Date: {quote.created_at?.slice(0, 10)}</Text>
            <Text style={s.meta}>Valid through: {quote.validity_date}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <Text style={s.sectionLabel}>Prepared for</Text>
        <Text style={s.customerName}>{quote.customer_company || quote.customer_name}</Text>
        {quote.customer_company ? <Text>{quote.customer_name}</Text> : null}
        {quote.customer_email ? <Text style={{ color: GRAY }}>{quote.customer_email}</Text> : null}

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.colDesc}>Description</Text>
            <Text style={s.colQty}>Qty</Text>
            <Text style={s.colUnit}>Unit Price</Text>
            <Text style={s.colExt}>Extended</Text>
          </View>
          <View style={s.tr}>
            <View style={s.colDesc}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {quote.recipe_name} — {quote.package_size_oz} oz
              </Text>
              <Text style={s.includes}>Filled, assembled &amp; packaged. Includes: {componentList}</Text>
            </View>
            <Text style={s.colQty}>{quote.quantity.toLocaleString('en-US')}</Text>
            <Text style={s.colUnit}>{usd(t.unitPrice, 4)}</Text>
            <Text style={s.colExt}>{usd(t.totalPrice)}</Text>
          </View>
        </View>

        <View style={s.totalRow}>
          <View style={s.totalBox}>
            <View style={s.totalLine}>
              <Text>Subtotal</Text>
              <Text>{usd(t.totalPrice)}</Text>
            </View>
            <View style={s.totalGrand}>
              <Text>Total</Text>
              <Text style={{ color: ORANGE }}>{usd(t.totalPrice)}</Text>
            </View>
          </View>
        </View>

        <View style={s.termsBlock}>
          <Text style={s.sectionLabel}>Terms &amp; Conditions</Text>
          <Text style={s.termsText}>{quote.terms}</Text>
        </View>

        <Text style={s.footer}>
          Fillpack USA — Thank you for the opportunity to quote your project. Pricing valid through {quote.validity_date}.
        </Text>
      </Page>
    </Document>
  );
}

export const GET = guarded(async (request, { params }) => {
  const { id } = await params;
  const quote = quoteWithDetail(getDb(), id);
  if (!quote) return new Response('Not found', { status: 404 });
  const buffer = await renderToBuffer(<QuotePdf quote={quote} />);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Fillpack-Quote-${quote.quote_number}.pdf"`,
    },
  });
});
