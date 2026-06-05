import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { filterWordCloud } from './utils/sanitizer';

// Inject environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_SECRET = process.env.SERVER_SECRET || 'fallback_secret_key'; 

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME
});

// --- Zero-Dependency Auth Engine ---
function generateNativeToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ user: userId, expires: Date.now() + 3600000 })).toString('base64');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('base64');
  return `${payload}.${signature}`;
}

function verifyNativeToken(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'DENIED', message: 'Missing or invalid token format' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const [payloadBase64, signature] = token.split('.');

  if (!payloadBase64 || !signature) {
    res.status(401).json({ status: 'DENIED', message: 'Invalid token structure' });
    return;
  }

  const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET).update(payloadBase64).digest('base64');
  
  if (signature !== expectedSignature) {
    res.status(401).json({ status: 'DENIED', message: 'Token signature mismatch' });
    return;
  }

  const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
  try {
    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.expires) {
      res.status(401).json({ status: 'DENIED', message: 'Token expired' });
      return;
    }
    res.locals.user = payload.user;
    next();
  } catch (err) {
    res.status(401).json({ status: 'DENIED', message: 'Invalid token payload' });
    return;
  }
}

// --- Routes ---

// 1. System Health Check & DB Ping
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ONLINE', 
      message: 'The Bouncer is awake.',
      db_time: dbResult.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ status: 'ERROR', message: 'Database unreachable.' });
  }
});

// 2. The Pillow Authentication Endpoint
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  
  // We will hash this against the DB later, but for now we test the plumbing
  if (password === 'test_password') {
    const token = generateNativeToken('david_admin');
    res.json({ status: 'SUCCESS', token });
  } else {
    res.status(401).json({ status: 'DENIED', message: 'Invalid Neural Key' });
  }
});

// 3. Create a Journal Entry
app.post('/api/journal', async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text || typeof raw_text !== 'string') {
    res.status(400).json({ status: 'ERROR', message: 'Missing or invalid raw_text' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO journal_entries (raw_text) VALUES ($1) RETURNING *',
      [raw_text]
    );
    res.status(201).json({ status: 'SUCCESS', entry: result.rows[0] });
  } catch (err) {
    console.error('Failed to insert journal entry:', err);
    res.status(500).json({ status: 'ERROR', message: 'Failed to save entry' });
  }
});

app.get('/api/wordcloud', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '') as word, count(*) as size
      FROM (
        SELECT regexp_split_to_table(raw_text, '\\s+') as word
        FROM journal_entries
      ) w
      WHERE word IS NOT NULL AND word != ''
      GROUP BY NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '')
      HAVING NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '') IS NOT NULL
    `);

    const wordCloud = filterWordCloud(result.rows);

    res.json({ status: 'SUCCESS', data: wordCloud });
  } catch (err) {
    console.error('Failed to generate wordcloud:', err);
    res.status(500).json({ status: 'ERROR', message: 'Failed to generate wordcloud' });
  }
});

// --- Initialization ---
app.listen(PORT, () => {
  console.log(`[SYS] Declared Backend running on http://localhost:${PORT}`);
});
