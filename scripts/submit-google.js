/*
 * Illyrian Cycling — Google Indexing API client
 *
 * Submits URL_UPDATED notifications to the Google Indexing API for newly
 * deployed routes/itineraries, with exponential-backoff quota handling.
 *
 * Setup:
 *   - Create a service account + JSON key in Google Cloud Console.
 *   - Grant it the Indexing API role on the Search Console property
 *     "https://illyriancycling.cc/" (Site Verification + Indexing permission).
 *   - Pass the key via GOOGLE_SERVICE_ACCOUNT_KEY_JSON env or --key <file>.
 *     Never commit service-account-key.json.
 *
 * Usage:
 *   node submit-google.js --urls https://illyriancycling.cc/,https://illyriancycling.cc/#it-5day
 *   node submit-google.js --sitemap ../frontend/sitemap.xml
 *   node submit-google.js --key ./service-account-key.json \
 *       --urls https://illyriancycling.cc/
 *
 * Exit code is 1 when any URL could not be submitted after retries.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPE = ['https://www.googleapis.com/auth/indexing'];
const MAX_RETRIES = 6;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
};

function loadCredentials() {
  const keyArg = arg('--key', null);
  if (keyArg) return JSON.parse(fs.readFileSync(path.resolve(keyArg), 'utf8'));
  const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (fromEnv) return JSON.parse(fromEnv);
  console.error('No service account key provided (--key file or GOOGLE_SERVICE_ACCOUNT_KEY_JSON env).');
  process.exit(2);
}

function collectUrls() {
  const urlArg = arg('--urls', null);
  const sitemapArg = arg('--sitemap', null);
  if (urlArg) return urlArg.split(',').map((u) => u.trim()).filter(Boolean);

  if (sitemapArg) {
    const file = path.resolve(sitemapArg);
    if (!fs.existsSync(file)) {
      console.error('Sitemap not found:', file);
      process.exit(2);
    }
    const content = fs.readFileSync(file, 'utf8');
    const urls = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    if (!urls.length) {
      console.error('No <loc> entries found in sitemap.');
      process.exit(2);
    }
    return urls;
  }

  console.error('Provide either --urls or --sitemap.');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitWithRetry(indexing, url) {
  let attempt = 0;
  let delayMs = 500;

  while (true) {
    attempt += 1;
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: { url, notificationType: 'URL_UPDATED' },
      });
      return { url, status: res.status, ok: true };
    } catch (err) {
      const status = err.response ? err.response.status : null;
      const body = err.response && err.response.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message;

      // Fail fast on auth/permission mistakes; retry on quota/server pressure.
      const retryable = status === 429 || (status >= 500 && status < 600) || status === null;
      if (!retryable || attempt >= MAX_RETRIES) {
        return {
          url,
          ok: false,
          attempt,
          status: status || 'network',
          error: body,
        };
      }

      console.log(`Retry ${url} (attempt ${attempt}), HTTP ${status}, waiting ${delayMs}ms`);
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, 15000);
    }
  }
}

async function main() {
  const credentials = loadCredentials();
  const urls = collectUrls();

  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    SCOPE,
    null
  );

  const indexing = google.indexing({ version: 'v3', auth });
  const results = [];

  // Indexing API expects a maximum of ~200 URL submissions per day.
  for (const url of urls.slice(0, 200)) {
    const result = await submitWithRetry(indexing, url);
    results.push(result);
    if (result.ok) console.log(`OK    ${url} (${result.status})`);
    else console.log(`FAIL  ${url} :: ${result.error || result.status}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`Submitted ${results.length} URL(s), ${failed} failed.`);

  if (failed) {
    console.log('\nManual fallback: submit the sitemap in Google Search Console.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('submit-google failed:', err.message);
  process.exitCode = 2;
});