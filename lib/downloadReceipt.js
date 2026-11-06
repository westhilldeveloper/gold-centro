import html2pdf from 'html2pdf.js';

// Convert lab(), oklch(), oklab(), lch() colors to rgb() via a temp element
function sanitizeColors(root) {
  const els = [root, ...root.querySelectorAll('*')];
  els.forEach((el) => {
    const style = el.getAttribute('style');
    if (!style) return;
    // Strip any modern color functions that html2canvas can't parse
    el.setAttribute(
      'style',
      style
        .replace(/lab\([^)]*\)/gi, '#000000')
        .replace(/oklch\([^)]*\)/gi, '#000000')
        .replace(/oklab\([^)]*\)/gi, '#000000')
        .replace(/lch\([^)]*\)/gi, '#000000')
    );
  });
}

export async function downloadReceipt(elementId, filename = 'receipt.pdf') {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Receipt element not found');

  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) sanitizeColors(clonedEl);
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  await html2pdf().from(element).set(opt).save();
}