/* ILLYRIAN CYCLING — BESPOKE BLOCK RENDERER
 * Duration selectors (03 / 05 / 07) drive the load-model preview and the
 * day-by-day progression timeline. Reuses window.ILLYRIAN.itineraries.
 */
(function () {
  const data = (window.ILLYRIAN && window.ILLYRIAN.itineraries) || [];
  const group = document.querySelector('.bespoke-duration');
  const tagline = document.querySelector('.bespoke-preview-tagline');
  const model = document.getElementById('bespoke-load-model');
  const daysEl = document.getElementById('bespoke-days');

  function loadClass(label) {
    return 'sg-load sg-load-' + label.toLowerCase().replace(/[^a-z]/g, '');
  }

  function render(it) {
    if (!it) return;

    if (group) {
      group.querySelectorAll('.bespoke-duration-btn').forEach(function (btn) {
        var active = btn.dataset.id === it.id;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    if (tagline) tagline.textContent = it.name + ' \u00B7 ' + it.tagline;

    if (model) {
      model.innerHTML = it.loadModel
        .map(function (l) { return '<span class="' + loadClass(l) + '">' + l + '</span>'; })
        .join('');
    }

    if (daysEl) {
      daysEl.innerHTML = it.days.map(function (d) {
        return '<div>' +
          '<span class="time">DAY ' + d.day + ' \u00B7 ' + d.load + '</span>' +
          '<h4>' + d.name + '</h4>' +
          '<p>' + d.purpose + '</p>' +
          '<p class="day-meta">Distance: <span class="accent">TBD</span> \u00B7 Elevation: <span class="accent">TBD</span></p>' +
          '</div>';
      }).join('');
    }
  }

  if (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.bespoke-duration-btn');
      if (!btn) return;
      var it = null;
      for (var i = 0; i < data.length; i++) {
        if (data[i].id === btn.dataset.id) { it = data[i]; break; }
      }
      render(it);
    });
  }

  if (data.length && group && daysEl) {
    var featured = (window.ILLYRIAN && window.ILLYRIAN.featuredItinerary) || data[0].id;
    var initial = null;
    for (var j = 0; j < data.length; j++) {
      if (data[j].id === featured) { initial = data[j]; break; }
    }
    render(initial || data[0]);
  }
})();