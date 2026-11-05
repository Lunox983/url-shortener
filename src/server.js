const express = require('express');
const { nanoid } = require('nanoid');
const db = require('./db');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());
// จำกัดการสร้างลิงก์: 10 ครั้ง ต่อ 1 นาที ต่อ IP
const createLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'สร้างลิงก์ถี่เกินไป ลองใหม่ในอีกสักครู่' },
});

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// สร้างลิงก์สั้น
app.post('/api/links', createLimiter, (req, res) => {
    const { url, alias } = req.body;

    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
        return res.status(400).json({ error: 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)' });
    }

    let code;
    if (alias) {
        if (!/^[A-Za-z0-9_-]{3,30}$/.test(alias) || alias.toLowerCase() === 'api') {
            return res.status(400).json({ error: 'alias ใช้ได้เฉพาะ a-z, 0-9, - และ _ ความยาว 3-30 ตัว' });
        }
        const exists = db.prepare('SELECT 1 FROM links WHERE code = ?').get(alias);
        if (exists) return res.status(409).json({ error: 'alias นี้ถูกใช้แล้ว' });
        code = alias;
    } else {
        code = nanoid(7);
    }
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