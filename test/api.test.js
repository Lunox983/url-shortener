process.env.DB_PATH = ':memory:';
process.env.RATE_LIMIT = '1000';

const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');

let server, base;

test.before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}`;
});

test.after(() => server.close());

const post = (body) =>
    fetch(`${base}/api/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

test('สร้างลิงก์สั้นได้', async () => {
    const res = await post({ url: 'https://example.com' });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.code.length, 7);
});

test('URL ไม่ถูกต้องต้องได้ 400', async () => {
    const res = await post({ url: 'not-a-url' });
    assert.strictEqual(res.status, 400);
});

test('alias ซ้ำต้องได้ 409', async () => {
    await post({ url: 'https://example.com', alias: 'dup-test' });
    const res = await post({ url: 'https://example.com', alias: 'dup-test' });
    assert.strictEqual(res.status, 409);
});

test('redirect ไปปลายทางและนับคลิก', async () => {
    await post({ url: 'https://example.com/target', alias: 'go-test' });
    const res = await fetch(`${base}/go-test`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), 'https://example.com/target');

    const stats = await (await fetch(`${base}/api/links/go-test/stats`)).json();
    assert.strictEqual(stats.total_clicks, 1);
});

test('รหัสที่ไม่มีอยู่ต้องได้ 404', async () => {
    const res = await fetch(`${base}/no-such-code`, { redirect: 'manual' });
    assert.strictEqual(res.status, 404);
});