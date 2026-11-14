// app/components/BranchPurchaseAgreement.jsx
'use client';
import { forwardRef } from 'react';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const S = {
  page: { fontFamily: 'Arial, sans-serif', maxWidth: '760px', margin: '0 auto', backgroundColor: '#fff', color: '#111827', fontSize: '11px', lineHeight: 1.45, padding: '4px', boxSizing: 'border-box' },
  section: { marginBottom: '14px' },
  card: { border: '1px solid #111827', padding: '8px 10px', boxSizing: 'border-box' },
  gridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', boxSizing: 'border-box' },
  th: { border: '1px solid #111827', padding: '6px 5px', fontSize: '10px', fontWeight: 700, backgroundColor: '#f3f4f6', verticalAlign: 'middle', boxSizing: 'border-box' },
  td: { border: '1px solid #111827', padding: '5px 5px', fontSize: '10px', verticalAlign: 'top', boxSizing: 'border-box' },
};

const BranchPurchaseAgreement = forwardRef(function BranchPurchaseAgreement({ order, staff, customer }, ref) {
  if (!order) return null;

  const items = order.items || [];
  const totalNet = items.reduce((s, i) => s + num(i.netWeight), 0);
  const totalGross = items.reduce((s, i) => s + num(i.grossWeight), 0);
  const finalOffer = num(order.finalPrice || order.agentOffer || order.estimatedTotal);
  const docDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const docNo = `GC/BA/${order.branch?.code || 'HO'}/${order.id.slice(-6).toUpperCase()}`;

  return (
    <div ref={ref} id="purchase-agreement" style={S.page}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '14px', borderBottom: '2px solid #111827' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/images/gcentro_logo.png" alt="Logo" crossOrigin="anonymous" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Gold Centro</h1>
            <p style={{ margin: '4px 0 0', fontSize: '9.5px', color: '#374151' }}>
              Branch: <strong>{order.branch?.name}</strong> ({order.branch?.code})<br />
              Kalyana Krishna Smskrithibhavan,<br />Kochi, Kerala 682301
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>BRANCH PURCHASE AGREEMENT</p>
          <p style={{ margin: '4px 0 0', fontSize: '9.5px' }}>Doc #: {docNo}</p>
          <p style={{ margin: '1px 0 0', fontSize: '9.5px' }}>Date: {docDate}</p>
        </div>
      </div>

      {/* CUSTOMER & STAFF */}
      <div style={{ ...S.gridTwo, ...S.section }}>
        <div style={S.card}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>Customer Details (Seller)</p>
          <p style={{ margin: '2px 0' }}><strong>Name:</strong> {customer.name}</p>
          <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {customer.phone}</p>
          <p style={{ margin: '2px 0' }}><strong>Aadhaar:</strong> {customer.aadhaarNumber || '—'}</p>
          <p style={{ margin: '2px 0' }}><strong>PAN:</strong> {customer.panNumber || '—'}</p>
        </div>
        <div style={S.card}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>Processed By (Buyer)</p>
          <p style={{ margin: '2px 0' }}><strong>Staff Name:</strong> {staff?.name || '—'}</p>
          <p style={{ margin: '2px 0' }}><strong>Staff Phone:</strong> {staff?.phone || '—'}</p>
        </div>
      </div>

      {/* VALUATION TABLE */}
      <div style={S.section}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>Gold Valuation Summary</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: 'left' }}>Item</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Pre-Gross</th>
              {/* REMOVED: Pre-Purity Column */}
              <th style={{ ...S.th, textAlign: 'right' }}>Post-Gross</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Stone</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Dust</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Final Net</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Rate</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={S.td}>{it.name} <span style={{fontSize:'9px', color:'#6b7280'}}>({it.count} pcs)</span></td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.preEstimationGrossWeight).toFixed(2)}</td>
                {/* REMOVED: {it.preEstimationPurity || '—'} */}
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.grossWeight).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.stoneWeight).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.dustWeight).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{num(it.netWeight).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.ratePerGram).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{num(it.itemPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {/* Adjusted colSpan from 3 to 2 */}
              <td colSpan="2" style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{totalGross.toFixed(2)}</td>
              <td colSpan="2" style={S.td}></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{totalNet.toFixed(2)}</td>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>₹ {finalOffer.toFixed(2)}</td>
            </tr>
            <tr>
              {/* Adjusted colSpan from 8 to 7 */}
              <td colSpan="7" style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#fef3c7' }}>NET PAYABLE TO CUSTOMER</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#fef3c7' }}>₹ {finalOffer.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* DECLARATION */}
      <div style={{ ...S.card, ...S.section, backgroundColor: '#f9fafb' }}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>Customer Declaration & Agreement</p>
        <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', lineHeight: 1.4 }}>
          <li>I am the sole and lawful owner of the gold described above.</li>
          <li>The gold is not stolen, illegally acquired, or part of any dispute.</li>
          
          {/* UPDATED CLAUSE: Explicitly mentioning melting/burning */}
          <li>
            <strong>I understand and agree that the weights mentioned above are after initial cleaning. The gold will undergo further melting (burning) for final processing, and the final weight and purity may vary slightly. I agree to accept the final valuation based on the burnt weight.</strong>
          </li>
          
          <li>I have received the agreed estimated amount of ₹ {finalOffer.toFixed(2)} via {order.paymentMode || 'CASH'}.</li>
          <li>I agree to the final post-cleaning purity and weight assessed by Gold Centro.</li>
          <li>I indemnify Gold Centro against any future third-party claims regarding this gold.</li>
        </ol>
      </div>

      {/* SIGNATURES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '50px' }}></div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Customer Signature</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>{customer.name}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '50px' }}></div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Authorized Signatory</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>For Gold Centro ({order.branch?.name})</p>
          </div>
        </div>
      </div>
    </div>
  );
});
export default BranchPurchaseAgreement;