// app/components/BranchPurchaseAgreement.jsx
'use client';
import { forwardRef } from 'react';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

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
    pageBreakInside: 'avoid',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  row: { margin: '3px 0', display: 'flex' },
  label: { width: '180px', color: '#4b5563', flexShrink: 0 },
  value: { fontWeight: 600, color: '#111827', borderBottom: '1px dotted #9ca3af', flex: 1, paddingLeft: '4px' },
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
     orphans: 3, 
    widows: 3, 
  },
  li: { marginBottom: '6px',
        pageBreakInside: 'avoid',
   },
  
  signGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginTop: '30px',
    pageBreakInside: 'avoid',
  },
  signBox: {
    borderTop: '1px solid #111827',
    paddingTop: '4px',
    marginTop: '50px',
    textAlign: 'center',
  },
};

const BranchPurchaseAgreement = forwardRef(function BranchPurchaseAgreement({ order, staff, customer }, ref) {
  if (!order) return null;

  const items = order.items || [];
  const totalNet = items.reduce((s, i) => s + num(i.netWeight), 0);
  const totalGross = items.reduce((s, i) => s + num(i.grossWeight), 0);
  const finalOffer = num(order.finalPrice || order.agentOffer || order.estimatedTotal);
  
  const docDate = new Date(order.createdAt).toLocaleString('en-IN');
  const docNo = `GC/BA/${order.branch?.code || 'HO'}/${order.id.slice(-6).toUpperCase()}`;
  const linkedEstimate = `GC/EA/${order.branch?.code || 'HO'}/${order.id.slice(-6).toUpperCase()}`;

  return (
    <div ref={ref} id="purchase-agreement" style={S.page}>
      
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
              ബ്രാഞ്ച്: {order.branch?.name || 'ഹെഡ് ഓഫീസ്'} | കോഡ്: {order.branch?.code || 'HO'}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
            സ്വർണ്ണ വാങ്ങൽ കരാറും പേയ്‌മെന്റ് സമ്മതപത്രവും
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '10px' }}>
            <strong>തീയതിയും സമയവും:</strong> {docDate}
          </p>
        </div>
      </div>

      {/* ================= METADATA ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '12px' }}>
        <div><strong>വാങ്ങൽ കരാർ നമ്പർ:</strong> {docNo}</div>
        <div><strong>ബന്ധപ്പെട്ട എസ്റ്റിമേറ്റ് റഫറൻസ്:</strong> {linkedEstimate}</div>
      </div>

      {/* ================= SECTION A: COMPANY ================= */}
      <div style={S.sectionTitle}>എ. വാങ്ങുന്ന കമ്പനി</div>
      <div style={S.box}>
        <div style={S.row}><span style={S.label}>കമ്പനിയുടെ പേര്:</span> <span style={S.value}>ഗോൾഡ് സെൻട്രോ</span></div>
        <div style={S.row}><span style={S.label}>രജിസ്റ്റർ ചെയ്ത ഓഫീസ്:</span> <span style={S.value}>കല്യാണ കൃഷ്ണ സംസ്കൃതി ഭവൻ, തൃപ്പൂണിത്തുറ, കൊച്ചി</span></div>
        <div style={S.row}><span style={S.label}>ബ്രാഞ്ച് വിലാസം / കോഡ്:</span> <span style={S.value}>{order.branch?.name} ({order.branch?.code})</span></div>
      </div>

      {/* ================= SECTION B: SELLER ================= */}
      <div style={S.sectionTitle}>ബി. വിൽപ്പനക്കാരന്റെ വിവരങ്ങൾ</div>
      <div style={S.box}>
        <div style={S.gridTwo}>
          <div>
            <div style={S.row}><span style={S.label}>മുഴുവൻ പേര്:</span> <span style={S.value}>{customer?.name || '—'}</span></div>
            <div style={S.row}><span style={S.label}>മൊബൈൽ നമ്പർ:</span> <span style={S.value}>{customer?.phone || '—'}</span></div>
            <div style={S.row}><span style={S.label}>തിരിച്ചറിയൽ രേഖ:</span> <span style={S.value}>ആധാർ: {customer?.aadhaarNumber || '—'}</span></div>
          </div>
          <div>
            <div style={S.row}><span style={S.label}>പാൻ നമ്പർ:</span> <span style={S.value}>{customer?.panNumber || '—'}</span></div>
            <div style={S.row}><span style={S.label}>വിലാസം:</span> <span style={S.value}>__________________________________</span></div>
          </div>
        </div>
      </div>

      {/* ================= SECTION C: STAFF ================= */}
      <div style={S.sectionTitle}>സി. വാങ്ങുന്നയാൾ / പ്രോസസ്സിംഗ് സ്റ്റാഫിന്റെ വിവരങ്ങൾ</div>
      <div style={S.box}>
        <div style={S.gridTwo}>
          <div style={S.row}><span style={S.label}>സ്റ്റാഫിന്റെ പേര്:</span> <span style={S.value}>{staff?.name || '—'}</span></div>
          <div style={S.row}><span style={S.label}>ജീവനക്കാരന്റെ ഐഡി:</span> <span style={S.value}>{staff?.id?.slice(-6).toUpperCase() || '—'}</span></div>
        </div>
      </div>

      {/* ================= SECTION D: VALUATION ================= */}
      <div style={S.sectionTitle}>ഡി. അന്തിമ സ്വർണ്ണ മൂല്യനിർണ്ണയം</div>
      <table style={S.table}>
        <colgroup>
          <col style={{ width: '30px' }} />
          <col />
          <col style={{ width: '35px' }} />
          <col style={{ width: '55px' }} />
          <col style={{ width: '55px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: '45px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '70px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.th}>ക്രമ<br/>നമ്പർ</th>
            <th style={S.th}>ആഭരണം</th>
            <th style={S.th}>എണ്ണം</th>
            <th style={S.th}>യഥാർത്ഥ<br/>ഭാരം (g)</th>
            <th style={S.th}>അന്തിമ<br/>ഭാരം (g)</th>
            <th style={S.th}>കല്ല്/പൊടി<br/>കുറവ് (g)</th>
            <th style={S.th}>അന്തിമ<br/>ഭാരം (g)</th>
            <th style={S.th}>പ്യൂരിറ്റി</th>
            <th style={S.th}>നിരക്ക് (₹/g)</th>
            <th style={S.th}>തുക (₹)</th>
          </tr>
        </thead>
        <tbody style={{ pageBreakInside: 'avoid' }}>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td style={S.td}>{idx + 1}</td>
              <td style={{ ...S.td, textAlign: 'left', fontWeight: 600 }}>
                {it.name}
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 400 }}>({it.count} pcs)</div>
              </td>
              <td style={S.td}>{num(it.count, 1)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{num(it.preEstimationGrossWeight).toFixed(2)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{num(it.grossWeight).toFixed(2)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>
                {(num(it.stoneWeight) + num(it.dustWeight)).toFixed(2)}
              </td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{num(it.netWeight).toFixed(2)}</td>
              <td style={S.td}>{it.purity}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{num(it.ratePerGram).toFixed(2)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{num(it.itemPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6" style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#f3f4f6' }}>
              ആകെ അന്തിമ ഭാരം (Total Net)
            </td>
            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#f3f4f6' }}>
              {totalNet.toFixed(2)}
            </td>
            <td colSpan="2" style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#f3f4f6' }}>
              ആകെ വാങ്ങൽ തുക
            </td>
            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, backgroundColor: '#f3f4f6' }}>
              ₹ {finalOffer.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      
      <div style={{ ...S.box, fontSize: '10px', marginTop: '10px' }}>
        <strong>വിലയിരുത്തൽ / കുറവ് വിശദീകരണം:</strong> _________________________________________________________<br/><br/>
        <strong>തുക അക്ഷരത്തിൽ:</strong> __________________________________________________________________<br/><br/>
        <strong>പരിശോധനാ രീതി:</strong> ☐ XRF  ☐ ടച്ച്സ്റ്റോൺ  ☐ മറ്റുള്ളവ: _______________
      </div>

      {/* ================= SECTION E: DECLARATIONS ================= */}
      <div style={S.sectionTitle}>ഇ. വിൽപ്പനക്കാരന്റെ സത്യവാങ്മൂലങ്ങൾ, സ്ഥിരീകരണങ്ങൾ, സമ്മതം</div>
      <div style={S.box}>
        <ol style={S.ol}>
          <li style={S.li}>ഈ കരാറിൽ വിവരിച്ചിരിക്കുന്ന ആഭരണങ്ങളുടെ യഥാർത്ഥ ഉടമ ഞാനാണെന്നും, അവ കമ്പനിക്ക് വിൽക്കാനും കൈമാറാനും എനിക്ക് പൂർണ്ണ നിയമപരമായ അധികാരമുണ്ടെന്നും ഞാൻ പ്രഖ്യാപിക്കുന്നു.</li>
          <li style={S.li}>എന്റെ അറിവിൽ, ആഭരണങ്ങൾ മോഷ്ടിക്കപ്പെട്ടതോ, നിയമവിരുദ്ധമായി കൈവശപ്പെടുത്തിയതോ, പണയം വെച്ചതോ, അടവ് വെച്ചതോ, മറ്റൊരു വ്യക്തിയാൽ ഏൽപ്പിക്കപ്പെട്ടതോ, അല്ലെങ്കിൽ ഏതെങ്കിലും തർക്കത്തിന് വിധേയമായതോ അല്ലെന്ന് ഞാൻ സ്ഥിരീകരിക്കുന്നു.</li>
          <li style={S.li}>ആഭരണങ്ങളുടെ ഉടമസ്ഥത, ഉറവിടം, അവസ്ഥ എന്നിവയെക്കുറിച്ചുള്ള എല്ലാ വസ്തുതകളും ഞാൻ വെളിപ്പെടുത്തിയിട്ടുണ്ട്. ഞാൻ നൽകിയ വിവരങ്ങളും രേഖകളും സത്യവും കൃത്യവുമാണ്.</li>
          <li style={S.li}>ഡി വിഭാഗത്തിൽ രേഖപ്പെടുത്തിയിരിക്കുന്ന അന്തിമ പരിശോധിത പ്യൂരിറ്റി, അന്തിമ അറ്റ ഭാരം, ബാധകമായ കുറവുകൾ, ഗ്രാമിന് നിരക്ക്, ആകെ വാങ്ങൽ തുക എന്നിവ ഞാൻ അംഗീകരിക്കുന്നു.</li>
          <li style={S.li}>ഉരുക്കുന്നത്/കരിക്കുന്നത് പഴയ നിലയിലേക്ക് തിരിച്ചുകൊണ്ടുവരാൻ കഴിയാത്ത ഒരു പ്രക്രിയയാണെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു. അവ എനിക്ക് വിശദീകരിച്ചു നൽകുകയും ഞാൻ ആവശ്യമായ സമ്മതം നൽകുകയും ചെയ്തിട്ടുണ്ട്.</li>
          <li style={S.li}>ഈ വിൽപ്പന സ്വമേധയാ ഉള്ളതാണെന്നും, ഒപ്പിടുന്നതിന് മുൻപ് ഈ കരാർ വായിക്കാനോ വിശദീകരിച്ചു കേൾക്കാനോ എനിക്ക് അവസരം ലഭിച്ചിട്ടുണ്ടെന്നും ഞാൻ സ്ഥിരീകരിക്കുന്നു.</li>
          <li style={S.li}>ഞാൻ നൽകിയ തെറ്റായ വിവരങ്ങൾ, ഉടമസ്ഥാവകാശത്തിലെ വീഴ്ചകൾ, അല്ലെങ്കിൽ മൂന്നാം കക്ഷി അവകാശവാദങ്ങൾ എന്നിവയിൽ നിന്ന് ഉണ്ടാകുന്ന എല്ലാ നഷ്ടങ്ങൾക്കും നിയമച്ചെലവുകൾക്കും കമ്പനിയെ നഷ്ടപരിഹാരം നൽകാൻ ഞാൻ ഇതിനാൽ സമ്മതിക്കുന്നു.</li>
        </ol>
      </div>

      {/* ================= SECTION F: PAYMENT ================= */}
      <div style={S.sectionTitle}>എഫ്. പേയ്‌മെന്റ് അംഗീകാരം</div>
      <div style={S.box}>
        <div style={S.gridTwo}>
          <div style={S.row}><span style={S.label}>പേയ്‌മെന്റ് രീതി:</span> <span style={S.value}>☐ ബാങ്ക് ട്രാൻസ്ഫർ  ☐ UPI  ☐ ചെക്ക്  ☐ ക്യാഷ്</span></div>
          <div style={S.row}><span style={S.label}>തീയതിയും സമയവും:</span> <span style={S.value}>_____________________</span></div>
          <div style={S.row}><span style={S.label}>ബാങ്ക് / UTR വിവരങ്ങൾ:</span> <span style={S.value}>_____________________</span></div>
          <div style={S.row}><span style={S.label}>നൽകിയ തുക:</span> <span style={S.value}>₹ {finalOffer.toFixed(2)}</span></div>
        </div>
        <p style={{ marginTop: '10px', fontSize: '9.5px', color: '#4b5563' }}>
          വിൽപ്പനക്കാരന്റെ അംഗീകാരം: മുകളിൽ രേഖപ്പെടുത്തിയ തുക ഞാൻ സ്വീകരിച്ചു. ചെക്ക് അല്ലെങ്കിൽ ഇലക്ട്രോണിക് ട്രാൻസ്ഫർ വഴിയുള്ള പേയ്‌മെന്റുകൾ യഥാർത്ഥത്തിൽ ക്രെഡിറ്റ് ആകുന്നതിന് വിധേയമായിരിക്കും.
        </p>
      </div>

      {/* ================= SECTION G: SIGNATURES ================= */}
      <div style={S.sectionTitle}>ജി. ഒപ്പുകൾ</div>
      <div style={{ ...S.box, borderBottom: 'none', paddingBottom: '0' }}>
        <div style={S.signGrid}>
          <div>
            <div style={S.signBox}>
              <p style={{ margin: 0, fontWeight: 700 }}>വിൽപ്പനക്കാരന്റെ ഒപ്പ് / വിരലടയാളം</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px' }}>പേര്: {customer?.name || '—'}</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px' }}>തീയതി: __________________</p>
            </div>
          </div>
          <div>
            <div style={S.signBox}>
              <p style={{ margin: 0, fontWeight: 700 }}>കമ്പനിയുടെ അധികാരപ്പെട്ട ഒപ്പ്</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px' }}>പേര്: {staff?.name || '—'}</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px' }}>ബ്രാഞ്ച് സീൽ സഹിതം</p>
            </div>
          </div>
        </div>
        
        {/* Witnesses */}
        <div style={{ ...S.signGrid, marginTop: '20px' }}>
          <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '10px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700 }}>സാക്ഷി 1 (ഓപ്ഷണൽ)</p>
            <p style={{ margin: '4px 0 0', fontSize: '10px' }}>പേര്: __________________ ഒപ്പ്: __________________</p>
          </div>
          <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '10px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700 }}>സാക്ഷി 2 (ഓപ്ഷണൽ)</p>
            <p style={{ margin: '4px 0 0', fontSize: '10px' }}>പേര്: __________________ ഒപ്പ്: __________________</p>
          </div>
        </div>
      </div>

      {/* ================= SECTION H: RECORDS ================= */}
      <div style={S.sectionTitle}>എച്ച്. കമ്പനി രേഖകൾ / അറ്റാച്ചുമെന്റുകൾ</div>
      <div style={{ ...S.box, fontSize: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <span>☐ KYC രേഖ</span>
          <span>☐ ആഭരണങ്ങളുടെ ഫോട്ടോകൾ</span>
          <span>☐ ടെസ്റ്റിംഗ്/അസ്സേ റെക്കോർഡ്</span>
          <span>☐ എസ്റ്റിമേറ്റ് ഫോം</span>
          <span>☐ പേയ്‌മെന്റ് തെളിവ്</span>
          <span>☐ മറ്റുള്ളവ: ___________</span>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: '8.5px', color: '#9ca3af', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
        ഇത് കമ്പ്യൂട്ടർ ഉപയോഗിച്ച് തയ്യാറാക്കിയ ഒരു ഔദ്യോഗിക രേഖയാണ്. തയ്യാറാക്കിയത്: {new Date().toLocaleString('en-IN')}.
      </div>

    </div>
  );
});

export default BranchPurchaseAgreement;