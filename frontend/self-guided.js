/* ILLYRIAN CYCLING — PERFORMANCE BLOCKS RENDERER
 * Renders self-guided itinerary data from data/itineraries.js into the unified page.
 */

(function () {
  const data = (window.ILLYRIAN && window.ILLYRIAN.itineraries) || [];
  const cardsEl = document.getElementById('itinerary-cards');
  const loadLabelEl = document.getElementById('load-model-label');
  const loadModelEl = document.getElementById('load-model');
  const daysEl = document.getElementById('progression-days');

  if (!cardsEl || !data.length) return;

  function priceLabel(price) {
    if (price === null) return 'PRICING TBC';
    return 'FROM ' + price;
  }

  function loadClass(label) {
    return 'sg-load sg-load-' + label.toLowerCase().replace(/[^a-z]/g, '');
  }

  function cardHTML(it, active) {
    const m = it.metrics;
    return `
      <article class="card sg-card${active ? ' is-active' : ''}" data-id="${it.id}" role="button" tabindex="0" aria-pressed="${active}">
        <div class="sg-card-head">
          <h3>${it.name}</h3>
          <p class="route-type">${it.tagline}</p>
        </div>
        <div class="sg-load-model sg-load-model-inline">
          ${it.loadModel.map((l) => `<span class="${loadClass(l)}">${l}</span>`).join('')}
        </div>
        <div class="sg-metrics">
          <div><span>Duration</span><strong>${m.duration}</strong></div>
          <div><span>Riding / Recovery</span><strong>${m.ridingDays} / ${m.recoveryDays}</strong></div>
          <div><span>Max elevation</span><strong>${m.maxElevation}</strong></div>
          <div><span>Difficulty</span><strong>${m.difficulty}</strong></div>
        </div>
        <div class="sg-card-foot">
          <span class="sg-price">${priceLabel(m.price)}</span>
          <a href="#contact" class="sg-enquire" data-delivery="self-guided" data-reactive-format>ENQUIRE</a>
        </div>
      </article>
    `;
  }

  function renderCards() {
    cardsEl.innerHTML = data.map((it) => cardHTML(it, it.id === currentId)).join('');
    cardsEl.querySelectorAll('.sg-card').forEach((card) => {
      const select = () => {
        if (card.dataset.id === currentId) return;
        currentId = card.dataset.id;
        renderCards();
        renderArchitecture();
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });
  }

  function renderArchitecture() {
    const it = data.find((d) => d.id === currentId) || data[0];
    if (!it) return;

    if (loadLabelEl) loadLabelEl.textContent = it.name + ' · LOAD MODEL';
    if (loadModelEl) {
      loadModelEl.innerHTML = it.loadModel
        .map((l) => `<span class="${loadClass(l)}">${l}</span>`)
        .join('');
    }
    if (daysEl) {
      daysEl.innerHTML = it.days.map((d) => `
        <div>
          <span class="time">DAY ${d.day} · ${d.load}</span>
          <h4>${d.name}</h4>
          <p>${d.purpose}</p>
          <p class="day-meta">Distance: <span class="accent">TBD</span> &nbsp;&middot;&nbsp; Elevation: <span class="accent">TBD</span></p>
        </div>
      `).join('');
    }
  }

  let currentId = (window.ILLYRIAN && window.ILLYRIAN.featuredItinerary) || data[0].id;
  renderCards();
  renderArchitecture();
})();
