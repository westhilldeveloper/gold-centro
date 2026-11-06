'use client';

export async function downloadPostEstimation(element, order) {
  if (!element || !order) throw new Error('Missing element or order');

  // Dynamic import so html2pdf only ships in the client bundle
  const html2pdf = (await import('html2pdf.js')).default;

  const filename = `post-estimation-${order.id.slice(-8).toUpperCase()}.pdf`;

  await html2pdf()
    .set({
  margin: [10, 10, 12, 10],          // was [8, 8, 12, 8]
  filename,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    letterRendering: true,
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break', 'tr'] },
})
    .from(element)
    .save();

  return filename;
}