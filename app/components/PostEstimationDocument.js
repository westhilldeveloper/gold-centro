'use client';

import { forwardRef } from 'react';

// Safe number coercion
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ---------- shared inline style tokens ---------- */
const S = {
  page: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    maxWidth: '700px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '11px',
    lineHeight: 1.45,
    padding: '4px',
    boxSizing: 'border-box',
  },
  section: { marginBottom: '14px' },
  card: {
    border: '1px solid #111827',
    padding: '8px 10px',
    boxSizing: 'border-box',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: { color: '#374151' },
  strong: { fontWeight: 700, color: '#111827' },
  row: { margin: '2px 0' },
  table: {
    width: '100%',
    maxWidth: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  th: {
    border: '1px solid #111827',
    padding: '6px 5px',
    fontSize: '10.5px',
    fontWeight: 700,
    backgroundColor: '#f3f4f6',
    color: '#111827',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
  },
  td: {
    border: '1px solid #111827',
    padding: '5px 5px',
    fontSize: '10.5px',
    color: '#111827',
    verticalAlign: 'top',
    boxSizing: 'border-box',
  },
  clause: {
    border: '1px solid #111827',
    padding: '10px 12px',
    marginBottom: '14px',
  },
  ol: {
    margin: 0,
    paddingLeft: '18px',
    listStyleType: 'decimal',
    listStylePosition: 'outside',
  },
  li: { marginBottom: '4px', paddingLeft: '2px' },
  signBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    marginTop: '40px',
    pageBreakInside: 'avoid',
  },
  signLine: {
    borderTop: '1px solid #111827',
    paddingTop: '6px',
    textAlign: 'center',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '9px',
    color: '#9ca3af',
    marginTop: '24px',
  },
};

const PostEstimationDocument = forwardRef(function PostEstimationDocument(
  { order, forcePledged },
  ref
) {
  if (!order) return null;

  const items = order.items || [];

  const isPledged =
    typeof forcePledged === 'boolean' ? forcePledged : !!order.isPledged;

  const totalGross = items.reduce((s, i) => s + num(i.grossWeight), 0);
  const totalNet = items.reduce((s, i) => s + num(i.netWeight), 0);

  // Raw (market) subtotal — before adjustment
  const rawSubtotal = items.reduce(
    (s, i) => s + (num(i.itemPrice) || num(i.netWeight) * num(i.ratePerGram)),
    0
  );

  // Final price the customer actually receives
  const finalOffer = num(
    order.finalPrice ||
      order.agentOffer ||
      order.adminOffer ||
      order.estimatedTotal
  );

  // The gap to distribute across items (service charge + any manual override)
  const totalAdjustment = rawSubtotal - finalOffer;

  // Build per-item rows with the adjustment baked into each amount
  const itemRows = items.map((it) => {
    const net = num(it.netWeight);
    const rate = num(it.ratePerGram);
    const rawAmount = num(it.itemPrice) || net * rate;

    // Share of adjustment proportional to this item's raw value
    const share =
      rawSubtotal > 0 ? (rawAmount / rawSubtotal) * totalAdjustment : 0;

    return {
      id: it.id,
      name: it.name || 'Other',
      purity: it.purity,
      count: num(it.count, 1),
      grossWeight: num(it.grossWeight),
      net,
      rate,
      amount: rawAmount - share,
    };
  });

  // Sum of adjusted amounts — equals finalOffer by construction
  const adjustedSubtotal = itemRows.reduce((s, r) => s + r.amount, 0);

  const branchCode = order.branch?.code || 'HO';
  const docDate = new Date(order.updatedAt || order.createdAt).toLocaleDateString(
    'en-IN',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
  const docNo = `GC/PE/${branchCode}/${order.id.slice(-6).toUpperCase()}`;
  const orderShort = order.id.slice(-8).toUpperCase();

  return (
    <div ref={ref} id="post-estimation-document" style={S.page}>
      {/* ================= HEADER ================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          marginBottom: '14px',
          borderBottom: '2px solid #111827',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/images/gcentro_logo.png"
            alt="Gold Centro"
            crossOrigin="anonymous"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                color: '#111827',
              }}
            >
              Gold Centro
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '9.5px',
                lineHeight: 1.35,
                color: '#374151',
              }}
            >
              Kalyana Krishna Smskrithibhavan,
              <br />
              BHS Rd, Kannankulangara,
              <br />
              Thrippunithura, Kochi, Kerala 682301
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', color: '#111827', flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.4px',
            }}
          >
            POST-ESTIMATION DECLARATION
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '9.5px' }}>
            GSTIN: GSTABC123321456
          </p>
          <p style={{ margin: '1px 0 0', fontSize: '9.5px' }}>PAN: NA</p>
        </div>
      </div>

      {/* ================= BRANCH / DOC DETAILS ================= */}
      <div style={{ ...S.gridTwo, ...S.section }}>
        <div style={S.card}>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Branch Details
          </p>
          <p style={S.row}>
            <span style={S.label}>Branch: </span>
            <span style={S.strong}>{order.branch?.name || 'Head Office'}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Code: </span>
            <span style={S.strong}>{branchCode}</span>
          </p>
          {order.branch?.phone && (
            <p style={S.row}>
              <span style={S.label}>Phone: </span>
              <span>{order.branch.phone}</span>
            </p>
          )}
        </div>

        <div style={S.card}>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Document Details
          </p>
          <p style={S.row}>
            <span style={S.label}>Date: </span>
            <span style={S.strong}>{docDate}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Doc #: </span>
            <span style={S.strong}>{docNo}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Order #: </span>
            <span style={S.strong}>{orderShort}</span>
          </p>
        </div>
      </div>

      {/* ================= CUSTOMER ================= */}
      <div style={{ ...S.card, ...S.section }}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>
          Customer / Declarant
        </p>
        <p style={S.row}>
          <span style={S.label}>Name: </span>
          <span style={S.strong}>{order.customer?.name || '—'}</span>
        </p>
        <p style={S.row}>
          <span style={S.label}>Mobile: </span>
          <span>{order.customer?.phone || '—'}</span>
        </p>
        {order.customer?.aadhaarNumber && (
          <p style={S.row}>
            <span style={S.label}>Aadhaar: </span>
            <span>{order.customer.aadhaarNumber}</span>
          </p>
        )}
        {order.customer?.panNumber && (
          <p style={S.row}>
            <span style={S.label}>PAN: </span>
            <span>{order.customer.panNumber}</span>
          </p>
        )}
      </div>

      {/* ================= PLEDGE BLOCK ================= */}
      {isPledged && (
        <div
          style={{
            ...S.card,
            ...S.section,
            backgroundColor: '#fef2f2',
            borderColor: '#991b1b',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#991b1b',
            }}
          >
            Pledged Gold Details
          </p>
          <p style={S.row}>
            <span style={S.label}>Bank / NBFC Name: </span>
            <span style={S.strong}>{order.pledgeBankName || '—'}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Loan / Pledge A/c No.: </span>
            <span style={S.strong}>{order.pledgeLoanAccountNo || '—'}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Outstanding Dues Paid by Gold Centro: </span>
            <span style={S.strong}>
              ₹ {num(order.pledgeOutstandingAmount).toFixed(2)}
            </span>
          </p>
        </div>
      )}

      {/* ================= ITEMS TABLE ================= */}
      <div style={S.section}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700 }}>
          Valuation Summary
        </p>

         <table style={S.table}>
          <colgroup>
            {/* ✅ UPDATED: slightly wider to fit "SL No" */}
            <col style={{ width: '36px' }} />
            <col />
            <col style={{ width: '48px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '92px' }} />
          </colgroup>
          <thead>
            <tr>
              {/* ✅ UPDATED: changed '#' to 'SL No' */}
              <th style={{ ...S.th, textAlign: 'center' }}>SL No</th>
              <th style={{ ...S.th, textAlign: 'left' }}>Item</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Count</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Gross (g)</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Net (g)</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Rate (₹/g)</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {itemRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...S.td,
                    textAlign: 'center',
                    fontStyle: 'italic',
                    padding: '12px 6px',
                    color: '#6b7280',
                  }}
                >
                  No items recorded
                </td>
              </tr>
            ) : (
              itemRows.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                    {it.purity && (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '9.5px',
                          color: '#6b7280',
                        }}
                      >
                        ({it.purity})
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {it.count}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {it.grossWeight.toFixed(2)}
                  </td>
                  <td
                    style={{
                      ...S.td,
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {it.net.toFixed(2)}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {it.rate.toFixed(2)}
                  </td>
                  <td
                    style={{
                      ...S.td,
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {it.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            {/* Totals row */}
            <tr>
              <td
                colSpan={3}
                style={{
                  ...S.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  backgroundColor: '#f3f4f6',
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  ...S.td,
                  textAlign: 'right',
                  backgroundColor: '#f3f4f6',
                }}
              >
                {totalGross.toFixed(2)}
              </td>
              <td
                style={{
                  ...S.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  backgroundColor: '#f3f4f6',
                }}
              >
                {totalNet.toFixed(2)}
              </td>
              <td
                style={{
                  ...S.td,
                  textAlign: 'right',
                  backgroundColor: '#f3f4f6',
                }}
              >
                —
              </td>
              <td
                style={{
                  ...S.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  backgroundColor: '#f3f4f6',
                }}
              >
                ₹ {adjustedSubtotal.toFixed(2)}
              </td>
            </tr>

            {/* Net Offer */}
            <tr>
              <td
                colSpan={6}
                style={{
                  ...S.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  backgroundColor: '#fef3c7',
                  fontSize: '11.5px',
                }}
              >
                NET OFFER
              </td>
              <td
                style={{
                  ...S.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  backgroundColor: '#fef3c7',
                  fontSize: '11.5px',
                }}
              >
                ₹ {finalOffer.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ================= CLAUSES ================= */}
      {isPledged ? <PledgeClauses order={order} /> : <OwnershipClauses order={order} />}

      {/* ================= SIGNATURES ================= */}
      <div style={S.signBox}>
        <div>
          <div style={{ height: '48px' }} />
          <div style={S.signLine}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700 }}>
              Authorized Signature
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '9.5px',
                color: '#6b7280',
              }}
            >
              For Gold Centro
            </p>
          </div>
        </div>
        <div>
          <div style={{ height: '48px' }} />
          <div style={S.signLine}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700 }}>
              Customer / Declarant Signature
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '9.5px',
                color: '#6b7280',
              }}
            >
              {order.customer?.name || ''}
            </p>
          </div>
        </div>
      </div>

      <p style={S.footerNote}>
        This is a computer-generated document. Generated on{' '}
        {new Date().toLocaleString('en-IN')}
      </p>
    </div>
  );
});

/* ----------------------------------------------------------
   PLEDGED gold — full release declaration clauses
   ---------------------------------------------------------- */
function PledgeClauses({ order }) {
  return (
    <div style={S.clause}>
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '12px',
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.4px',
        }}
      >
        POST-ESTIMATION PLEDGE-RELEASE DECLARATION
      </p>

      <ol style={S.ol}>
        <li style={S.li}>
          The jewellery described above has been pledged by me with the Bank/NBFC
          named in the &quot;Pledged Gold Details&quot; section. I request Gold
          Centro to assist in releasing the pledged gold by paying the
          outstanding dues directly to the Bank/NBFC.
        </li>
        <li style={S.li}>
          I am the sole and lawful owner of the pledged jewellery. I have
          produced original invoices/bills for the jewellery, and Gold Centro
          may rely on them for verification.
        </li>
        <li style={S.li}>
          The jewellery is not stolen, illegally acquired, or part of any
          financial or criminal dispute.
        </li>
        <li style={S.li}>
          Except the disclosed pledge, there are no other liens, claims, or
          encumbrances on the jewellery.
        </li>
        <li style={S.li}>I indemnify Gold Centro from all third-party claims.</li>
        <li style={S.li}>
          I irrevocably authorise Gold Centro to:
          <br />
          (a) obtain all loan and pledge details from the Bank/NBFC;
          <br />
          (b) make payment directly to the Bank/NBFC for release of the
          jewellery;
          <br />
          (c) collect the jewellery on my behalf.
        </li>
        <li style={S.li}>
          Once Gold Centro pays the Bank/NBFC, it becomes immediately entitled
          to the released jewellery.
        </li>
        <li style={S.li}>
          If the Bank/NBFC hands the jewellery to me instead, I shall hold it
          only as trustee/agent for Gold Centro and must hand it over
          immediately without objection.
        </li>
        <li style={S.li}>
          Any diversion, refusal, or withholding of the jewellery may amount to
          criminal breach of trust, cheating, or misappropriation under
          applicable law.
        </li>
        <li style={S.li}>
          I understand that the purity or weight mentioned in the pledge card
          is only indicative and not binding on Gold Centro.
        </li>
        <li style={S.li}>
          Gold Centro will conduct its own testing (XRF Machine) and decide
          valuation strictly on:
          <br />
          (a) purity as assessed by Gold Centro;
          <br />
          (b) net gold weight after deduction of stones/beads.
        </li>
        <li style={S.li}>
          I irrevocably waive all claims arising from differences between bank
          valuation and Gold Centro valuation.
        </li>
        <li style={S.li}>
          I authorise Gold Centro to remove stones/beads from the jewellery, or
          estimate their weight if removal is not possible. I accept all
          resulting differences in valuation.
        </li>
        <li style={S.li}>
          Gold Centro may photograph, video-record, or document the release,
          testing, and valuation process, and such recordings may be relied
          upon as evidence.
        </li>
        <li style={S.li}>
          I declare that the pledged jewellery is not fake, plated, or
          adulterated.
        </li>
        <li style={S.li}>
          If any jewellery is later found to be counterfeit:
          <br />
          (a) I shall refund Gold Centro the full amount paid to the Bank/NBFC
          and any amount paid to me;
          <br />
          (b) and indemnify Gold Centro for all losses, costs, and legal
          expenses.
        </li>
        <li style={S.li}>
          After valuation:
          <br />
          (a) Gold Centro will first adjust the amount it paid to the Bank/NBFC
          plus its service charges;
          <br />
          (b) any surplus will be remitted to my bank account.
        </li>
        <li style={S.li}>
          If the final assessed purchase value is less than the amount paid by
          Gold Centro to the Bank/NBFC, I shall immediately repay the deficit
          to Gold Centro on demand.
        </li>
        <li style={S.li}>
          I authorise Gold Centro to verify my identity and particulars with
          issuing authorities, banks, credit bureaus, or other agencies.
        </li>
        <li style={S.li}>
          I also permit Gold Centro to contact the following relatives if I am
          unreachable or in default:
          <br />
          Immediate Relative 1: __________________ Mobile: __________________
          <br />
          Immediate Relative 2: __________________ Mobile: __________________
        </li>
        <li style={S.li}>
          I agree to indemnify Gold Centro and its officers against all losses,
          damages, claims, liabilities, or expenses arising from:
          <br />
          (a) false statements made by me;
          <br />
          (b) breach of this declaration;
          <br />
          (c) discrepancies in pledged jewellery;
          <br />
          (d) third-party claims or criminal/financial disputes relating to the
          jewellery.
        </li>
        <li style={S.li}>
          This declaration shall be governed by Indian law. The courts at
          Ernakulam shall have exclusive jurisdiction.
        </li>
        <li style={S.li}>
          I have fully read and understood this declaration, and I am signing
          it voluntarily.
        </li>
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------
   NON-PLEDGED gold — ownership declaration
   ---------------------------------------------------------- */
function OwnershipClauses({ order }) {
  return (
    <div style={S.clause}>
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '12px',
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.4px',
        }}
      >
        POST-ESTIMATION DECLARATION OF OWNERSHIP
      </p>

      <ol style={S.ol}>
        <li style={S.li}>
          I am the sole and lawful owner of the gold jewellery described in the
          valuation summary above.
        </li>
        <li style={S.li}>
          The jewellery is not stolen, illegally acquired, or part of any
          financial or criminal dispute.
        </li>
        <li style={S.li}>
          There are no liens, claims, or encumbrances on the jewellery.
        </li>
        <li style={S.li}>I indemnify Gold Centro from all third-party claims.</li>
        <li style={S.li}>
          I declare that the jewellery is not fake, plated, or adulterated.
        </li>
        <li style={S.li}>
          If any jewellery is later found to be counterfeit, I shall refund the
          full amount paid by Gold Centro and indemnify Gold Centro for all
          losses, costs, and legal expenses.
        </li>
        <li style={S.li}>
          I understand that the purity and weight used for valuation are based
          on Gold Centro&apos;s own XRF testing and net weight calculation after
          deduction of stones/beads.
        </li>
        <li style={S.li}>
          I authorise Gold Centro to remove stones/beads from the jewellery, or
          estimate their weight if removal is not possible. I accept all
          resulting differences in valuation.
        </li>
        <li style={S.li}>
          Gold Centro may photograph, video-record, or document the testing and
          valuation process, and such recordings may be relied upon as evidence.
        </li>
        <li style={S.li}>
          I irrevocably authorise Gold Centro to make payment for the jewellery
          as per the accepted offer, and confirm that I have received the
          agreed consideration.
        </li>
        <li style={S.li}>
          I authorise Gold Centro to verify my identity and particulars with
          issuing authorities, banks, or other agencies.
        </li>
        <li style={S.li}>
          I agree to indemnify Gold Centro and its officers against all losses,
          damages, claims, liabilities, or expenses arising from false
          statements made by me or breach of this declaration.
        </li>
        <li style={S.li}>
          This declaration shall be governed by Indian law. The courts at
          Ernakulam shall have exclusive jurisdiction.
        </li>
        <li style={S.li}>
          I have fully read and understood this declaration, and I am signing
          it voluntarily.
        </li>
      </ol>
    </div>
  );
}

export default PostEstimationDocument;