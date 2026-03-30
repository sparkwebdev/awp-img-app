/**
 * Field Validation — per-field UX feedback
 *
 * Tracks "touched" state for each form field and applies visual feedback:
 *   - Untouched: default border (no extra class)
 *   - Touched + valid: green border  (.form-input--valid)
 *   - Touched + invalid: red border  (.form-input--error) + error message
 *
 * Error messages come from the field's `data-error` attribute, falling
 * back to "This field is required."
 *
 * Touch triggers:
 *   - Text / textarea / select / file: `blur` (then re-validate on `input`)
 *   - Radio / checkbox: `change`
 *
 * Radio groups are treated as a single field — the error message and
 * visual state attach to the group's parent `.form-radio-group`.
 */

(function () {
  'use strict';

  var VALID_CLASS = 'form-input--valid';
  var ERROR_CLASS = 'form-input--error';
  var ERROR_MSG_CLASS = 'form-error';
  var DEFAULT_MESSAGE = 'This field is required.';

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Find (or create) the error message element for a field.
   * For radios/checkboxes, it's placed after the radio group container.
   * For other inputs, it's placed after the input itself.
   */
  function getOrCreateError(field, anchor) {
    var existing = anchor.parentNode.querySelector(
      '.' + ERROR_MSG_CLASS + '[data-for="' + field.name + '"]'
    );
    if (existing) return existing;

    var span = document.createElement('span');
    span.className = ERROR_MSG_CLASS;
    span.setAttribute('data-for', field.name);
    span.setAttribute('role', 'alert');
    span.hidden = true;
    anchor.parentNode.insertBefore(span, anchor.nextSibling);
    return span;
  }

  /**
   * Get the custom error message for a field.
   * For radio groups, checks siblings for `data-error` since only the
   * first radio typically carries it.
   */
  function getErrorMessage(field) {
    if (field.dataset.error) return field.dataset.error;

    // For radios, find the one in the group that has data-error
    if (field.type === 'radio') {
      var radios = field.form.querySelectorAll(
        'input[name="' + field.name + '"]'
      );
      for (var i = 0; i < radios.length; i++) {
        if (radios[i].dataset.error) return radios[i].dataset.error;
      }
    }

    return DEFAULT_MESSAGE;
  }

  /**
   * Determine the anchor element — the node after which the error
   * message should be inserted, and to which visual classes apply.
   */
  function getAnchor(field) {
    if (field.type === 'radio' || field.type === 'checkbox') {
      // Walk up to the .form-radio-group or .form-checkbox-label parent
      var group = field.closest('.form-radio-group');
      return group || field.closest('.form-checkbox-label') || field;
    }
    return field;
  }

  /**
   * Get the element that should receive border classes.
   * For radios/checkboxes this is null (no border styling).
   * For inputs/textareas/selects it's the field itself.
   */
  function getBorderTarget(field) {
    if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'file') {
      return null;
    }
    return field;
  }

  /**
   * Check if an optional field is empty (should return to neutral).
   */
  function isOptionalAndEmpty(field) {
    return !field.required && !field.value.trim();
  }

  // ── State Application ──────────────────────────────────────────────

  /**
   * Apply the correct visual state to a field based on its validity.
   */
  function applyState(field, anchor, errorEl) {
    var borderTarget = getBorderTarget(field);
    var valid = field.checkValidity();

    // Optional empty fields → neutral (no colour)
    if (field.type !== 'radio' && field.type !== 'checkbox' && isOptionalAndEmpty(field)) {
      if (borderTarget) {
        borderTarget.classList.remove(VALID_CLASS, ERROR_CLASS);
      }
      errorEl.textContent = '';
      errorEl.hidden = true;
      return;
    }

    if (valid) {
      if (borderTarget) {
        borderTarget.classList.remove(ERROR_CLASS);
        borderTarget.classList.add(VALID_CLASS);
      }
      errorEl.textContent = '';
      errorEl.hidden = true;
    } else {
      if (borderTarget) {
        borderTarget.classList.remove(VALID_CLASS);
        borderTarget.classList.add(ERROR_CLASS);
      }
      errorEl.textContent = getErrorMessage(field);
      errorEl.hidden = false;
    }
  }

  // ── Per-field Setup ────────────────────────────────────────────────

  /**
   * Wire up validation for a single text/textarea/select/file field.
   * Touched on blur, then re-validates on input.
   */
  function setupTextField(field) {
    var anchor = getAnchor(field);
    var errorEl = getOrCreateError(field, anchor);
    var touched = false;

    field.addEventListener('blur', function () {
      touched = true;
      applyState(field, anchor, errorEl);
    });

    field.addEventListener('input', function () {
      if (!touched) return;
      applyState(field, anchor, errorEl);
    });

    // File inputs don't fire `input` — use `change`
    if (field.type === 'file') {
      field.addEventListener('change', function () {
        touched = true;
        applyState(field, anchor, errorEl);
      });
    }
  }

  /**
   * Wire up validation for a radio group (all radios with the same name).
   * Touched on first change, then stays validated.
   */
  function setupRadioGroup(form, name) {
    var radios = form.querySelectorAll('input[name="' + name + '"]');
    if (!radios.length) return;

    var anchor = getAnchor(radios[0]);
    var errorEl = getOrCreateError(radios[0], anchor);
    var touched = false;

    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        touched = true;
        // Radios share validity — check the first one
        applyState(radios[0], anchor, errorEl);
      });
    });
  }

  /**
   * Wire up validation for a checkbox field.
   */
  function setupCheckbox(field) {
    var anchor = getAnchor(field);
    var errorEl = getOrCreateError(field, anchor);
    var touched = false;

    field.addEventListener('change', function () {
      touched = true;
      applyState(field, anchor, errorEl);
    });
  }

  // ── Initialisation ─────────────────────────────────────────────────

  function init(form) {
    var fields = form.querySelectorAll('input, textarea, select');
    var radioGroupsSeen = {};

    fields.forEach(function (field) {
      if (field.type === 'radio') {
        // Only set up each radio group once
        if (!radioGroupsSeen[field.name]) {
          radioGroupsSeen[field.name] = true;
          setupRadioGroup(form, field.name);
        }
        return;
      }

      if (field.type === 'checkbox') {
        setupCheckbox(field);
        return;
      }

      // text, textarea, email, url, tel, select, file
      setupTextField(field);
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
  }
})();
