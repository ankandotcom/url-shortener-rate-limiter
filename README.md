# 🔗 URL Shortener with Rate Limiter

A full-stack URL shortener with rate limiting, analytics, and a modern UI.

**[Live Demo Link →](https://url-shortener-rate-limiter.vercel.app/)**
--

## Tech Stack
- **Frontend**: HTML, Tailwind CSS, Vanilla JS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Rate Limiting**: express-rate-limit + custom IP-based MongoDB tracking

## Features
- Shorten long URLs instantly
- Custom slug support
- Rate limiting (10 requests/15 min per IP)
- Click analytics (total clicks, last accessed)
- QR code generation
- Copy to clipboard
- Redirect with 301

## Project Structure
```
url-shortener/
├── server/
│   ├── index.js          # Express entry point
│   ├── models/
│   │   ├── Url.js        # URL schema
│   │   └── RateLimit.js  # Custom rate limit log schema
│   ├── routes/
│   │   └── url.js        # API routes
│   └── middleware/
│       └── rateLimiter.js # Rate limiting middleware
├── public/
│   └── index.html        # Frontend UI
├── .env.example
└── package.json
```

## Setup
```bash
npm install
cp .env.example .env
# Add your MONGO_URI to .env
npm run dev
```

## API Endpoints
| Method | Endpoint         | Description              |
|--------|-----------------|--------------------------|
| POST   | /api/shorten    | Create short URL         |
| GET    | /:code          | Redirect to original URL |
| GET    | /api/stats/:code| Get URL analytics        |
| GET    | /api/urls       | List all URLs            |
