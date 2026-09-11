/*
 * Illyrian Cycling -- Crawler & Technical SEO Audit
 *
 * Recursively discovers internal routes from a base URL, verifies
 * metadata/structure/fallback content, and detects broken links.
 *
 * Usage:
 *   node crawler.js --base https://illyriancycling.cc/ --out crawl-report.json
 *
 * Exit code is 1 when audit failures are found (CI-friendly).
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE = arg('--base', 'https://illyriancycling.cc/');
const OUT = arg('--out', path.join(__dirname, 'crawl-report.json'));
const TIMEOUT = Number(arg('--timeout', '15000'));
const MAX_PAGES = Number(arg('--max-pages', '50'));
const EXPECTED_CANONICAL = arg('--canonical', 'https://illyriancycling.cc/');
const VERIFY_PLACEHOLDER = 'YOUR_GOOGLE_CODE_HERE';
const EXTERNAL_CHECK_LIMIT = Number(arg('--external-check-limit', '25'));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

function normalize(url) {
  return String(url).replace(/\/+$/, '');
}

function sameHost(url, base) {
  try {
    return new URL(url).hostname === new URL(base).hostname;
  } catch {
    return false;
  }
}

function isStaticAsset(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mp4|webm|woff2?|pdf|zip)$/i.test(new URL(url).pathname);
}

const client = axios.create({ timeout: TIMEOUT, maxRedirects: 5 });

async function fetchRobotsRules(base) {
  const rules = [];
  try {
    const res = await client.get(new URL('/robots.txt', base).href, { validateStatus: (s) => s < 500 });
    if (res.status === 200) {
      for (const line of res.data.split(/\r?\n/)) {
        const m = /^disallow\s*:\s*(.*)$/i.exec(line.trim());
        if (m && m[1]) rules.push(m[1].trim());
      }
    }
  } catch {
    /* robots.txt unavailable -- do not restrict crawling */
  }
  return rules;
}

function robotsAllows(disallows, url) {
  const p = new URL(url).pathname;
  if (p === '/robots.txt') return true;
  return !disallows.some((rule) => p.startsWith(rule));
}

async function checkExternal(url) {
  try {
    const res = await client.head(url, { validateStatus: () => true, timeout: 8000, maxRedirects: 3 });
    // Some servers 405 HEAD -- fall back to GET.
    if (res.status === 405) {
      const g = await client.get(url, { validateStatus: () => true, timeout: 8000, maxRedirects: 3 });
      return g.status;
    }
    return res.status;
  } catch (err) {
    return err.response ? err.response.status : 0;
  }
}

async function crawl() {
  const baseHost = new URL(BASE).hostname;
  const disallows = await fetchRobotsRules(BASE);
  const queue = [BASE];
  const visited = new Map(); // url -> { status, finalUrl }
  const report = { base: BASE, crawledAt: new Date().toISOString(), routes: [], brokenLinks: [], externalChecks: [], rules: { disallows } };

  while (queue.length && visited.size < MAX_PAGES) {
    const pageUrl = queue.shift();
    const key = normalize(pageUrl);
    if (visited.has(key)) continue;

    if (!robotsAllows(disallows, pageUrl)) {
      visited.set(key, { status: 403, robotsBlocked: true });
      report.routes.push({ url: normalize(pageUrl), robotsBlocked: true });
      continue;
    }

    let html;
    try {
      const res = await client.get(pageUrl, {
        validateStatus: (s) => s === 200 || s >= 400,
        headers: { 'User-Agent': 'IllyrianSeoCrawler/1.0 (+https://illyriancycling.cc/)' },
      });
      visited.set(key, { status: res.status, finalUrl: res.request?.responseURL || null });

      if (res.status >= 400) {
        report.brokenLinks.push({ url: normalize(pageUrl), status: res.status, source: 'crawl' });
        report.routes.push({ url: normalize(pageUrl), status: res.status });
        continue;
      }
      html = res.data;
    } catch (err) {
      visited.set(key, { status: 0, error: err.code || err.message });
      report.brokenLinks.push({ url: normalize(pageUrl), status: 0, source: 'crawl', error: err.code || err.message });
      report.routes.push({ url: normalize(pageUrl), status: 0, error: err.code || err.message });
      continue;
    }

    const $ = cheerio.load(html);

    const issues = [];
    const warnings = [];
    const pageMeta = { url: normalize(pageUrl), issues, warnings };

    // Titles & description
    const title = $('head title').first().text().trim();
    if (!title || title.length > 70) {
      issues.push(title ? `title length ${title.length} exceeds 70 chars` : 'missing <title>');
    }
    const description = $('meta[name="description"]').attr('content') || '';
    if (!description) issues.push('missing <meta name="description">');
    else if (description.length < 50 || description.length > 160) warnings.push(`description length ${description.length} outside 50-160`);

    // Canonical
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    if (normalize(canonical) !== normalize(EXPECTED_CANONICAL)) {
      issues.push(canonical ? `canonical "${canonical}" != ${EXPECTED_CANONICAL}` : 'missing <link rel="canonical">');
    }

    // Search verification
    const gsv = $('meta[name="google-site-verification"]').attr('content') || '';
    if (!gsv) issues.push('missing <meta name="google-site-verification">');
    else if (gsv.includes(VERIFY_PLACEHOLDER)) issues.push('google-site-verification is still a placeholder');

    // Social meta
    const og = ['title', 'description', 'type', 'url', 'image'];
    for (const k of og) {
      const v = $('meta[property="og:' + k + '"]').attr('content') || '';
      if (!v) issues.push(`missing og:${k}`);
      else if ((k === 'url' || k === 'image') && !/^https?:\/\//i.test(v)) warnings.push(`og:${k} should be absolute`);
    }
    const twitter = ['card', 'title', 'description', 'image'];
    for (const k of twitter) {
      if (!$('meta[name="twitter:' + k + '"]').attr('content')) issues.push(`missing twitter:${k}`);
    }

    // Heading structure
    const h1 = $('h1').filter((_, el) => $(el).text().trim()).length;
    if (h1 !== 1) issues.push(`${h1} non-empty <h1> (expected 1)`);
    const h2 = $('h2').length;
    const h3 = $('h3').length;
    if (h2 === 0) issues.push('no <h2> headings');
    if (h3 === 0) warnings.push('no <h3> headings');

    // Images / svg accessibility
    const imgs = $('img').toArray().map((el) => $(el));
    const imgNoAlt = imgs.filter((img) => {
      const alt = (img.attr('alt') || '').trim();
      return !alt && img.attr('aria-hidden') === undefined;
    }).length;
    if (imgNoAlt) issues.push(`${imgNoAlt} <img> without alt text`);
    const svgNoLabel = $('svg').filter((_, el) => {
      const $el = $(el);
      return !$el.attr('aria-label') && !$el.attr('role') && !$el.children('title').length && $el.attr('aria-hidden') === undefined;
    }).length;
    if (svgNoLabel) warnings.push(`${svgNoLabel} <svg> without accessible label`);

    // JS-rendered fallback audit
    const cardsText = $('#itinerary-cards').text().trim();
    const daysText = $('#progression-days').text().trim();
    const loadModelText = $('#load-model').text().trim();
    if (cardsText.length < 30) issues.push('no readable fallback text in #itinerary-cards');
    if (daysText.length < 20) issues.push('no readable fallback text in #progression-days');
    if (loadModelText.length < 5) warnings.push('#load-model has no fallback content');

    report.routes.push(pageMeta);

    // Discover internal links & anchors
    const seenHrefs = new Set();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || seenHrefs.has(href)) return;
      seenHrefs.add(href);
      let target;
      try {
        target = new URL(href, pageUrl);
      } catch {
        return;
      }
      if (/^mailto:|^tel:|^javascript:/i.test(target.protocol)) return;

      if (sameHost(target.href, BASE)) {
if (target.hash && !target.pathname && !target.search) {
          // Fragment-only anchor - confirm the target exists on this page.
          const id = target.hash.slice(1);
          if (id && !$('#' + CSS.escape(id)).length) {
            report.brokenLinks.push({ url: normalize(pageUrl) + target.hash, status: 404, source: 'missing anchor' });
          }
          return;
        }
        target.hash = '';
        target.search = '';
        const abs = target.href;
        if (isStaticAsset(abs)) return;
        if (!visited.has(normalize(abs)) && !queue.includes(abs)) {
          queue.push(abs);
        }
      } else if (!isStaticAsset(target.href) && report.externalChecks.length < EXTERNAL_CHECK_LIMIT) {
        report.externalChecks.push({ url: target.href, from: normalize(pageUrl) });
      }
    });

    // Audit same-page anchor links for homepage sections referenced by nav.
    ['guided', 'self-guided', 'about', 'contact', 'choose'].forEach((id) => {
      if (!$('#' + id).length) report.brokenLinks.push({ url: normalize(pageUrl) + '#' + id, status: 404, source: 'missing section anchor' });
    });
  }

  // External link status checks
  for (const ext of report.externalChecks) {
    ext.status = await checkExternal(ext.url);
    if (ext.status >= 400 && ext.status !== 403 && ext.status !== 0) {
      report.brokenLinks.push({ url: ext.url, status: ext.status, source: 'external' });
    }
  }

  const broken = report.brokenLinks.length;
  const failedRoutes = report.routes.filter((r) => r.issues && r.issues.length).length;
  report.summary = {
    routesFound: report.routes.length,
    routesWithIssues: failedRoutes,
    brokenLinks: broken,
    externalChecked: report.externalChecks.length,
    pass: broken === 0 && failedRoutes === 0,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  report.brokenLinks.forEach((b) => console.log(`BROKEN ${b.status} ${b.url} (${b.source})`));
  return report.summary.pass ? 0 : 1;
}

// Minimal CSS.escape for ids (node <20 lacks it in some contexts via DOM).
const CSS = {
  escape(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
  },
};

crawl().then((code) => {
  process.exitCode = code;
}).catch((err) => {
  console.error('Crawler crashed:', err);
  process.exitCode = 2;
});

