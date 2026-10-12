const express = require('express');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// สร้างลิงก์สั้น
app.post('/api/links', (req, res) => {
    const { url } = req.body;

    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
        return res.status(400).json({ error: 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)' });
    }

    const code = nanoid(7);
    db.prepare('INSERT INTO links (code, original_url) VALUES (?, ?)').run(code, url);

    res.status(201).json({ code, short_url: `${BASE_URL}/${code}`, original_url: url });
});

// รายการลิงก์ทั้งหมด + จำนวนคลิก
app.get('/api/links', (req, res) => {
    const links = db.prepare(`
    SELECT l.code, l.original_url, l.created_at, COUNT(c.id) AS click_count
    FROM links l
    LEFT JOIN clicks c ON c.link_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all();

    res.json(links.map(l => ({ ...l, short_url: `${BASE_URL}/${l.code}` })));
});

// สถิติของลิงก์เดียว (คลิกรายวัน + referrer ยอดนิยม)
app.get('/api/links/:code/stats', (req, res) => {
    const link = db.prepare('SELECT * FROM links WHERE code = ?').get(req.params.code);
    if (!link) return res.status(404).json({ error: 'ไม่พบลิงก์นี้' });

    const total = db.prepare('SELECT COUNT(*) AS n FROM clicks WHERE link_id = ?').get(link.id).n;

    const daily = db.prepare(`
    SELECT date(clicked_at) AS day, COUNT(*) AS clicks
    FROM clicks WHERE link_id = ?
    GROUP BY day ORDER BY day
  `).all(link.id);

    const referrers = db.prepare(`
    SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*) AS clicks
    FROM clicks WHERE link_id = ?
    GROUP BY referrer ORDER BY clicks DESC LIMIT 5
  `).all(link.id);

    res.json({ code: link.code, original_url: link.original_url, total_clicks: total, daily, referrers });
});

// redirect + เก็บข้อมูลคลิก
app.get('/:code', (req, res) => {
    const link = db.prepare('SELECT * FROM links WHERE code = ?').get(req.params.code);
    if (!link) return res.status(404).json({ error: 'ไม่พบลิงก์นี้' });

    db.prepare('INSERT INTO clicks (link_id, referrer, user_agent) VALUES (?, ?, ?)').run(
        link.id,
        req.get('referer') || null,
        req.get('user-agent') || null
    );

    res.redirect(link.original_url);
});

app.listen(PORT, () => console.log(`Server running at ${BASE_URL}`));