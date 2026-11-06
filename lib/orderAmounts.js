// D:\gold-centro\lib\orderAmounts.js

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Distributes the gap between raw item totals and the final offer
 * proportionally across items so that the sum of item amounts exactly
 * equals the final offer. This bakes the service charge into each item
 * and lets documents hide the separate service-charge row.
 *
 * Works for a single item (full charge on that item) or many items
 * (weighted by each item's raw value).
 */
export function computeAdjustedItems(order) {
  const items = order?.items || [];

  const rawSubtotal = items.reduce(
    (s, i) => s + (num(i.itemPrice) || num(i.netWeight) * num(i.ratePerGram)),
    0
  );

  const finalOffer = num(
    order?.finalPrice ||
      order?.agentOffer ||
      order?.adminOffer ||
      order?.estimatedTotal
  );

  const totalAdjustment = rawSubtotal - finalOffer;

  const rows = items.map((it) => {
    const net = num(it.netWeight);
    const rate = num(it.ratePerGram);
    const rawAmount = num(it.itemPrice) || net * rate;
    const share =
      rawSubtotal > 0 ? (rawAmount / rawSubtotal) * totalAdjustment : 0;

    return {
      ...it,
      netWeight: net,
      ratePerGram: rate,
      rawAmount,
      adjustedAmount: rawAmount - share,
    };
  });

  const adjustedSubtotal = rows.reduce((s, r) => s + r.adjustedAmount, 0);

  return {
    items: rows,
    rawSubtotal,
    finalOffer,
    totalAdjustment,
    adjustedSubtotal,
  };
}