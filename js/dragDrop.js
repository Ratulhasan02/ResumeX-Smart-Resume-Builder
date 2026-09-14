/**
 * Drag and Drop & Keyboard Reordering Module
 * Integrates SortableJS for drag-and-drop section reordering
 * AND provides keyboard-accessible Up (↑) / Down (↓) buttons.
 */

import { resumeData, saveState } from './state.js';

export function initDragAndDrop() {
  const sectionsContainer = document.getElementById('sections-accordion-container');
  if (!sectionsContainer) return;

  // Reorder sections in DOM to match saved state on init
  const savedOrder = resumeData.meta?.sectionOrder || [];
  if (savedOrder.length > 0) {
    savedOrder.forEach(sectionKey => {
      const el = sectionsContainer.querySelector(`[data-section="${sectionKey}"]`);
      if (el) {
        sectionsContainer.appendChild(el);
      }
    });
  }

  // Helper to sync state from current DOM order
  function syncSectionOrder() {
    const sectionElements = sectionsContainer.querySelectorAll('[data-section]');
    const newOrder = Array.from(sectionElements).map(el => el.dataset.section);
    resumeData.meta.sectionOrder = newOrder;
    saveState();
  }

  // 1. Initialize SortableJS for mouse & touch
  if (typeof Sortable !== 'undefined') {
    Sortable.create(sectionsContainer, {
      handle: '.drag-handle',
      animation: 200,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: syncSectionOrder
    });
  }

  // 2. Initialize Accessible Keyboard / Click Up and Down buttons
  const moveUpButtons = sectionsContainer.querySelectorAll('.move-section-up');
  const moveDownButtons = sectionsContainer.querySelectorAll('.move-section-down');

  moveUpButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.section-card');
      if (card && card.previousElementSibling) {
        sectionsContainer.insertBefore(card, card.previousElementSibling);
        syncSectionOrder();
        btn.focus();
      }
    });
  });

  moveDownButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.section-card');
      if (card && card.nextElementSibling) {
        sectionsContainer.insertBefore(card, card.nextElementSibling.nextElementSibling);
        syncSectionOrder();
        btn.focus();
      }
    });
  });
}
