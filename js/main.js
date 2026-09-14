/**
 * Main Application Bootstrap
 * Coordinates initialization of state, form bindings, preview rendering, drag-and-drop, ATS checker, and templates.
 */

import {
  resumeData,
  loadState,
  saveState,
  loadSampleState,
  resetState,
  exportStateToJson,
  importStateFromJson,
  subscribe
} from './state.js';

import { initFormHandlers, populateFormFromState } from './formHandlers.js';
import { renderPreview, initPreviewControls, fitPreviewToWidth } from './renderPreview.js';
import { initDragAndDrop } from './dragDrop.js';
import { initPdfExport } from './pdfExport.js';
import { updateCompletenessUI } from './completeness.js';
import { initTheme } from './theme.js';
import { initAtsChecker } from './atsChecker.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load state from localStorage
  loadState();

  // 2. Initialize Theme
  initTheme();

  // 3. Initialize Forms & Listeners
  initFormHandlers();

  // 4. Initialize Preview & Zoom Controls
  initPreviewControls();

  // 5. Initialize Drag and Drop (SortableJS + Keyboard Up/Down)
  initDragAndDrop();

  // 6. Initialize PDF Export & Print Fallback
  initPdfExport();

  // 7. Initialize ATS Compatibility Checker
  initAtsChecker();

  // 8. Subscribe UI updates to state changes
  subscribe(() => {
    renderPreview();
    updateCompletenessUI();
  });

  // 9. Bind Template Selectors
  initTemplatePickers();

  // 10. Bind Accent Color Pickers
  initAccentColorPickers();

  // 11. Bind Action Buttons (Sample Data, Clear, JSON Backup, Mobile Toggle)
  initHeaderActions();
  initAccordionControls();
  initMobileViewToggle();

  // 12. Initial Render
  renderPreview();
  updateCompletenessUI();
  updateTemplateButtonActiveState();
  updateColorButtonActiveState();

  // Render Lucide Icons if loaded
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Handles template switching
 */
function initTemplatePickers() {
  const buttons = document.querySelectorAll('[data-template]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const templateKey = btn.dataset.template;
      resumeData.meta.template = templateKey;
      saveState();
      updateTemplateButtonActiveState();
    });
  });
}

function updateTemplateButtonActiveState() {
  const activeKey = resumeData.meta?.template || 'template1';
  const buttons = document.querySelectorAll('[data-template]');
  buttons.forEach(btn => {
    if (btn.dataset.template === activeKey) {
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
      btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100');
    } else {
      btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
      btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100');
    }
  });
}

/**
 * Handles accent color customization
 */
function initAccentColorPickers() {
  const swatches = document.querySelectorAll('[data-color]');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      resumeData.meta.accentColor = color;
      saveState();
      updateColorButtonActiveState();
    });
  });
}

function updateColorButtonActiveState() {
  const activeColor = (resumeData.meta?.accentColor || '#4f46e5').toLowerCase();
  const swatches = document.querySelectorAll('[data-color]');
  swatches.forEach(swatch => {
    const color = swatch.dataset.color.toLowerCase();
    if (color === activeColor) {
      swatch.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500', 'scale-110');
    } else {
      swatch.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500', 'scale-110');
    }
  });
}

/**
 * Binds sample data, reset, and JSON export/import actions
 */
function initHeaderActions() {
  const sampleBtn = document.getElementById('load-sample-btn');
  const clearBtn = document.getElementById('clear-data-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');

  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      loadSampleState();
      populateFormFromState();
      updateTemplateButtonActiveState();
      updateColorButtonActiveState();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear all fields? Your changes cannot be undone unless you have a JSON backup.")) {
        resetState();
        populateFormFromState();
        updateTemplateButtonActiveState();
        updateColorButtonActiveState();
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // JSON Export
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportStateToJson();
    });
  }

  // JSON Import
  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener('click', () => {
      importJsonInput.click();
    });

    importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const success = importStateFromJson(content);
          if (success) {
            populateFormFromState();
            updateTemplateButtonActiveState();
            updateColorButtonActiveState();
            if (window.lucide) window.lucide.createIcons();
            alert("Resume profile successfully imported!");
          } else {
            alert("Failed to import JSON file. Please ensure it is a valid ResumeBuilder profile.");
          }
        }
      };
      reader.readAsText(file);
      // Reset input
      importJsonInput.value = '';
    });
  }
}

/**
 * Collapsible section accordion handlers
 */
function initAccordionControls() {
  const accordionHeaders = document.querySelectorAll('.accordion-toggle');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking drag handle, move arrows, or buttons
      if (e.target.closest('.drag-handle') || e.target.closest('.move-section-up') || e.target.closest('.move-section-down') || e.target.closest('button')) return;

      const card = header.closest('.section-card');
      const content = card.querySelector('.accordion-content');
      const arrow = card.querySelector('.accordion-chevron');

      if (content) {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
          content.classList.add('hidden');
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
      }
    });
  });
}

/**
 * Mobile view toggle between Editor and Preview
 */
function initMobileViewToggle() {
  const editorBtn = document.getElementById('mobile-tab-editor');
  const previewBtn = document.getElementById('mobile-tab-preview');
  const editorPanel = document.getElementById('editor-panel') || document.querySelector('aside');
  const previewPanel = document.getElementById('preview-panel') || document.querySelector('main');

  if (!editorBtn || !previewBtn || !editorPanel || !previewPanel) return;

  editorBtn.addEventListener('click', () => {
    editorBtn.classList.add('bg-indigo-600', 'text-white');
    editorBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
    previewBtn.classList.remove('bg-indigo-600', 'text-white');
    previewBtn.classList.add('text-slate-600', 'dark:text-slate-400');

    editorPanel.classList.remove('hidden');
    previewPanel.classList.add('hidden', 'md:flex');
  });

  previewBtn.addEventListener('click', () => {
    previewBtn.classList.add('bg-indigo-600', 'text-white');
    previewBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
    editorBtn.classList.remove('bg-indigo-600', 'text-white');
    editorBtn.classList.add('text-slate-600', 'dark:text-slate-400');

    previewPanel.classList.remove('hidden');
    editorPanel.classList.add('hidden');

    // Smooth auto-fit scaling for mobile preview
    setTimeout(fitPreviewToWidth, 60);
  });
}
