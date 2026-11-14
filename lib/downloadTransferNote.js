// D:\gold-centro\lib\downloadHandoverSheet.js

export async function downloadTransferNote(element, movement) {
  if (!element || !movement) throw new Error('Missing element or movement');

  const html2pdf = (await import('html2pdf.js')).default;

  const filename = `Handover-${movement.id.slice(-8).toUpperCase()}.pdf`;

  await html2pdf()
    .set({
      margin: [10, 8, 12, 8],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        letterRendering: true,
        windowWidth: 720,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.no-break'] },
    })
    .from(element)
    .save();

  return filename;
}