/**
 * Form Submit
 *
 * Handles form submission. Currently mocks the submission by logging
 * to the console and showing a success message. Replace the mock
 * with a real endpoint (e.g. WordPress REST API, Netlify Forms) when
 * ready.
 *
 * On successful submit:
 *  - Logs the form data to the console
 *  - Clears localStorage via form.formStorage.clear()
 *  - Replaces the form with a success message
 *  - Disables the beforeunload warning
 */

(function () {
  'use strict';

  // ── Collect Data ──────────────────────────────────────────────────

  function collectFormData(form) {
    var formData = new FormData(form);
    var data = {};

    formData.forEach(function (value, key) {
      // Handle multiple values (e.g. file inputs with multiple files)
      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    return data;
  }

  // ── Mock Submit ───────────────────────────────────────────────────

  /**
   * Replace this function with a real submission handler.
   * Should return a Promise that resolves on success or rejects on failure.
   *
   * Example for WordPress REST API:
   *   return fetch('https://yoursite.com/wp-json/aww/v1/submit', {
   *     method: 'POST',
   *     body: new FormData(form),
   *     headers: { 'X-AWW-Key': 'your-api-key' }
   *   }).then(function (res) {
   *     if (!res.ok) throw new Error('Submission failed');
   *     return res.json();
   *   });
   */
  function submitForm(form) {
    var data = collectFormData(form);

    console.group('%c Art Walk Weekends — Submission', 'color: #0774B0; font-weight: bold');
    console.log('Form data:', data);
    console.log('Files (images):', form.querySelector('[name="images"]').files);
    console.log('Files (CV):', form.querySelector('[name="cv"]').files);
    console.groupEnd();

    // Simulate network delay
    return new Promise(function (resolve) {
      setTimeout(resolve, 800);
    });
  }

  // ── Success UI ────────────────────────────────────────────────────

  function showSuccess(container) {
    container.innerHTML =
      '<div class="form-step">' +
        '<h2 class="form-section-heading" style="color: var(--clr-success)">Application Submitted</h2>' +
        '<p>Thank you for your submission to Art Walk Weekends. We have received your application and will be in touch.</p>' +
        '<p>If you have any questions, please contact us via the <a href="https://artwalkprojects.co.uk/contact/" target="_blank" rel="noopener">Art Walk Projects website</a>.</p>' +
      '</div>';
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init(form) {
    var container = form.closest('.submission-form-container');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }

      submitForm(form)
        .then(function () {
          // Clear stored form data and panel state
          if (form.formStorage && form.formStorage.clear) {
            form.formStorage.clear();
          }
          if (form.formPanels && form.formPanels.clear) {
            form.formPanels.clear();
          }

          // Disable beforeunload warning
          window.onbeforeunload = null;

          // Show success
          showSuccess(container || form.parentNode);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(function (err) {
          console.error('Submission failed:', err);

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
          }

          alert('Submission failed. Please try again.\n\n' + (err.message || ''));
        });
    });
  }

  // ── Clear Form ─────────────────────────────────────────────────────

  function initClearButton(form) {
    var btn = document.getElementById('clear-form-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!confirm('Are you sure you want to clear the form? All entered data will be lost.')) return;

      // Clear storage
      if (form.formStorage && form.formStorage.clear) {
        form.formStorage.clear();
      }
      if (form.formPanels && form.formPanels.clear) {
        form.formPanels.clear();
      }

      // Reload to reset all module state cleanly
      window.onbeforeunload = null;
      location.reload();
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
    initClearButton(form);
  }
})();
