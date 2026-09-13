/*
 * Illyrian Cycling — Search Asset Generator
 *
 * Reads data/itineraries.js and regenerates:
 *   frontend/sitemap.xml
 *   frontend/robots.txt
 *   frontend/schema.json            (Schema.org JSON-LD)
 *   inline JSON-LD in index.html    (optional, --inline)
 *
 * Usage:
 *   node generate-assets.js
 *   node generate-assets.js --inline --index ../frontend/index.html
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const HOME = 'https://illyriancycling.cc/';
const today = new Date().toISOString().slice(0, 10);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
};

function loadItineraries() {
  const file = path.join(FRONTEND, 'data', 'itineraries.js');
  const code = fs.readFileSync(file, 'utf8');
  const context = { window: { ILLYRIAN: {} } };
  vm.createContext(context);
  vm.runInContext(code, context);
  return (context.window.ILLYRIAN && context.window.ILLYRIAN.itineraries) || [];
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSitemap() {
  const head = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const root = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const tail = '</urlset>\n';
  const home = `  <url>\n    <loc>${HOME}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  return head + root + home + tail;
}

function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    'Sitemap: ' + HOME + 'sitemap.xml',
    '',
  ].join('\n');
}

function buildSchema(itineraries) {
  const base = {
    '@context': 'https://schema.org',
  };

  const location = Object.assign({}, base, {
    '@type': 'SportsActivityLocation',
    name: 'Illyrian Cycling',
    description:
      'Performance cycling in Montenegro. Guided or self-guided performance blocks, engineered around terrain, load, recovery and progression.',
    url: HOME,
    image: HOME + 'images/logo.png',
    telephone: '+38268101978',
    priceRange: '€€',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tivat',
      addressCountry: 'ME',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 42.4361,
      longitude: 18.6961,
    },
  });

  const product = Object.assign({}, base, {
    '@type': 'Product',
    name: 'Illyrian Cycling Performance Blocks',
    description:
      'Guided or self-guided performance blocks. One methodology, engineered around Montenegro\u2019s terrain, load, recovery and progression.',
    url: HOME + '#self-guided',
    image: HOME + 'images/logo.png',
    brand: { '@type': 'Brand', name: 'Illyrian Cycling' },
    offers: {
      '@type': 'AggregateOffer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'EUR',
      offerCount: itineraries.length,
      offers: itineraries.map((it) => ({
        '@type': 'Offer',
        name: it.name + ' — ' + it.tagline,
        description: it.summary,
        url: HOME + '#it-' + it.id,
        availability: 'https://schema.org/InStock',
      })),
    },
  });

  const schema = [location, product];
  const json = JSON.stringify(schema, null, 2);
  fs.writeFileSync(path.join(FRONTEND, 'schema.json'), json + '\n', 'utf8');
  return schema;
}

function injectInline(schema, indexPath) {
  const file = indexPath || path.join(FRONTEND, 'index.html');
  if (!fs.existsSync(file)) {
    console.warn('--inline: index.html not found, skipping injection');
    return;
  }
  let html = fs.readFileSync(file, 'utf8');
  const script = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  const start = '<!-- SEO JSON-LD START -->';
  const end = '<!-- SEO JSON-LD END -->';
  if (html.includes(start) && html.includes(end)) {
    html = html.replace(
      new RegExp(start + '[\\s\\S]*?' + end),
      start + '\n' + script + '\n' + end
    );
  } else {
    html = html.replace('</head>', '  ' + start + '\n  ' + script + '\n  ' + end + '\n</head>');
  }
  fs.writeFileSync(file, html, 'utf8');
}

function main() {
  const itineraries = loadItineraries();

  fs.writeFileSync(path.join(FRONTEND, 'sitemap.xml'), buildSitemap(), 'utf8');
  fs.writeFileSync(path.join(FRONTEND, 'robots.txt'), buildRobots(), 'utf8');
  const schema = buildSchema(itineraries);

  if (process.argv.includes('--inline')) {
    injectInline(schema, arg('--index', null));
  }

  console.log('sitemap.xml entries: 1');
  console.log('robots.txt written');
  console.log('schema.json written (' + schema.length + ' @type nodes)');
}

main();