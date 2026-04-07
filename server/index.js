import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initSchema } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ── KV Store routes ─────────────────────────────────────────────────────────

const storeRouter = express.Router();

storeRouter.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM kv_store');
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

storeRouter.get('/:key', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT value FROM kv_store WHERE key = $1',
      [req.params.key]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Key not found' });
    res.json(rows[0].value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

storeRouter.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [req.params.key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

storeRouter.delete('/:key', async (req, res) => {
  try {
    await pool.query('DELETE FROM kv_store WHERE key = $1', [req.params.key]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

storeRouter.delete('/', async (req, res) => {
  try {
    await pool.query('TRUNCATE kv_store');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/store', storeRouter);

// ── Diagrams routes ─────────────────────────────────────────────────────────

const diagramsRouter = express.Router();

diagramsRouter.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT question_id FROM diagrams');
    res.json(rows.map(r => r.question_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

diagramsRouter.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_data, caption FROM diagrams WHERE question_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });
    res.json({ image: rows[0].image_data, caption: rows[0].caption });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

diagramsRouter.put('/:id', async (req, res) => {
  try {
    const { image, caption } = req.body;
    await pool.query(
      `INSERT INTO diagrams (question_id, image_data, caption, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (question_id) DO UPDATE SET image_data = $2, caption = $3, created_at = NOW()`,
      [req.params.id, image, caption || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

diagramsRouter.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM diagrams WHERE question_id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

diagramsRouter.delete('/', async (req, res) => {
  try {
    await pool.query('TRUNCATE diagrams');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/diagrams', diagramsRouter);

// ── Migrate (bulk import from localStorage) ─────────────────────────────────

app.post('/api/migrate', async (req, res) => {
  const client = await pool.connect();
  try {
    const { store = {}, diagrams = {} } = req.body;
    await client.query('BEGIN');

    for (const [key, value] of Object.entries(store)) {
      await client.query(
        `INSERT INTO kv_store (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE
           SET value = $2, updated_at = NOW()
           WHERE kv_store.updated_at < NOW()`,
        [key, JSON.stringify(value)]
      );
    }

    for (const [questionId, data] of Object.entries(diagrams)) {
      await client.query(
        `INSERT INTO diagrams (question_id, image_data, caption, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (question_id) DO UPDATE
           SET image_data = $2, caption = $3, created_at = NOW()
           WHERE diagrams.created_at < NOW()`,
        [questionId, data.image, data.caption || '']
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, imported: { store: Object.keys(store).length, diagrams: Object.keys(diagrams).length } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Export everything ────────────────────────────────────────────────────────

app.get('/api/export', async (req, res) => {
  try {
    const storeResult = await pool.query('SELECT key, value FROM kv_store');
    const store = {};
    for (const row of storeResult.rows) {
      store[row.key] = row.value;
    }

    const diagramsResult = await pool.query('SELECT question_id, image_data, caption FROM diagrams');
    const diagrams = {};
    for (const row of diagramsResult.rows) {
      diagrams[row.question_id] = { image: row.image_data, caption: row.caption };
    }

    res.json({ store, diagrams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SPA fallback ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
