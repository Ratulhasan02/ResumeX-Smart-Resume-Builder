/**
 * PDF Export & Print Module
 * Uses the browser's native print dialog and monitors 1-page overflow.
 */

import { resumeData } from './state.js';

export function initPdfExport() {
  const printBtn = document.getElementById('print-pdf-btn');

  if (printBtn) {
    printBtn.addEventListener('click', handleBrowserPrint);
  }
}

/**
 * Browser-native Print fallback using @media print
 */
export async function handleBrowserPrint() {
  // Update document title for the print dialog default filename
  const originalTitle = document.title;
  const candidateName = (resumeData.personal?.name || 'Resume').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  document.title = `${candidateName}_Resume`;

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  window.print();

  // Restore title
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

/**
 * Checks if the resume content exceeds 1 standard A4 page (approx 1122px at 96 DPI)
 * and displays an advice banner
 */
export function checkPageOverflow() {
  const preview = document.getElementById('resume-preview');
  const banner = document.getElementById('page-overflow-warning');
  if (!preview || !banner) return;

  // A4 is 297mm height ≈ 1122.5px at 96 DPI
  const A4_HEIGHT_PX = 1123;
  const contentHeight = preview.scrollHeight;

  if (contentHeight > A4_HEIGHT_PX + 15) { // 15px margin
    const extraPages = Math.ceil(contentHeight / A4_HEIGHT_PX);
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/95 text-slate-950 font-medium text-xs rounded-lg shadow-lg backdrop-blur-sm">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>Resume spans ~${extraPages} pages.</strong> Recruiters strongly prefer 1-page resumes. Shorten bullet points to fit 1 page.</span>
        </div>
        <button type="button" class="text-slate-900 hover:text-black font-bold text-sm px-1.5" onclick="document.getElementById('page-overflow-warning').classList.add('hidden')" aria-label="Dismiss warning">✕</button>
      </div>
    `;
  } else {
    banner.classList.add('hidden');
  }
}


