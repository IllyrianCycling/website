/* ILLYRIAN CYCLING — BESPOKE BLOCK RENDERER
 * Makes the 03 / 05 / 07 duration selectors interactive.
 * Reuses window.ILLYRIAN.itineraries (the same single source of truth as
 * self-guided.js) so the bespoke block demonstrates the same architecture
 * it promises — the load model rhythm renders per duration.
 */

(function () {
  const data = (window.ILLYRIAN && window.ILLYRIAN.itineraries) || [];
  const group = document.querySelector('.bespoke-duration');
  const preview = document.querySelector('.bespoke-preview');

  if (!group || !preview || !data.length) return;

  function loadClass(label) {
    return 'sg-load sg-load-' + label.toLowerCase().replace(/[^a-z]/g, '');
  }

  function loadModelHTML(it) {
    return it.loadModel
      .map((l) => '<span class="' + loadClass(l) + '">' + l + '</span>')
      .join('');
  }

  function render(it) {
    group.querySelectorAll('.bespoke-duration-btn').forEach((btn) => {
      const active = btn.dataset.id === it.id;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const tagline = preview.querySelector('.bespoke-preview-tagline');
    const model = preview.querySelector('.bespoke-load-model');
    if (tagline) tagline.textContent = it.name + ' \u00B7 ' + it.tagline;
    if (model) model.innerHTML = loadModelHTML(it);
  }

  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.bespoke-duration-btn');
    if (!btn) return;
    const it = data.find((d) => d.id === btn.dataset.id);
    if (it) render(it);
  });

  /* Default to the featured itinerary, matching self-guided.js. */
  const initialId = (window.ILLYRIAN && window.ILLYRIAN.featuredItinerary) || data[0].id;
  const initial = data.find((d) => d.id === initialId) || data[0];
  render(initial);
})();