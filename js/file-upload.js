/**
 * File Upload Enhancement
 *
 * Enhances native file inputs with drag-and-drop zones, thumbnail
 * previews (for images), file info display (for documents), and
 * client-side validation. Targets inputs marked with `data-upload`
 * inside `.submission-form`.
 *
 * Configuration via data attributes on the <input type="file">:
 *   data-upload="images"    — multi-file image upload with slot grid
 *   data-upload="document"  — single-file document upload
 *   data-max-size="3"       — max file size in MB (default: 10)
 *   data-min-files="5"      — minimum files required (images only)
 *   data-max-files="5"      — maximum files allowed (images only)
 *
 * Syncs files back to the native input via DataTransfer so that
 * other modules (step-navigation, field-validation) see correct
 * validity state through the Constraint Validation API.
 *
 * Script load order: after field-validation, before step-navigation
 * (or any order — communicates only through the DOM).
 */

(function () {
  'use strict';

  // Feature detection
  var hasDataTransfer = true;
  try { new DataTransfer(); } catch (e) { hasDataTransfer = false; }

  var IMAGE_TYPES = ['image/jpeg', 'image/png'];
  var DOC_EXTENSIONS = ['pdf', 'doc', 'docx'];

  // ── Helpers ─────────────────────────────────────────────────────────

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Sync a file array to a native input via DataTransfer.
   * Dispatches change so other modules (field-validation, step-nav) react.
   */
  function syncToInput(input, files) {
    var dt = new DataTransfer();
    for (var i = 0; i < files.length; i++) {
      dt.items.add(files[i]);
    }
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function fileExtension(name) {
    return name.toLowerCase().split('.').pop();
  }

  // ── Image Upload ──────────────────────────────────────────────────

  function setupImageUpload(input) {
    var minFiles = parseInt(input.dataset.minFiles || '1', 10);
    var maxFiles = parseInt(input.dataset.maxFiles || '5', 10);
    var maxSizeMB = parseFloat(input.dataset.maxSize || '10');
    var maxSize = maxSizeMB * 1024 * 1024;

    // ── Validity (works with or without enhanced UI) ──

    function updateValidity(count) {
      if (count < minFiles) {
        input.setCustomValidity(
          'Please upload ' + minFiles + ' image' + (minFiles !== 1 ? 's' : '') + '.'
        );
      } else {
        input.setCustomValidity('');
      }
    }

    // Fallback: no DataTransfer — validate on native change only
    if (!hasDataTransfer) {
      input.addEventListener('change', function () {
        updateValidity(input.files.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      updateValidity(0);
      return;
    }

    // ── Enhanced UI ──

    var files = [];

    input.classList.add('sr-only');
    input.tabIndex = -1;

    var picker = document.createElement('input');
    picker.type = 'file';
    picker.className = 'sr-only';
    picker.accept = input.accept;
    picker.multiple = true;
    picker.tabIndex = -1;

    var container = document.createElement('div');
    container.className = 'form-upload';
    input.parentNode.insertBefore(container, input);
    input.parentNode.insertBefore(picker, input);

    // ── Dropzone ──

    var dropzone = document.createElement('div');
    dropzone.className = 'form-upload-dropzone';
    dropzone.setAttribute('role', 'button');
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('aria-label', 'Drop images here or click to browse');
    dropzone.innerHTML =
      '<svg class="form-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<p class="form-upload-text">Drag &amp; drop images here, or click to browse</p>' +
      '<p class="form-upload-hint"></p>';
    container.appendChild(dropzone);

    var hintEl = dropzone.querySelector('.form-upload-hint');

    // ── Slot grid ──

    var grid = document.createElement('div');
    grid.className = 'form-upload-grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', 'Image slots');
    container.appendChild(grid);

    // ── Toast error ──

    var toastEl = document.createElement('p');
    toastEl.className = 'form-upload-toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.hidden = true;
    container.appendChild(toastEl);

    var toastTimer = null;

    function showToast(msg) {
      clearTimeout(toastTimer);
      toastEl.textContent = msg;
      toastEl.hidden = false;
      toastTimer = setTimeout(function () {
        toastEl.hidden = true;
        toastEl.textContent = '';
      }, 5000);
    }

    // ── Rendering ──

    function updateHint() {
      var remaining = maxFiles - files.length;
      if (remaining <= 0) {
        dropzone.hidden = true;
      } else {
        dropzone.hidden = false;
        hintEl.textContent =
          remaining + ' slot' + (remaining !== 1 ? 's' : '') + ' remaining';
      }
    }

    function renderSlots() {
      grid.innerHTML = '';

      for (var i = 0; i < maxFiles; i++) {
        var slot = document.createElement('div');
        slot.setAttribute('role', 'listitem');

        if (i < files.length) {
          slot.className = 'form-upload-slot form-upload-slot--filled';

          var thumb = document.createElement('img');
          thumb.className = 'form-upload-slot-thumb';
          thumb.alt = files[i].name;
          var url = URL.createObjectURL(files[i]);
          thumb.src = url;
          thumb.onload = (function (u) {
            return function () { URL.revokeObjectURL(u); };
          })(url);
          slot.appendChild(thumb);

          var number = document.createElement('span');
          number.className = 'form-upload-slot-number';
          number.textContent = i + 1;
          slot.appendChild(number);

          var removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'form-upload-slot-remove';
          removeBtn.setAttribute('aria-label', 'Remove image ' + (i + 1));
          removeBtn.textContent = '\u2715';
          removeBtn.addEventListener('click', (function (idx) {
            return function () {
              files.splice(idx, 1);
              sync();
            };
          })(i));
          slot.appendChild(removeBtn);
        } else {
          slot.className = 'form-upload-slot form-upload-slot--empty';
          slot.addEventListener('click', function () { picker.click(); });

          var plus = document.createElement('svg');
          plus.setAttribute('class', 'form-upload-slot-plus');
          plus.setAttribute('viewBox', '0 0 24 24');
          plus.setAttribute('fill', 'none');
          plus.setAttribute('stroke', 'currentColor');
          plus.setAttribute('stroke-width', '2');
          plus.setAttribute('aria-hidden', 'true');
          plus.innerHTML = '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>';
          slot.appendChild(plus);

          var label = document.createElement('span');
          label.className = 'form-upload-slot-label';
          label.textContent = i + 1;
          slot.appendChild(label);
        }

        grid.appendChild(slot);
      }
    }

    function sync() {
      updateValidity(files.length);
      syncToInput(input, files);
      updateHint();
      renderSlots();
    }

    // ── Add files ──

    function addFiles(newFiles) {
      var added = 0;

      for (var i = 0; i < newFiles.length; i++) {
        if (files.length >= maxFiles) {
          var skipped = newFiles.length - i;
          showToast(
            'Maximum ' + maxFiles + ' images. ' +
            skipped + ' file' + (skipped !== 1 ? 's' : '') + ' skipped.'
          );
          break;
        }

        var file = newFiles[i];

        if (IMAGE_TYPES.indexOf(file.type) === -1) {
          showToast(file.name + ': Only JPG and PNG files accepted.');
          continue;
        }

        if (file.size > maxSize) {
          showToast(
            file.name + ': Too large (' +
            (file.size / (1024 * 1024)).toFixed(1) + 'MB). Max ' +
            maxSizeMB + 'MB.'
          );
          continue;
        }

        var isDuplicate = files.some(function (f) {
          return f.name === file.name && f.size === file.size;
        });
        if (isDuplicate) {
          showToast(file.name + ': Duplicate file.');
          continue;
        }

        files.push(file);
        added++;
      }

      if (added > 0) {
        sync();
      }
    }

    // ── Events ──

    dropzone.addEventListener('click', function () { picker.click(); });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        picker.click();
      }
    });

    dropzone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dropzone.classList.add('form-upload-dropzone--active');
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropzone.classList.remove('form-upload-dropzone--active');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('form-upload-dropzone--active');
      addFiles(Array.from(e.dataTransfer.files));
    });

    picker.addEventListener('change', function () {
      if (picker.files.length > 0) {
        addFiles(Array.from(picker.files));
        picker.value = '';
      }
    });

    // Initial render
    updateValidity(0);
    updateHint();
    renderSlots();
  }

  // ── Document Upload ───────────────────────────────────────────────

  function setupDocumentUpload(input) {
    // No DataTransfer — native file input works fine on its own
    if (!hasDataTransfer) return;

    var maxSizeMB = parseFloat(input.dataset.maxSize || '10');
    var maxSize = maxSizeMB * 1024 * 1024;
    var file = null;

    input.classList.add('sr-only');
    input.tabIndex = -1;

    // Separate picker
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.className = 'sr-only';
    picker.accept = input.accept;
    picker.tabIndex = -1;

    // Build container
    var container = document.createElement('div');
    container.className = 'form-upload';
    input.parentNode.insertBefore(container, input);
    input.parentNode.insertBefore(picker, input);

    // ── Dropzone ──

    var dropzone = document.createElement('div');
    dropzone.className = 'form-upload-dropzone form-upload-dropzone--compact';
    dropzone.setAttribute('role', 'button');
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('aria-label', 'Drop document here or click to browse');
    dropzone.innerHTML =
      '<svg class="form-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<p class="form-upload-text">Drag &amp; drop your CV here, or click to browse</p>' +
      '<p class="form-upload-hint">PDF or Word document</p>';
    container.appendChild(dropzone);

    // ── File display ──

    var fileCard = document.createElement('div');
    fileCard.className = 'form-upload-file';
    fileCard.hidden = true;
    container.appendChild(fileCard);

    // ── Toast error ──

    var toastEl = document.createElement('p');
    toastEl.className = 'form-upload-toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.hidden = true;
    container.appendChild(toastEl);

    var toastTimer = null;

    function showToast(msg) {
      clearTimeout(toastTimer);
      toastEl.textContent = msg;
      toastEl.hidden = false;
      toastTimer = setTimeout(function () {
        toastEl.hidden = true;
        toastEl.textContent = '';
      }, 5000);
    }

    // ── Rendering ──

    function render() {
      if (file) {
        dropzone.hidden = true;
        fileCard.hidden = false;
        fileCard.innerHTML = '';

        var icon = document.createElement('span');
        icon.className = 'form-upload-file-icon';
        icon.setAttribute('aria-hidden', 'true');
        var ext = fileExtension(file.name);
        icon.textContent = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDCC3';
        fileCard.appendChild(icon);

        var info = document.createElement('div');
        info.className = 'form-upload-file-info';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'form-upload-file-name';
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        info.appendChild(nameSpan);

        var sizeSpan = document.createElement('span');
        sizeSpan.className = 'form-upload-file-size';
        sizeSpan.textContent = formatBytes(file.size);
        info.appendChild(sizeSpan);

        fileCard.appendChild(info);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'form-upload-slot-remove';
        removeBtn.setAttribute('aria-label', 'Remove ' + file.name);
        removeBtn.textContent = '\u2715';
        removeBtn.addEventListener('click', function () {
          file = null;
          syncToInput(input, []);
          render();
        });
        fileCard.appendChild(removeBtn);
      } else {
        dropzone.hidden = false;
        fileCard.hidden = true;
      }
    }

    // ── Set file ──

    function setFile(f) {
      var ext = fileExtension(f.name);

      // Type check
      if (DOC_EXTENSIONS.indexOf(ext) === -1) {
        showToast('Only PDF and Word documents accepted.');
        return;
      }

      // Size check
      if (f.size > maxSize) {
        showToast(
          'Too large (' + (f.size / (1024 * 1024)).toFixed(1) +
          'MB). Max ' + maxSizeMB + 'MB.'
        );
        return;
      }

      file = f;
      syncToInput(input, [file]);
      render();
    }

    // ── Events ──

    dropzone.addEventListener('click', function () { picker.click(); });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        picker.click();
      }
    });

    dropzone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dropzone.classList.add('form-upload-dropzone--active');
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropzone.classList.remove('form-upload-dropzone--active');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('form-upload-dropzone--active');
      if (e.dataTransfer.files.length > 0) {
        setFile(e.dataTransfer.files[0]);
      }
    });

    picker.addEventListener('change', function () {
      if (picker.files.length > 0) {
        setFile(picker.files[0]);
        picker.value = '';
      }
    });

    // Initial render
    render();
  }

  // ── Initialisation ────────────────────────────────────────────────

  function init(form) {
    var inputs = form.querySelectorAll('input[type="file"][data-upload]');
    inputs.forEach(function (input) {
      var mode = input.dataset.upload;
      if (mode === 'images') {
        setupImageUpload(input);
      } else if (mode === 'document') {
        setupDocumentUpload(input);
      }
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────

  var form = document.querySelector('.submission-form');
  if (form) {
    init(form);
  }
})();
