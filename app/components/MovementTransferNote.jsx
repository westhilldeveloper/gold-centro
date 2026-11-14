'use client';

import { forwardRef } from 'react';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const S = {
  page: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    maxWidth: '700px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '11px',
    lineHeight: 1.4,
    padding: '4px',
    boxSizing: 'border-box',
  },
  section: { marginBottom: '12px' },
  card: {
    border: '1px solid #111827',
    padding: '8px 10px',
    boxSizing: 'border-box',
  },
  gridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  gridThree: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
  },
  label: { color: '#6b7280', fontSize: '10px' },
  strong: { fontWeight: 700, color: '#111827' },
  row: { margin: '3px 0' },
  th: {
    border: '1px solid #111827',
    padding: '5px 5px',
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: '#f3f4f6',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
  },
  td: {
    border: '1px solid #111827',
    padding: '4px 5px',
    fontSize: '10px',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    boxSizing: 'border-box',
  },
  signBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '30px',
    marginTop: '40px',
    pageBreakInside: 'avoid',
  },
  signLine: {
    borderTop: '1px solid #111827',
    paddingTop: '5px',
    textAlign: 'center',
    fontSize: '10px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '8.5px',
    color: '#9ca3af',
    marginTop: '20px',
  },
};

const MovementHandoverSheet = forwardRef(function MovementHandoverSheet(
  { movement, items = [] },
  ref
) {
  if (!movement) return null;

  const fromBranch = movement.fromBranch;
  const toBranch = movement.toBranch;

  const totalNet = items.reduce((s, i) => s + num(i.netWeight), 0);
  const totalGross = items.reduce((s, i) => s + num(i.grossWeight), 0);
  const totalPieces = items.reduce((s, i) => s + num(i.count, 1), 0);

  const date = new Date(movement.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sheetNo = `GC/HO/${(fromBranch?.code || 'HO')}/${movement.id
    .slice(-6)
    .toUpperCase()}`;

  return (
    <div ref={ref} id="handover-sheet" style={S.page}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          marginBottom: '12px',
          borderBottom: '2px solid #111827',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/images/gcentro_logo.png"
            alt="Gold Centro"
            crossOrigin="anonymous"
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Gold Centro
            </h1>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '9px',
                lineHeight: 1.3,
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
        <div style={{ textAlign: 'right', color: '#111827' }}>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.4px',
            }}
          >
            GOLD TRANSFER — HANDOVER SHEET
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '9px' }}>
            GSTIN: GSTABC123321456
          </p>
          <p style={{ margin: '1px 0 0', fontSize: '9px' }}>PAN: NA</p>
        </div>
      </div>

      {/* DOC INFO + ROUTE */}
      <div style={{ ...S.gridTwo, ...S.section }}>
        <div style={S.card}>
          <p
            style={{
              margin: '0 0 5px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            Sheet Details
          </p>
          <p style={S.row}>
            <span style={S.label}>Sheet #: </span>
            <span style={S.strong}>{sheetNo}</span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Movement #: </span>
            <span style={S.strong}>
              {movement.id.slice(-8).toUpperCase()}
            </span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Date: </span>
            <span style={S.strong}>{date}</span>
          </p>
          {movement.reference && (
            <p style={S.row}>
              <span style={S.label}>Reference: </span>
              <span>{movement.reference}</span>
            </p>
          )}
        </div>
        <div style={S.card}>
          <p
            style={{
              margin: '0 0 5px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            Route
          </p>
          <p style={S.row}>
            <span style={S.label}>From: </span>
            <span style={S.strong}>
              {fromBranch?.name || '—'}{' '}
              {fromBranch?.code ? `(${fromBranch.code})` : ''}
            </span>
          </p>
          <p style={S.row}>
            <span style={S.label}>To: </span>
            <span style={S.strong}>
              {toBranch?.name || '—'}{' '}
              {toBranch?.code ? `(${toBranch.code})` : ''}
            </span>
          </p>
          <p style={S.row}>
            <span style={S.label}>Total weight: </span>
            <span style={S.strong}>{totalNet.toFixed(2)} g</span>
          </p>
        </div>
      </div>

      {/* PEOPLE CHAIN */}
      <div style={{ ...S.gridThree, ...S.section }}>
        <div style={S.card}>
          <p
            style={{
              margin: '0 0 5px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            Handed over by
          </p>
          <p style={{ ...S.row, fontWeight: 700 }}>
            {movement.handedOverByName || '—'}
          </p>
          {movement.handedOverByPhone && (
            <p style={S.row}>
              <span style={S.label}>Ph: </span>
              <span>{movement.handedOverByPhone}</span>
            </p>
          )}
        </div>
        <div
          style={{
            ...S.card,
            backgroundColor: '#fffbeb',
            borderColor: '#b45309',
          }}
        >
          <p
            style={{
              margin: '0 0 5px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#b45309',
            }}
          >
            Carrier
          </p>
          <p style={{ ...S.row, fontWeight: 700 }}>
            {movement.carrierName || '—'}
          </p>
          {movement.carrierType && (
            <p style={S.row}>
              <span style={S.label}>Role: </span>
              <span>{movement.carrierType}</span>
            </p>
          )}
          {movement.carrierPhone && (
            <p style={S.row}>
              <span style={S.label}>Ph: </span>
              <span>{movement.carrierPhone}</span>
            </p>
          )}
        </div>
        <div
          style={{
            ...S.card,
            backgroundColor: '#ecfdf5',
            borderColor: '#065f46',
          }}
        >
          <p
            style={{
              margin: '0 0 5px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#065f46',
            }}
          >
            Received by
          </p>
          <p style={{ ...S.row, fontWeight: 700 }}>
            {movement.receivedByName || '____________________'}
          </p>
          {movement.receivedAt ? (
            <p style={S.row}>
              <span style={S.label}>At: </span>
              <span>
                {new Date(movement.receivedAt).toLocaleString('en-IN')}
              </span>
            </p>
          ) : (
            <p style={{ ...S.row, color: '#6b7280', fontStyle: 'italic' }}>
              (to be filled on receipt)
            </p>
          )}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={S.section}>
        <p style={{ margin: '0 0 5px', fontSize: '10px', fontWeight: 700 }}>
          Items being transferred ({items.length})
        </p>

        <table style={S.table}>
          <colgroup>
            <col style={{ width: '24px' }} />
            <col style={{ width: '52px' }} />
            <col />
            <col style={{ width: '46px' }} />
            <col style={{ width: '38px' }} />
            <col style={{ width: '58px' }} />
            <col style={{ width: '58px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: 'center' }}>#</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Photo</th>
              <th style={{ ...S.th, textAlign: 'left' }}>Item</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Gross g</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Cnt</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Stone g</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Dust g</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Net g</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...S.td,
                    textAlign: 'center',
                    fontStyle: 'italic',
                    padding: '12px 6px',
                    color: '#6b7280',
                  }}
                >
                  No items
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const img =
                  Array.isArray(it.imageUrls) && it.imageUrls.length > 0
                    ? it.imageUrls[0]
                    : null;
                return (
                  <tr key={it.id || idx}>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {idx + 1}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          crossOrigin="anonymous"
                          style={{
                            width: '44px',
                            height: '44px',
                            objectFit: 'cover',
                            display: 'inline-block',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            width: '44px',
                            height: '44px',
                            background: '#f3f4f6',
                            color: '#9ca3af',
                            fontSize: '8px',
                            lineHeight: '44px',
                            textAlign: 'center',
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 600 }}>
                        {it.name || '—'}
                      </span>
                      {it.purity && (
                        <span
                          style={{
                            marginLeft: '4px',
                            fontSize: '9px',
                            color: '#6b7280',
                          }}
                        >
                          ({it.purity})
                        </span>
                      )}
                      {it.order?.id && (
                        <div
                          style={{
                            fontSize: '8.5px',
                            color: '#6b7280',
                            marginTop: '1px',
                          }}
                        >
                          Order #{it.order.id.slice(-6)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {num(it.grossWeight).toFixed(2)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {num(it.count, 1)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {num(it.stoneWeight).toFixed(2)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {num(it.dustWeight).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...S.td,
                        textAlign: 'right',
                        fontWeight: 700,
                      }}
                    >
                      {num(it.netWeight).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <td
                colSpan={3}
                style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}
              >
                TOTAL
              </td>
              <td
                style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}
              >
                {totalGross.toFixed(2)}
              </td>
              <td
                style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}
              >
                {totalPieces}
              </td>
              <td style={S.td} colSpan={2} />
              <td
                style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}
              >
                {totalNet.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {movement.description && (
        <div style={{ ...S.card, ...S.section, backgroundColor: '#f9fafb' }}>
          <p style={{ margin: '0 0 3px', fontSize: '10px', fontWeight: 700 }}>
            Notes
          </p>
          <p style={{ margin: 0, fontSize: '10px' }}>{movement.description}</p>
        </div>
      )}

      {/* SIGNATURES */}
      <div style={S.signBox}>
        <div>
          <div style={{ height: '42px' }} />
          <div style={S.signLine}>
            <p style={{ margin: 0, fontWeight: 700 }}>Handed over by</p>
            <p style={{ margin: '1px 0 0', color: '#6b7280' }}>
              {movement.handedOverByName || ''}
            </p>
          </div>
        </div>
        <div>
          <div style={{ height: '42px' }} />
          <div style={S.signLine}>
            <p style={{ margin: 0, fontWeight: 700 }}>Carrier signature</p>
            <p style={{ margin: '1px 0 0', color: '#6b7280' }}>
              {movement.carrierName || ''}
            </p>
          </div>
        </div>
        <div>
          <div style={{ height: '42px' }} />
          <div style={S.signLine}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              Received by (branch)
            </p>
            <p style={{ margin: '1px 0 0', color: '#6b7280' }}>
              {movement.receivedByName || ''}
            </p>
          </div>
        </div>
      </div>

      <p style={S.footer}>
        This document must accompany the gold during transit. Please verify
        every item before signing. Retain for audit records.
      </p>
    </div>
  );
});

export default MovementHandoverSheet;