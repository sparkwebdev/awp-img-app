/**
 * Debug Prefill
 *
 * Adds a pen (✎) button outside each form step's top-right corner.
 * Clicking it fills visible fields with valid dummy data and
 * triggers input/change events so other modules react.
 * Optional fields have a 50% chance of being left blank.
 *
 * Remove this script (and its <script> tag) before going live.
 */

(function () {
  'use strict';

  // ── Dummy Data ──────────────────────────────────────────────────────

  var DUMMY = {
    name: 'Just Testing',
    address: '42 High Street\nPortobello\nEdinburgh',
    postcode: 'EH15 1AX',
    phone: '07700 900123',
    email: 'stevenrobertpark@gmail.com',
    website: 'https://janesmith.art',
    social: 'https://instagram.com/janesmithart',
    collective_name: 'The Portobello Collective',
    venue_address: '10 Bath Street\nPortobello\nEdinburgh\nEH15 1HF',
    main_artist: 'John Doe',
    location_preference: 'The Skylark Cafe',
    work_proposal: 'I plan to exhibit 6 mixed-media pieces (approx 60x80cm each) exploring the theme of coastal erosion along the Forth estuary, connecting to this year\'s festival subject of environmental change.',
    artist_summary: 'Mixed-media works exploring coastal landscapes and environmental change through layered paint, print and found materials.',
    artist_statement: 'Jane Smith is an Edinburgh-based artist working primarily in mixed media. Her practice explores the relationship between urban and coastal environments, using layered painting, printmaking and assemblage of found objects. Recent exhibitions include Open Studios Edinburgh 2025 and the Portobello Art Fair. She holds a BA in Fine Art from Edinburgh College of Art.',
    event_datetime: 'Saturday 7 June, 2-4pm',
    event_description: 'Join Jane for a live demonstration of her mixed-media layering technique, followed by a Q&A about her practice and materials.'
  };

  // ── Helpers ─────────────────────────────────────────────────────────

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * 50% chance of returning true — used to skip optional fields.
   */
  function maybeFill() {
    return Math.random() > 0.5;
  }

  function fillField(field, value) {
    if (!field || field.type === 'file') return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Fill an optional field — 50% chance of leaving it blank.
   */
  function fillOptional(field, value) {
    if (!field) return;
    fillField(field, maybeFill() ? value : '');
  }

  function selectRandomRadio(form, name) {
    var radios = Array.prototype.slice.call(
      form.querySelectorAll('input[name="' + name + '"]')
    ).filter(function (r) { return !r.closest('[hidden]'); });

    if (radios.length) {
      var radio = randomChoice(radios);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return radio.value;
    }
    return null;
  }

  function checkBox(field) {
    if (field && !field.checked) {
      field.checked = true;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function selectRandomOption(field) {
    if (!field) return;
    var options = Array.prototype.slice.call(field.options).filter(function (o) {
      return o.value !== '';
    });
    if (options.length) {
      field.value = randomChoice(options).value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ── Per-step Prefill Logic ──────────────────────────────────────────

  var stepFillers = {
    '1': function (step) {
      checkBox(step.querySelector('input[name="consent"]'));
    },

    '2': function (step, form) {
      fillField(step.querySelector('[name="name"]'), DUMMY.name);
      fillField(step.querySelector('[name="address"]'), DUMMY.address);
      fillField(step.querySelector('[name="postcode"]'), DUMMY.postcode);
      fillField(step.querySelector('[name="phone"]'), DUMMY.phone);
      fillField(step.querySelector('[name="email"]'), DUMMY.email);
      fillOptional(step.querySelector('[name="website"]'), DUMMY.website);
      fillOptional(step.querySelector('[name="social"]'), DUMMY.social);

      setTimeout(function () {
        selectRandomRadio(form, 'live_link');
      }, 50);
    },

    '3': function (step, form) {
      var exhibitType = selectRandomRadio(form, 'exhibit_type');

      setTimeout(function () {
        if (exhibitType === 'art_house') {
          var applyingAs = selectRandomRadio(form, 'applying_as');

          setTimeout(function () {
            if (applyingAs === 'group') {
              var collective = step.querySelector('[name="collective_name"]');
              if (collective && !collective.closest('[hidden]')) {
                fillField(collective, DUMMY.collective_name);
              }
            }
            if (applyingAs === 'shared_additional') {
              var mainArtist = step.querySelector('[name="main_artist"]');
              if (mainArtist && !mainArtist.closest('[hidden]')) {
                fillField(mainArtist, DUMMY.main_artist);
              }
            }

            var venueAddr = step.querySelector('[name="venue_address"]');
            if (venueAddr && !venueAddr.closest('[hidden]')) {
              fillField(venueAddr, DUMMY.venue_address);
            }

            selectRandomRadio(form, 'disabled_access');
          }, 50);
        }

        if (exhibitType === 'art_in_shops') {
          fillOptional(step.querySelector('[name="location_preference"]'), DUMMY.location_preference);
          fillField(step.querySelector('[name="work_proposal"]'), DUMMY.work_proposal);
        }
      }, 50);
    },

    '4': function (step) {
      fillField(step.querySelector('[name="artist_summary"]'), DUMMY.artist_summary);
      fillField(step.querySelector('[name="artist_statement"]'), DUMMY.artist_statement);
    },

    '5': function (step, form) {
      var choice = selectRandomRadio(form, 'additional_events');

      setTimeout(function () {
        if (choice === 'yes') {
          selectRandomOption(step.querySelector('[name="event_type"]'));
          fillOptional(step.querySelector('[name="event_datetime"]'), DUMMY.event_datetime);
          fillOptional(step.querySelector('[name="event_description"]'), DUMMY.event_description);
        }
      }, 50);
    },

    '6': function () {},
    '7': function () {}
  };

  // ── Clear Logic ──────────────────────────────────────────────────────

  function clearStep(step) {
    var fields = step.querySelectorAll('input, textarea, select');
    fields.forEach(function (field) {
      if (field.type === 'file') {
        field.value = '';
      } else if (field.type === 'radio' || field.type === 'checkbox') {
        field.checked = false;
      } else {
        field.value = '';
      }
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  }

  // ── Button Injection ────────────────────────────────────────────────

  function init(form) {
    var steps = form.querySelectorAll('[data-step]');

    steps.forEach(function (step) {
      var stepNum = step.getAttribute('data-step');
      var filled = false;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'debug-prefill-btn';
      btn.setAttribute('aria-label', 'Prefill step ' + stepNum);
      btn.textContent = '\u270E';

      btn.addEventListener('click', function () {
        if (filled) {
          clearStep(step);
          btn.textContent = '\u270E';
          btn.setAttribute('aria-label', 'Prefill step ' + stepNum);
          btn.classList.remove('debug-prefill-btn--clear');
          filled = false;
        } else {
          var filler = stepFillers[stepNum];
          if (filler) filler(step, form);
          btn.textContent = '\u2715';
          btn.setAttribute('aria-label', 'Clear step ' + stepNum);
          btn.classList.add('debug-prefill-btn--clear');
          filled = true;

          // Scroll to the Next/Submit button
          var actionBtn = step.querySelector('.form-step-action button');
          if (actionBtn) {
            setTimeout(function () {
              actionBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
          }
        }
      });

      step.style.position = 'relative';
      step.appendChild(btn);
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
  }
})();
