// Illyrian Bespoke Performance Block
const illyrianBespoke = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'illyrian-bespoke';

  const title = document.createElement('h2');
  title.textContent = 'The same Illyrian performance architecture, built around you.';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Choose 3, 5 or 7 days - we calibrate the routes, terrain, load, recovery and support around your objectives, riding level and group size';

  wrapper.append(title, subtitle);
  return wrapper;
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const bespokeContainer = document.querySelector('.bespoke-section');
    if (bespokeContainer) {
      bespokeContainer.insertBefore(illyrianBespoke(), bespokeContainer.firstElementChild);
    }
  });
} else {
  const bespokeContainer = document.querySelector('.bespoke-section');
  if (bespokeContainer) {
    bespokeContainer.insertBefore(illyrianBespoke(), bespokeContainer.firstElementChild);
  }
}