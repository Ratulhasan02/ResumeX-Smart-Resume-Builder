/**
 * Render Preview Module
 * Renders the active template into the DOM preview container, manages zoom scaling,
 * and checks for 1-page overflow.
 */

import { resumeData, loadSampleState } from './state.js';
import { templates } from './templates.js';
import { checkPageOverflow } from './pdfExport.js';
import { populateFormFromState } from './formHandlers.js';

let currentZoom = 0.85;

/**
 * Main render function that generates template HTML and updates the preview DOM
 */
export function renderPreview() {
  const previewElement = document.getElementById('resume-preview');
  if (!previewElement) return;

  const activeTemplateKey = resumeData.meta?.template || 'template1';
  const templateFn = templates[activeTemplateKey] || templates.template1;

  // Generate HTML from selected template
  previewElement.innerHTML = templateFn(resumeData);

  // Bind empty state quick button if present
  const emptySampleBtn = previewElement.querySelector('#empty-state-sample-btn');
  if (emptySampleBtn) {
    emptySampleBtn.onclick = () => {
      loadSampleState();
      populateFormFromState();
    };
  }

  // Apply visual indicators or adjustments
  updateZoom(currentZoom);

  // Monitor 1-page height overflow
  checkPageOverflow();
}

/**
 * Sets zoom scale on the A4 preview element and coordinates wrapper dimensions
 */
export function updateZoom(scale) {
  currentZoom = scale;
  const previewElement = document.getElementById('resume-preview');
  const previewWrapper = document.getElementById('preview-wrapper');
  const zoomLabel = document.getElementById('zoom-percentage');

  if (previewElement) {
    previewElement.style.transform = `scale(${scale})`;
    previewElement.style.transformOrigin = 'top left';

    if (previewWrapper) {
      // Set explicit dimensions on the wrapper to match the scaled dimensions of the resume
      // This prevents flexbox clipping and unwanted horizontal scroll blowout on mobile
      const naturalWidth = previewElement.offsetWidth || 794;
      const naturalHeight = previewElement.offsetHeight || 1123;
      previewWrapper.style.width = `${Math.round(naturalWidth * scale)}px`;
      previewWrapper.style.height = `${Math.round(naturalHeight * scale)}px`;
    }
  }

  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  }
}

/**
 * Calculates zoom scale to fit the preview container's available width
 */
export function fitPreviewToWidth() {
  const container = document.querySelector('.resume-page-container');
  const preview = document.getElementById('resume-preview');
  if (!container || !preview) return;

  // A4 is 210mm wide ≈ 794px at 96 DPI
  const a4WidthPx = preview.offsetWidth || 794;
  let containerWidth = container.clientWidth;
  if (!containerWidth) {
    containerWidth = window.innerWidth;
  }
  const padding = window.innerWidth < 640 ? 24 : 48;
  const availableWidth = Math.max(100, containerWidth - padding);
  const autoScale = Math.min(1.0, Math.max(0.3, availableWidth / a4WidthPx));

  updateZoom(autoScale);
}

/**
 * Initialize zoom control listeners
 */
export function initPreviewControls() {
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomFitBtn = document.getElementById('zoom-fit-btn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      updateZoom(Math.min(1.2, currentZoom + 0.1));
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      updateZoom(Math.max(0.3, currentZoom - 0.1));
    });
  }

  if (zoomFitBtn) {
    zoomFitBtn.addEventListener('click', fitPreviewToWidth);
  }

  // Handle window resize for responsiveness
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth < 1024) {
        fitPreviewToWidth();
      } else {
        updateZoom(currentZoom);
      }
    }, 100);
  });

  // Initial fit adjustment
  setTimeout(fitPreviewToWidth, 100);
}

