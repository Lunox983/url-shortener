# URL Shortener

เว็บย่อลิงก์พร้อมระบบสถิติการคลิก สร้างด้วย Node.js, Express, SQLite และ React

## Features

- ย่อลิงก์ พร้อมตั้ง alias เองได้
- เก็บสถิติทุกคลิก (วันเวลา, referrer, user agent)
- Dashboard แสดงกราฟคลิกรายวันและ referrer ยอดนิยม
- Rate limiting กันการสร้างลิงก์ถี่เกินไป (10 ครั้ง/นาที/IP)
- มี automated tests

## Live Demo

https://url-shortener-aqax.onrender.com

> หมายเหตุ: รันบนแพลนฟรีของ Render เข้าครั้งแรกอาจช้าประมาณ 50 วินาที และข้อมูลจะถูกรีเซ็ตเมื่อเซิร์ฟเวอร์ restart

## Tech Stack

- **Backend:** Node.js, Express 5, better-sqlite3
- **Frontend:** React (Vite), Recharts
- **Test:** node:test

## Getting Started

ต้องมี Node.js 18 ขึ้นไป

```bash
# ติดตั้ง
npm install
cd client && npm install && cd ..

# รัน backend (http://localhost:3000)
node src/server.js

# รัน frontend ในอีก terminal (http://localhost:5173)
cd client
npm run dev
```

## API

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/links` | สร้างลิงก์ body: `{ "url": "...", "alias": "..." }` (alias ไม่บังคับ) |
| GET | `/api/links` | รายการลิงก์ทั้งหมดพร้อมจำนวนคลิก |
| GET | `/api/links/:code/stats` | สถิติคลิกรายวันและ referrer |
| GET | `/:code` | redirect ไปยังลิงก์ปลายทางและบันทึกคลิก |

## Testing

```bash
npm test
```

## License

ISC