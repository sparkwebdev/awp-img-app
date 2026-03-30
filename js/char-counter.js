/**
 * Character Counter
 *
 * Automatically adds a live "X / MAX" counter to any input or textarea
 * that has both a `maxlength` attribute and a `data-counter` attribute.
 *
 * The counter element is injected after the input and updates on every
 * keystroke. The parent `.form-field` gets the counter positioned via CSS.
 */

(function () {
  'use strict';

  /**
   * Create the counter DOM element for a given input.
   */
  function createCounter(input) {
    var max = parseInt(input.getAttribute('maxlength'), 10);
    if (isNaN(max)) return null;

    var counter = document.createElement('span');
    counter.className = 'char-counter';
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');

    return { el: counter, max: max };
  }

  /**
   * Update the counter text to reflect current input length.
   */
  function updateCounter(input, counter, max) {
    var current = input.value.length;
    counter.textContent = current + ' / ' + max;
  }

  /**
   * Initialise counters for all marked fields within a root element.
   */
  function initCounters(root) {
    var inputs = root.querySelectorAll('[data-counter][maxlength]');

    inputs.forEach(function (input) {
      var result = createCounter(input);
      if (!result) return;

      var counter = result.el;
      var max = result.max;

      // Insert counter after the input
      input.parentNode.insertBefore(counter, input.nextSibling);

      // Set initial value
      updateCounter(input, counter, max);

      // Update on input
      input.addEventListener('input', function () {
        updateCounter(input, counter, max);
      });
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    initCounters(form);
  }
})();
