/**
 * Form Storage
 *
 * Persists form field values to localStorage on blur (text fields)
 * and change (radios, checkboxes, selects). Restores values on page
 * load so the user can resume after a refresh.
 *
 * File inputs cannot be restored (browser security restriction) and
 * are skipped.
 *
 * Exposes a clear method on the form element so other modules
 * (e.g. form-submit) can wipe stored data:
 *   form.formStorage.clear()
 *
 * Storage key: 'aww-submission-form'
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'aww-submission-form';

  // ── Helpers ─────────────────────────────────────────────────────────

  function getFields(form) {
    return Array.prototype.slice.call(
      form.querySelectorAll('input, textarea, select')
    );
  }

  function isStorable(field) {
    return field.name && field.type !== 'file' && field.type !== 'submit';
  }

  // ── Save ───────────────────────────────────────────────────────────

  function save(form) {
    var data = {};
    var fields = getFields(form);

    fields.forEach(function (field) {
      if (!isStorable(field)) return;

      if (field.type === 'checkbox') {
        data[field.name] = field.checked;
      } else if (field.type === 'radio') {
        if (field.checked) {
          data[field.name] = field.value;
        }
      } else {
        data[field.name] = field.value;
      }
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage full or unavailable — fail silently
    }
  }

  // ── Restore ────────────────────────────────────────────────────────

  function restore(form) {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return;
    }

    if (!raw) return;

    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }

    var fields = getFields(form);

    fields.forEach(function (field) {
      if (!isStorable(field)) return;
      if (!(field.name in data)) return;

      if (field.type === 'checkbox') {
        field.checked = !!data[field.name];
      } else if (field.type === 'radio') {
        field.checked = (field.value === data[field.name]);
      } else {
        field.value = data[field.name];
      }
    });

    // Dispatch events so other modules (conditional fields, validation,
    // char counters, step-navigation) react to the restored values
    fields.forEach(function (field) {
      if (!isStorable(field)) return;
      if (!(field.name in data)) return;

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // ── Clear ──────────────────────────────────────────────────────────

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // fail silently
    }
  }

  // ── Init ───────────────────────────────────────────────────────────

  function init(form) {
    // Restore saved data
    restore(form);

    // Save on blur (text fields) and change (radios, checkboxes, selects)
    form.addEventListener('blur', function (e) {
      if (e.target && isStorable(e.target)) {
        save(form);
      }
    }, true); // capture phase so blur (which doesn't bubble) is caught

    form.addEventListener('change', function (e) {
      if (e.target && isStorable(e.target)) {
        save(form);
      }
    });

    // Expose clear method on the form element
    form.formStorage = { clear: clear };
  }

  // ── Boot ──────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
  }
})();
