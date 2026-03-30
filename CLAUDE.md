# CLAUDE.md

## Project Overview

Art Walk Weekends Image Prep Tool — a fully client-side web app for artists to prepare artwork images for Art Walk Porty submission. No server, no build step. All processing happens in the browser.

**Live:** https://art-walk-img-prep.netlify.app
**Repo:** https://github.com/sparkwebdev/img-app

## File Structure

```
img-app/
  index.html              Single-page app (Alpine.js markup, CDN links)
  css/styles.css          Design tokens, layout, slot states, responsive
  js/app.js               Alpine.js component: state, validation, downloads
  js/image-processor.js   Canvas resize + iterative JPEG compression
  images/logo.png         Art Walk Projects logo
```

No build tools, bundlers, or package.json. All dependencies via CDN.

## Tech Stack

- **Alpine.js 3.x** — reactivity (`x-data`, `x-show`, `x-model`, `x-for`)
- **Canvas API** — image resize and JPEG compression
- **heic-to 1.3.0** — HEIC/HEIF→JPEG conversion (lazy-loaded on first HEIC upload, not in HTML)
- **IBM Plex Mono** — Google Fonts (300/400/700)
- All output is JPEG regardless of input format

## User Flow (4 steps)

1. **Landing** — rules, requirements, "Get Started"
2. **Name** — artist name input, live filename preview, sanitization
3. **Upload** — drag-and-drop + click, 5 image slots, validation, processing with progress bar
4. **Results** — processed images listed with individual download buttons

## Image Processing Pipeline

1. Load file → `Image()` via object URL
2. Resize: cap longest edge at 2000px, maintain aspect ratio
3. Draw to canvas with `imageSmoothingQuality: 'high'`
4. Iterative JPEG compression: quality 0.92 → 0.30, step 0.05, target ≤ 1.5MB
5. Sequential processing (not parallel) to limit memory usage

## Validation Rules

- **Formats:** JPG, PNG, WebP, HEIC/HEIF
- **Max file size:** 10MB per image (checked before HEIC conversion)
- **Min dimensions:** 1500px on longest edge
- **Duplicates:** blocked by matching filename + file size
- **Slot count:** exactly 5 required

## Key Architecture Decisions

- **No `x-transition:leave`** on step panels — removed to prevent overlap/jump during transitions
- **HEIC library lazy-loaded** — avoids 2.7MB payload for users who don't need it
- **`beforeunload` warning** — active once user leaves the landing step
- **No "Download All" / ZIP** — removed because multiple downloads and zips are unreliable on iOS
- **Slot removal via click overlay** — click image → Remove/Cancel overlay (not hover X button)
- **`@click.outside`** on delete overlay dismisses it

## Branding

- Primary: `#0774B0` (deep blue)
- Secondary: `#6C8811` / `#92B233` (greens)
- Error: `#C0392B` (darkened for WCAG AA)
- Text: `#263D45` on `#FFFFFF`
- Font: IBM Plex Mono
- Logo: `images/logo.png`

## Deployment

Static files deployed directly to Netlify:

```bash
netlify deploy --prod --dir=.
```

No build command needed. Push to GitHub then deploy, or deploy directly.

## Accessibility

- `aria-labelledby` on each step panel
- `role="list"` / `role="listitem"` on slot grid and results
- `role="alert"` on error messages
- `role="progressbar"` with `aria-valuenow` on progress bar
- `aria-live="polite"` region for screen reader announcements
- Focus management: heading focused on each step transition
- Keyboard support: Enter/Space on dropzone, tab navigation
- `x-cloak` prevents flash of unstyled content

## Responsive Breakpoints

- **600px:** 2-column slot grid, stacked buttons (column-reverse), reduced padding
- **400px:** wrapped result rows

## Artist Submission Form

Multi-step form below the image prep tool for Art Walk Weekends artist applications. Fully client-side, no framework — vanilla JS with modular architecture.

### File Structure

```
js/submission-form.js   Conditional field show/hide logic
js/char-counter.js      Live character counters (X / MAX)
js/field-validation.js  Per-field touched state, green/red borders, error messages
js/step-navigation.js   Step-by-step reveal, validity gating, scroll behaviour
js/debug-prefill.js     Debug only — prefill/clear buttons per step (remove before launch)
```

### Form Steps (6)

1. **Begin** — overview of what's needed, T&C consent checkbox
2. **Contact Details** — name, postal address, postcode, mobile, email, website (optional), social media (optional), preferred listing link (conditional)
3. **About Your Exhibition** — exhibit type (Art Houses / Art in Shops), with conditional sub-fields for each track
4. **About Your Artwork** — artist summary (max 200 chars), artist statement (max 1000 chars)
5. **Additional Events** — yes/no, with conditional event type/date/description fields
6. **Supporting Materials** — 5 image uploads (jpg/png), CV upload (pdf/doc)

### JS Module Architecture

Four independent modules communicating through the DOM — no shared state or cross-imports.

**`submission-form.js`** — Conditional fields. Reads `data-condition` attributes, evaluates rules on `input`/`change`, toggles `hidden` and `required` attributes. Supports `field:value`, `field:!value`, `field:filled` operators with `all`/`any` combining via `data-condition-rule`.

**`char-counter.js`** — Finds `[data-counter][maxlength]` elements, injects a `<span class="char-counter">` after each, updates on input.

**`field-validation.js`** — Tracks per-field touched state (blur for text, change for radios/checkboxes). Three visual states: untouched (default), valid (green `.form-input--valid`), invalid (red `.form-input--error` + error message from `data-error` attribute). Optional empty fields return to neutral.

**`step-navigation.js`** — Hides all steps except the first. Injects Next/Submit button per step, disabled until all visible required fields pass `checkValidity()`. On Next: reveals next step, smooth-scrolls with 100px offset. Step borders: neutral while filling, green after Next, red only if a completed step is later invalidated.

**Script load order matters:** submission-form → char-counter → field-validation → step-navigation → debug-prefill.

### Conditional Fields Reference

| Condition | Fields shown |
|---|---|
| `website` + `social` both filled | Preferred listing link radio |
| `exhibit_type` = art_house | Applying-as radio, venue address, disabled access |
| `exhibit_type` = art_in_shops | Location preference, work proposal, notice |
| `applying_as` = group | Collective name |
| `applying_as` = shared_additional | Main artist/venue owner |
| `applying_as` ≠ shared_additional + filled | Venue address |
| `additional_events` = yes | Event type, date/time, description |

### Validation

- Native HTML validation via Constraint Validation API (`required`, `type`, `maxlength`)
- `novalidate` on `<form>` — validation is handled by JS modules, not browser popups
- Hidden conditional fields have `required` stripped so they don't block progression
- Error messages from `data-error` attributes, displayed as `<span class="form-error" role="alert">`

### Debug Prefill

`debug-prefill.js` adds a toggle button per step:
- **✎ (pen)** bottom-right — fills with valid dummy data, random choices for radios/selects, 50% chance of skipping optional fields
- **✕ (cross)** top-right (red) — clears all fields in the step

Remove the `<script>` tag and `.debug-prefill-btn` CSS before going live.
