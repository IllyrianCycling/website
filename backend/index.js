const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const https = require('https');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

dotenv.config();

const {
  RESEND_API_KEY,
  ADMIN_EMAIL,
  FROM_EMAIL,
  SITE_NAME = 'Illyrian Cycling',
  PORT,
  ALLOWED_ORIGINS = '',
  MUSIC_URL = 'https://github.com/IllyrianCycling/website/releases/download/audio-v1/Supersonic.Shadows.mp3',
} = process.env;

const allowedOrigins = ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY in environment');
  process.exit(1);
}

if (!ADMIN_EMAIL) {
  console.error('Missing ADMIN_EMAIL in environment');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);
const app = express();
const FRONTEND_DIR = path.join(__dirname, '../frontend');

app.enable('trust proxy');
app.use(helmet());
app.use(cors(
  allowedOrigins.length
    ? {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      }
    : {
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      }
));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(FRONTEND_DIR));

// Music proxy: GitHub release assets are served as application/octet-stream,
// which browsers refuse for <audio>. Stream the asset with the correct MIME
// type and preserve HTTP range requests.
function streamMusic(req, res, url, redirectsLeft = 5) {
  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;
  if (req.headers['if-range']) headers['If-Range'] = req.headers['if-range'];

  https.get(url, { headers }, (upstream) => {
    if ([301, 302, 303, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
      upstream.resume();
      if (redirectsLeft <= 0) {
        res.status(502).end();
        return;
      }
      streamMusic(req, res, upstream.headers.location, redirectsLeft - 1);
      return;
    }

    res.status(upstream.statusCode);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Accept-Ranges', upstream.headers['accept-ranges'] || 'bytes');
    if (upstream.headers['content-length']) {
      res.set('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['content-range']) {
      res.set('Content-Range', upstream.headers['content-range']);
    }
    res.set('Cache-Control', 'public, max-age=86400');

    upstream.on('error', (err) => {
      console.error('Music proxy upstream error:', err);
      res.destroy();
    });
    upstream.pipe(res);
  }).on('error', (err) => {
    console.error('Music proxy request error:', err);
    res.status(502).end();
  });
}

app.get('/audio', (req, res) => {
  streamMusic(req, res, MUSIC_URL);
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

function sanitize(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function buildClientEmail({ name, level }) {
  return {
    subject: `Thanks for reaching out to ${SITE_NAME}`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; color: #111; line-height: 1.5;">
        <h1 style="margin-bottom: 0.5rem;">Thank you, ${escapeHtml(name)}.</h1>
        <p>We received your request and will be in touch soon with a tailored cycling experience.</p>
        <p><strong>Level:</strong> ${escapeHtml(level) || 'Not specified'}</p>
        <p>Expect a reply within 24 hours.</p>
        <p>Ride safe,<br><strong>${SITE_NAME}</strong></p>
      </div>
    `,
  };
}

function buildAdminEmail({ name, email, level, message }) {
  return {
    subject: `New inquiry from ${escapeHtml(name)}`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; color: #111; line-height: 1.5;">
        <h1 style="margin-bottom: 0.5rem;">New ride inquiry</h1>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Level:</strong> ${escapeHtml(level) || 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message) || 'No message provided.'}</p>
      </div>
    `,
  };
}

app.post('/api/contact', async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const level = sanitize(req.body.level);
  const message = sanitize(req.body.message);

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (name.length > 100 || level.length > 50 || message.length > 2000) {
    return res.status(400).json({ error: 'Input fields exceed maximum allowed length.' });
  }

  try {
    const clientEmail = buildClientEmail({ name, level });
    const adminEmail = buildAdminEmail({ name, email, level, message });

    await Promise.all([
      resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: clientEmail.subject,
        html: clientEmail.html,
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: adminEmail.subject,
        html: adminEmail.html,
      }),
    ]);

    return res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Resend email error:', error);
    return res.status(500).json({ error: 'Unable to send confirmation email. Please try again later.' });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }

  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT || 3000, () => {
  console.log(`Back-end service listening on http://localhost:${PORT || 3000}`);
});
