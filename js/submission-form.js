/**
 * Submission Form — Conditional Field Logic
 *
 * Reads declarative `data-condition` attributes from the DOM and
 * shows/hides elements based on form state. Hidden fields have their
 * `required` attribute removed so they don't block native validation.
 *
 * Condition syntax (on any element):
 *   data-condition="fieldName:value"           — show when field equals value
 *   data-condition="fieldName:!value"          — show when field does NOT equal value
 *   data-condition="fieldName:filled"          — show when field is non-empty
 *   data-condition="fieldA:value,fieldB:filled" — multiple conditions (comma-separated)
 *
 *   data-condition-rule="all"  (default) — ALL conditions must be true
 *   data-condition-rule="any"            — ANY condition must be true
 */

(function () {
  'use strict';

  // ── Condition Parsing ──────────────────────────────────────────────

  /**
   * Parse a data-condition string into an array of condition objects.
   * e.g. "website:filled,social:filled" → [{ field, operator, value }, ...]
   */
  function parseConditions(raw) {
    return raw.split(',').map(function (part) {
      var pair = part.trim().split(':');
      var field = pair[0];
      var value = pair.slice(1).join(':'); // rejoin in case value contains ':'

      if (value === 'filled') {
        return { field: field, operator: 'filled', value: null };
      }
      if (value.charAt(0) === '!') {
        return { field: field, operator: 'not_equals', value: value.slice(1) };
      }
      return { field: field, operator: 'equals', value: value };
    });
  }

  // ── Condition Evaluation ───────────────────────────────────────────

  /**
   * Get the current value of a named form field.
   * Handles radios (checked value), text/textarea/select (value), and checkboxes.
   */
  function getFieldValue(form, fieldName) {
    var elements = form.elements[fieldName];
    if (!elements) return '';

    // RadioNodeList (radios or multiple elements with same name)
    if (elements instanceof RadioNodeList) {
      // For radios, .value returns the checked radio's value or ''
      return elements.value;
    }

    // Single element
    if (elements.type === 'checkbox') {
      return elements.checked ? elements.value || 'on' : '';
    }
    return elements.value || '';
  }

  /**
   * Evaluate a single condition against the current form state.
   */
  function evaluateCondition(form, condition) {
    var fieldValue = getFieldValue(form, condition.field);

    switch (condition.operator) {
      case 'filled':
        return fieldValue.trim() !== '';
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'equals':
        return fieldValue === condition.value;
      default:
        return false;
    }
  }

  /**
   * Evaluate all conditions for an element. Returns true if the element should be visible.
   */
  function evaluateAllConditions(form, conditions, rule) {
    if (rule === 'any') {
      return conditions.some(function (c) { return evaluateCondition(form, c); });
    }
    // Default: 'all'
    return conditions.every(function (c) { return evaluateCondition(form, c); });
  }

  // ── DOM Updates ────────────────────────────────────────────────────

  /**
   * Store original `required` state so we can restore it when re-shown.
   * Called once during init.
   */
  function snapshotRequiredFields(el) {
    var requiredEls = el.querySelectorAll('[required]');
    var snapshot = [];
    requiredEls.forEach(function (input) {
      snapshot.push(input);
    });
    return snapshot;
  }

  /**
   * Show or hide a conditional element, toggling required attributes
   * on contained inputs so hidden fields don't block validation.
   */
  function setVisible(el, visible, requiredSnapshot) {
    el.hidden = !visible;

    requiredSnapshot.forEach(function (input) {
      if (visible) {
        input.setAttribute('required', '');
      } else {
        input.removeAttribute('required');
      }
    });
  }

  // ── Initialisation ─────────────────────────────────────────────────

  function initConditionalFields(form) {
    var conditionalEls = form.querySelectorAll('[data-condition]');
    if (!conditionalEls.length) return;

    // Build a list of { element, conditions, rule, requiredSnapshot }
    var entries = [];
    conditionalEls.forEach(function (el) {
      var conditions = parseConditions(el.getAttribute('data-condition'));
      var rule = el.getAttribute('data-condition-rule') || 'all';
      var requiredSnapshot = snapshotRequiredFields(el);

      entries.push({
        el: el,
        conditions: conditions,
        rule: rule,
        requiredSnapshot: requiredSnapshot
      });
    });

    /**
     * Re-evaluate every conditional element. Called on any form input change.
     */
    function evaluate() {
      entries.forEach(function (entry) {
        var visible = evaluateAllConditions(form, entry.conditions, entry.rule);
        setVisible(entry.el, visible, entry.requiredSnapshot);
      });
    }

    // Listen for input/change events via delegation on the form
    form.addEventListener('input', evaluate);
    form.addEventListener('change', evaluate);

    // Run once on init to set correct initial state
    evaluate();
  }

  // ── Boot ────────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    initConditionalFields(form);
  }
})();
