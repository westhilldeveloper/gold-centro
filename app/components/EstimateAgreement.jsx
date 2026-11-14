// app/components/EstimateAgreement.jsx
'use client';
import { forwardRef } from 'react';

const num = (v, fallback = 0) => Number(Number(v).toFixed(2)) || fallback;

const S = {
  page: { fontFamily: 'Arial, sans-serif', maxWidth: '760px', margin: '0 auto', padding: '4px', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '14px' },
  th: { border: '1px solid #000', padding: '6px 5px', fontSize: '10px', fontWeight: 700, backgroundColor: '#f3f4f6', textAlign: 'left' },
  td: { border: '1px solid #000', padding: '5px', fontSize: '10px' },
};

const EstimateAgreement = forwardRef(function EstimateAgreement({ order, staff, customer }, ref) {
  if (!order) return null;
  const items = order.items || [];
  const docDate = new Date(order.createdAt).toLocaleDateString('en-IN');
  const totalEstimatedAmount = items.reduce((sum, item) => sum + num(item.itemPrice), 0);

  return (
    <div ref={ref} style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '14px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Gold Centro</h1>
          <p style={{ margin: '4px 0 0', fontSize: '9.5px' }}>Branch: {order.branch?.name} ({order.branch?.code})</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>ESTIMATE AGREEMENT</p>
          <p style={{ margin: '4px 0 0', fontSize: '9.5px' }}>Date: {docDate}</p>
        </div>
      </div>

      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '14px' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Customer Details (Seller)</p>
        <p style={{ margin: '2px 0' }}>Name: {customer.name} | Phone: {customer.phone}</p>
        <p style={{ margin: '2px 0' }}>Aadhaar: {customer.aadhaarNumber || '—'} | PAN: {customer.panNumber || '—'}</p>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            {/* ✅ ADDED: SL No Column */}
            <th style={{ ...S.th, textAlign: 'center', width: '40px' }}>SL No</th>
            <th style={S.th}>Item</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Count</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Purity</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Pre-Gross (g)</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Est. Rate (₹/g)</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Est. Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              {/* ✅ ADDED: Index value */}
              <td style={{ ...S.td, textAlign: 'center' }}>{idx + 1}</td>
              <td style={S.td}>{it.name}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{it.count}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{it.purity}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{num(it.preEstimationGrossWeight)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{num(it.ratePerGram)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{num(it.itemPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {/* ✅ UPDATED: colSpan from 5 to 6 */}
            <td colSpan="6" style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#fef3c7' }}>TOTAL ESTIMATED AMOUNT</td>
            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#fef3c7' }}>₹ {totalEstimatedAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ border: '1px solid #000', padding: '10px', marginBottom: '20px', backgroundColor: '#f9fafb' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>Customer Declaration & Agreement</p>
        <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '10.5px', lineHeight: 1.5 }}>
          <li>I am the sole and lawful owner of the gold described above.</li>
          <li><strong>I understand that the weights and amounts mentioned above are pre-estimates. The gold will be cleaned and melted (burnt) for final processing. The final net weight and purity may change, which will consequently change the final purchase price.</strong></li>
          <li>I agree to accept the final valuation based on the post-cleaning/burning weight and purity assessed by Gold Centro.</li>
          <li>I consent to Gold Centro melting the gold for testing and valuation purposes.</li>
        </ol>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '40px' }}>
        <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Customer Signature</p>
          <p style={{ margin: '2px 0 0', fontSize: '10px' }}>{customer.name}</p>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Authorized Signatory</p>
          <p style={{ margin: '2px 0 0', fontSize: '10px' }}>For Gold Centro ({order.branch?.name})</p>
        </div>
      </div>
    </div>
  );
});
export default EstimateAgreement;