// app/components/EstimateAgreement.jsx
'use client';
import { forwardRef } from 'react';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ---------- shared inline style tokens ---------- */
const S = {
  page: {
    fontFamily: '"Noto Sans Malayalam", "Manjari", Arial, Helvetica, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '11px',
    lineHeight: 1.5,
    padding: '4px',
    boxSizing: 'border-box',
  },
  sectionTitle: {
    backgroundColor: '#e5e7eb',
    border: '1px solid #111827',
    borderBottom: 'none',
    padding: '4px 8px',
    fontWeight: 700,
    fontSize: '11px',
    marginTop: '12px',
  },
  box: {
    border: '1px solid #111827',
    padding: '8px 10px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  row: { margin: '3px 0', display: 'flex' },
  label: { width: '150px', color: '#4b5563', flexShrink: 0 },
  value: { fontWeight: 600, color: '#111827' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    boxSizing: 'border-box',
  },
  th: {
    border: '1px solid #111827',
    padding: '4px',
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: '#f3f4f6',
    color: '#111827',
    textAlign: 'center',
  },
  td: {
    border: '1px solid #111827',
    padding: '4px',
    fontSize: '9.5px',
    color: '#111827',
    verticalAlign: 'top',
    textAlign: 'center',
  },
  ol: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '10px',
    lineHeight: 1.6,
  },
  li: { marginBottom: '6px' },
  signGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginTop: '30px',
    pageBreakInside: 'avoid',
  },
  signLine: {
    borderTop: '1px solid #111827',
    paddingTop: '4px',
    marginTop: '40px',
    textAlign: 'center',
  },
};

const EstimateAgreement = forwardRef(function EstimateAgreement({ order, staff, customer }, ref) {
  if (!order) return null;

  const items = order.items || [];
  const docDate = new Date(order.createdAt).toLocaleString('en-IN');
  const totalEstimatedAmount = items.reduce((sum, item) => sum + num(item.itemPrice), 0);
  const branchCode = order.branch?.code || 'HO';
  const docNo = `GC/EA/${branchCode}/${order.id.slice(-6).toUpperCase()}`;
  const customerId = customer?.id ? customer.id.slice(-6).toUpperCase() : (order.customerId ? order.customerId.slice(-6).toUpperCase() : '—');

  return (
    <div ref={ref} style={S.page}>
      
      {/* ================= HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/images/gcentro_logo.png"
            alt="Gold Centro"
            crossOrigin="anonymous"
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
              ഗോൾഡ് സെൻട്രോ
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4b5563' }}>
              ബ്രാഞ്ച്: {order.branch?.name || 'ഹെഡ് ഓഫീസ്'} | കോഡ്: {branchCode}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
            പ്രാഥമിക മൂല്യനിർണ്ണയ കരാർ
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '10px' }}>
            <strong>തീയതിയും സമയവും:</strong> {docDate}
          </p>
        </div>
      </div>

      {/* ================= METADATA ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '12px' }}>
        <div><strong>എസ്റ്റിമേറ്റ് റഫറൻസ് നമ്പർ:</strong> {docNo}</div>
        <div><strong>കസ്റ്റമർ ഐഡി / KYC റഫറൻസ്:</strong> {customerId}</div>
      </div>

      {/* ================= SECTION A: CUSTOMER DETAILS ================= */}
      <div style={S.sectionTitle}>എ. ഉപഭോക്താവിന്റെ / വിൽപ്പനക്കാരന്റെ വിവരങ്ങൾ</div>
      <div style={S.box}>
        <div style={S.gridTwo}>
          <div>
            <div style={S.row}><span style={S.label}>മുഴുവൻ പേര്:</span> <span style={S.value}>{customer?.name || '—'}</span></div>
            <div style={S.row}><span style={S.label}>മൊബൈൽ നമ്പർ:</span> <span style={S.value}>{customer?.phone || '—'}</span></div>
          </div>
          <div>
            <div style={S.row}><span style={S.label}>ആധാർ നമ്പർ:</span> <span style={S.value}>{customer?.aadhaarNumber || '—'}</span></div>
            <div style={S.row}><span style={S.label}>പാൻ നമ്പർ:</span> <span style={S.value}>{customer?.panNumber || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* ================= SECTION B: GOLD DETAILS ================= */}
      <div style={S.sectionTitle}>ബി. സ്വർണ്ണാഭരണങ്ങളുടെ വിവരങ്ങൾ – പ്രാഥമിക മൂല്യനിർണ്ണയം</div>
      <table style={S.table}>
        <colgroup>
          <col style={{ width: '35px' }} />
          <col />
          <col style={{ width: '40px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '70px' }} />
          <col style={{ width: '75px' }} />
          <col style={{ width: '90px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.th}>ക്രമ<br/>നമ്പർ</th>
            <th style={S.th}>ആഭരണത്തിന്റെ വിവരണം</th>
            <th style={S.th}>എണ്ണം</th>
            <th style={S.th}>പ്യൂരിറ്റി<br/>മാർക്ക്</th>
            <th style={S.th}>മൊത്തം<br/>ഭാരം (g)</th>
            <th style={S.th}>എസ്റ്റിമേറ്റ്<br/>നിരക്ക് (₹/g)</th>
            <th style={S.th}>എസ്റ്റിമേറ്റ്<br/>തുക (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...S.td, textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                ആഭരണങ്ങളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല
              </td>
            </tr>
          ) : (
            items.map((it, idx) => (
              <tr key={it.id || idx}>
                <td style={S.td}>{idx + 1}</td>
                <td style={{ ...S.td, textAlign: 'left', fontWeight: 600 }}>{it.name}</td>
                <td style={S.td}>{num(it.count, 1)}</td>
                <td style={S.td}>{it.purity}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.preEstimationGrossWeight).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(it.ratePerGram).toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{num(it.itemPrice).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
        
        <tfoot>
          <tr>
            <td colSpan={4} style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#f3f4f6' }}>
              ആകെ എസ്റ്റിമേറ്റ് തുക (മൊത്തം)
            </td>
            <td style={{ ...S.td, backgroundColor: '#f3f4f6' }}>—</td>
            <td style={{ ...S.td, backgroundColor: '#f3f4f6' }}>—</td>
            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#fef3c7', fontSize: '11px' }}>
              ₹ {totalEstimatedAmount.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ================= SECTION C: DECLARATION ================= */}
      <div style={S.sectionTitle}>സി. ഉപഭോക്താവിന്റെ സത്യവാങ്മൂലവും സമ്മതവും</div>
      <div style={S.box}>
        <ol style={S.ol}>
          <li style={S.li}>ഈ ഫോമിൽ വിവരിച്ചിരിക്കുന്ന സ്വർണ്ണാഭരണങ്ങളുടെ യഥാർത്ഥ ഉടമ ഞാനാണെന്നും, അല്ലെങ്കിൽ യഥാർത്ഥ ഉടമയാൽ ശരിയായി അധികാരപ്പെടുത്തപ്പെട്ട വ്യക്തിയാണെന്നും ഞാൻ പ്രഖ്യാപിക്കുന്നു.</li>
          <li style={S.li}>എന്റെ അറിവിൽ, ആഭരണങ്ങൾ മോഷ്ടിക്കപ്പെട്ടതോ, നിയമവിരുദ്ധമായി കൈവശപ്പെടുത്തിയതോ, പണയം വെച്ചതോ, അടവ് വെച്ചതോ, അല്ലെങ്കിൽ ഏതെങ്കിലും തർക്കത്തിന് വിധേയമായതോ അല്ലെന്ന് ഞാൻ സ്ഥിരീകരിക്കുന്നു.</li>
          <li style={S.li}>മുകളിൽ രേഖപ്പെടുത്തിയിരിക്കുന്ന ഭാരം, പ്യൂരിറ്റി, നിരക്ക്, തുക എന്നിവ പ്രാഥമിക എസ്റ്റിമേറ്റുകൾ മാത്രമാണെന്നും അവ അന്തിമ ഓഫറോ സമ്പൂർണ്ണ വിൽപ്പനയോ അല്ലെന്നും ഞാൻ മനസ്സിലാക്കുന്നു.</li>
          <li style={S.li}>വിശദമായ പരിശോധനയ്ക്കും ക്ലീനിംഗിനും ശേഷം, കല്ലുകൾ/സ്വർണ്ണമല്ലാത്ത വസ്തുക്കൾ നീക്കം ചെയ്തതിന് ശേഷം, ആവശ്യമെങ്കിൽ മാത്രം ഉരുക്കി/കരിക്കുന്നതിലൂടെ അന്തിമ മൂല്യനിർണ്ണയം മാറിയേക്കാമെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു.</li>
          <li style={S.li}>ഉരുക്കുന്നത്/കരിക്കുന്നത് പഴയ നിലയിലേക്ക് തിരിച്ചുകൊണ്ടുവരാൻ കഴിയാത്ത ഒരു പ്രക്രിയയാണെന്ന് എന്നെ അറിയിച്ചിട്ടുണ്ട്. താഴെയുള്ള ബോക്സ് ടിക്ക് ചെയ്ത് ഒപ്പിട്ടാൽ മാത്രമേ ഈ പ്രക്രിയയ്ക്ക് ഞാൻ അറിഞ്ഞുള്ള സമ്മതം നൽകുന്നുള്ളൂ.</li>
        </ol>
        
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #9ca3af', fontSize: '10px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
            ഉരുക്കുന്നതിന്/കരിക്കുന്നതിനുള്ള പ്രത്യേക സമ്മതം (ഒന്ന് ടിക്ക് ചെയ്യുക):
          </p>
          <div style={{ display: 'flex', gap: '20px', fontSize: '11px', fontWeight: 600, marginBottom: '12px' }}>
            <span>☐ ഞാൻ സമ്മതിക്കുന്നു</span>
            <span>☐ ഞാൻ സമ്മതിക്കുന്നില്ല</span>
          </div>
          <p style={{ margin: 0, marginTop: '15px' }}>
            ഉരുക്കുന്നതിനുള്ള സമ്മതം സ്ഥിരീകരിച്ചുകൊണ്ട് ഉപഭോക്താവിന്റെ ഒപ്പ്/ഇനീഷ്യൽസ്: _____________________________
          </p>
        </div>
      </div>

      {/* ================= SECTION D: ACKNOWLEDGEMENT ================= */}
      <div style={S.sectionTitle}>ഡി. അംഗീകാരം (സ്വീകരണം)</div>
      <div style={{ ...S.box, fontSize: '9.5px', color: '#4b5563' }}>
        ഈ ഫോം പ്രാഥമിക എസ്റ്റിമേറ്റും ഉപഭോക്താവിന്റെ സമ്മതവും മാത്രമാണ് രേഖപ്പെടുത്തുന്നത്. ഇത് വാങ്ങൽ സംബന്ധമായ പണമിടപാടിന്റെ രസീതിയോ കമ്പനി ആഭരണങ്ങൾ വാങ്ങി എന്നതിന്റെ തെളിവോ അല്ല.
      </div>

      {/* ================= SIGNATURES ================= */}
      <div style={S.signGrid}>
        <div>
          <div style={S.signLine}>
            <p style={{ margin: 0, fontWeight: 700 }}>ഉപഭോക്താവിന്റെ ഒപ്പ് / വിരലടയാളം</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>പേര്: {customer?.name || '—'}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>തീയതി: __________________</p>
          </div>
        </div>
        <div>
          <div style={S.signLine}>
            <p style={{ margin: 0, fontWeight: 700 }}>അധികാരപ്പെട്ട ഒപ്പ് (Authorized Signatory)</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>ഗോൾഡ് സെൻട്രോയ്ക്ക് വേണ്ടി ({order.branch?.name || 'ഹെഡ് ഓഫീസ്'})</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>തീയതി: __________________</p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '8.5px', color: '#9ca3af', marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
        അകത്തെ കുറിപ്പ്: കമ്പനിയുടെ അനുവദിച്ച റെക്കോർഡ് സൂക്ഷിക്കൽ, സ്വകാര്യതാ നടപടിക്രമങ്ങൾക്കനുസൃതമായി ഇനങ്ങളുടെ ഫോട്ടോകളും ബന്ധപ്പെട്ട KYC/മൂല്യനിർണ്ണയ രേഖകളും അറ്റാച്ച് ചെയ്ത് സൂക്ഷിക്കുക. തയ്യാറാക്കിയത്: {new Date().toLocaleString('en-IN')}.
      </div>
    </div>
  );
});

export default EstimateAgreement;