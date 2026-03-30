/**
 * Step Navigation
 *
 * Reveals form steps one at a time. Each `[data-step]` element is a
 * self-contained card whose heading is always visible. The module:
 *
 *  1. Wraps each step's content (everything after the heading) in a
 *     container and hides it for all steps except the first.
 *  2. Injects a "Next" button at the bottom of each content step.
 *  3. Monitors validity of visible, required fields in the current step
 *     and enables the button only when they pass.
 *  4. On click, reveals the next step's content and smooth-scrolls to it.
 *  5. The final step is a review panel showing per-section completion
 *     status with a "Submit Application" button that enables only when
 *     all content steps are valid.
 *  6. Warns via `beforeunload` if the user tries to leave after
 *     interacting with the form.
 *
 * Depends on: nothing (standalone IIFE). Works alongside the conditional-
 * fields module — hidden fields have `required` stripped, so they won't
 * block step validation.
 */

(function () {
  'use strict';

  var SCROLL_OFFSET = 100;
  var STEP_VALID_CLASS = 'form-step--valid';
  var STEP_INVALID_CLASS = 'form-step--invalid';
  var STORAGE_KEY = 'aww-submission-panels';

  // ── Panel State Persistence ───────────────────────────────────────

  function savePanelState(stepStates, reviewRevealed) {
    var data = {
      completed: stepStates.map(function (s) { return s.completed; }),
      reviewRevealed: reviewRevealed
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* fail silently */ }
  }

  function loadPanelState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearPanelState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* fail silently */ }
  }

  // ── Validation ─────────────────────────────────────────────────────

  function isConditionallyHidden(field, step) {
    var el = field.parentElement;
    while (el && el !== step) {
      if (el.hasAttribute('data-condition') && el.hidden) return true;
      el = el.parentElement;
    }
    return false;
  }

  function isStepValid(step) {
    var fields = step.querySelectorAll('input, textarea, select');
    var valid = true;

    fields.forEach(function (field) {
      if (isConditionallyHidden(field, step)) return;
      if (!field.required && !field.value) return;
      if (!field.checkValidity()) valid = false;
    });

    return valid;
  }

  // ── Content Wrapping ──────────────────────────────────────────────

  /**
   * Wrap a step's body content (everything after the first heading or,
   * for the review step, the `.form-review-content` wrapper) so we can
   * hide/show it independently of the step card + title.
   *
   * Returns the wrapper element.
   */
  function wrapStepContent(step) {
    // Review step already has a wrapper
    var existing = step.querySelector('.form-review-content');
    if (existing) return existing;

    // Find the heading (h2 or h3) — content starts after it
    var heading = step.querySelector('.form-section-heading');

    var wrapper = document.createElement('div');
    wrapper.className = 'form-step-content';

    if (heading) {
      // Move everything after the heading into the wrapper
      var sibling = heading.nextSibling;
      while (sibling) {
        var next = sibling.nextSibling;
        wrapper.appendChild(sibling);
        sibling = next;
      }
      step.appendChild(wrapper);
    } else {
      // Step 1 has no heading — wrap all children
      while (step.firstChild) {
        wrapper.appendChild(step.firstChild);
      }
      step.appendChild(wrapper);
    }

    return wrapper;
  }

  // ── Button Creation ────────────────────────────────────────────────

  function createStepButton(wrapper, label, isSubmit) {
    var div = document.createElement('div');
    div.className = 'form-step-action';

    var btn = document.createElement('button');
    btn.type = isSubmit ? 'submit' : 'button';
    btn.className = 'btn btn-primary btn-lg';
    btn.textContent = label;
    btn.disabled = true;
    btn.style.width = '100%';

    div.appendChild(btn);
    wrapper.appendChild(div);

    return btn;
  }

  // ── Scrolling ──────────────────────────────────────────────────────

  function scrollToStep(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  // ── Review Panel ───────────────────────────────────────────────────

  function setupReviewPanel(reviewStep, contentWrapper, contentSteps, stepStates) {
    var listEl = reviewStep.querySelector('.form-review-list');
    if (!listEl) return function () {};

    var warningEl = reviewStep.querySelector('.form-review-warning');
    var rows = [];

    contentSteps.forEach(function (step, i) {
      var title = step.dataset.stepTitle || 'Step ' + (i + 1);

      var row = document.createElement('a');
      row.className = 'form-review-row';
      row.href = '#' + (step.id || 'step-' + (i + 1));
      row.addEventListener('click', (function (target) {
        return function (e) {
          e.preventDefault();
          scrollToStep(target);
        };
      })(step));

      var indicator = document.createElement('span');
      indicator.className = 'form-review-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      row.appendChild(indicator);

      var label = document.createElement('span');
      label.className = 'form-review-label';
      label.textContent = title;
      row.appendChild(label);

      listEl.appendChild(row);
      rows.push({ row: row, indicator: indicator, step: step, index: i });
    });

    return function updateReview() {
      var allValid = true;
      var hasInvalid = false;

      rows.forEach(function (r) {
        var valid = isStepValid(r.step);
        var completed = stepStates[r.index].completed;

        if (completed && valid) {
          r.row.className = 'form-review-row form-review-row--valid';
          r.indicator.textContent = '\u2713';
        } else if (completed && !valid) {
          r.row.className = 'form-review-row form-review-row--invalid';
          r.indicator.textContent = '\u2717';
          allValid = false;
          hasInvalid = true;
        } else {
          r.row.className = 'form-review-row form-review-row--pending';
          r.indicator.textContent = '\u2014';
          allValid = false;
        }
      });

      if (warningEl) warningEl.hidden = !hasInvalid;

      return allValid;
    };
  }

  // ── Initialisation ─────────────────────────────────────────────────

  function init(form) {
    var allSteps = Array.prototype.slice.call(
      form.querySelectorAll('[data-step]')
    );

    if (!allSteps.length) return;

    var reviewStep = form.querySelector('[data-step-review]');
    var contentSteps = allSteps.filter(function (s) {
      return !s.hasAttribute('data-step-review');
    });

    var stepStates = contentSteps.map(function () {
      return { completed: false };
    });

    // beforeunload
    var formTouched = false;
    form.addEventListener('input', function () { formTouched = true; });
    form.addEventListener('change', function () { formTouched = true; });
    window.addEventListener('beforeunload', function (e) {
      if (formTouched) e.preventDefault();
    });

    // Restore saved panel state
    var saved = loadPanelState();
    if (saved && saved.completed) {
      saved.completed.forEach(function (val, i) {
        if (i < stepStates.length) stepStates[i].completed = val;
      });
    }

    // Wrap and hide/show content based on saved state
    var contentWrappers = [];

    contentSteps.forEach(function (step, i) {
      var wrapper = wrapStepContent(step);
      contentWrappers.push(wrapper);

      if (stepStates[i].completed) {
        // Previously completed — show content and apply valid/invalid border
        wrapper.hidden = false;
        if (isStepValid(step)) {
          step.classList.add(STEP_VALID_CLASS);
        } else {
          step.classList.add(STEP_INVALID_CLASS);
        }
      } else if (i === 0) {
        wrapper.hidden = false;
      } else {
        // Show content if the previous step was completed (user was working on this one)
        var prevCompleted = i > 0 && stepStates[i - 1].completed;
        wrapper.hidden = !prevCompleted;
      }
    });

    var reviewRevealed = !!(saved && saved.reviewRevealed);
    var reviewWrapper = null;
    if (reviewStep) {
      reviewWrapper = wrapStepContent(reviewStep);
      reviewWrapper.hidden = !reviewRevealed;
    }

    // Set up review panel
    var updateReview = function () { return false; };
    var submitBtn = null;

    if (reviewStep && reviewWrapper) {
      updateReview = setupReviewPanel(reviewStep, reviewWrapper, contentSteps, stepStates);
      submitBtn = createStepButton(reviewWrapper, 'Submit Application', true);
    }

    function refreshReview() {
      if (submitBtn) {
        submitBtn.disabled = !updateReview();
      }
    }

    // Set up each content step
    contentSteps.forEach(function (step, i) {
      var wrapper = contentWrappers[i];
      var isLastContent = !reviewStep && i === contentSteps.length - 1;
      var label = isLastContent ? 'Submit Application' : 'Next';
      var btn = createStepButton(wrapper, label, isLastContent);

      function checkValidity() {
        btn.disabled = !isStepValid(step);
        if (stepStates[i].completed) {
          if (isStepValid(step)) {
            step.classList.remove(STEP_INVALID_CLASS);
            step.classList.add(STEP_VALID_CLASS);
          } else {
            step.classList.remove(STEP_VALID_CLASS);
            step.classList.add(STEP_INVALID_CLASS);
          }
        }
        refreshReview();
      }

      step.addEventListener('input', checkValidity);
      step.addEventListener('change', checkValidity);

      btn.disabled = !isStepValid(step);

      if (!isLastContent) {
        btn.addEventListener('click', function () {
          if (!isStepValid(step)) return;

          stepStates[i].completed = true;
          step.classList.remove(STEP_INVALID_CLASS);
          step.classList.add(STEP_VALID_CLASS);

          // Reveal next content
          if (i < contentSteps.length - 1) {
            contentWrappers[i + 1].hidden = false;
            scrollToStep(contentSteps[i + 1]);
          } else if (reviewWrapper) {
            reviewRevealed = true;
            reviewWrapper.hidden = false;
            scrollToStep(reviewStep);
          }

          savePanelState(stepStates, reviewRevealed);
          refreshReview();
        });
      }
    });

    // Expose clear for form-submit
    form.formPanels = { clear: clearPanelState };

    // Initial review state (for restored panels)
    refreshReview();
  }

  // ── Boot ────────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
  }
})();
