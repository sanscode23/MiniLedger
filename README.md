# MiniLedger

Track money you've lent to friends. Node.js + TypeScript + PostgreSQL (Prisma) backend and a React Native (Expo) app.

Demo video: <Loom or Drive link>

## Features
- Phone login with mock OTP (OTP is printed in the backend terminal)
- Add loan entries (friend name, amount, due date, optional receipt photo)
- Mark a loan as repaid
- Summary: total lent, total repaid, overdue amount
- Overdue entries highlighted in red
- Zod validation, JWT auth, per-user data isolation

## Tech stack
Node.js, Express, TypeScript, PostgreSQL, Prisma, Zod, JWT, React Native (Expo), React Navigation, expo-secure-store

## Prerequisites
Node.js 20+, Docker Desktop (or any PostgreSQL), Expo Go on your phone (same Wi-Fi as your laptop)

## Run the backend
```bash
docker compose up -d
cd backend
cp .env.example .env      # set JWT_SECRET to any long random string
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev               # runs on http://localhost:5000
```
Not using Docker? Set `DATABASE_URL` in `.env` to any PostgreSQL connection string (e.g. a free Neon database).

## Run the mobile app
```bash
cd mobile
cp .env.example .env      # set EXPO_PUBLIC_API_URL=http://<YOUR-LAPTOP-LAN-IP>:5000
npm install
npm start
```
Scan the QR code with Expo Go. Find your LAN IP with `ipconfig` (IPv4 address). If Windows Firewall asks, allow Node.js on private networks.

## Login
Enter a phone number like `+919876543210`, tap Send OTP, then read the 6-digit OTP from the **backend terminal**.

## Environment variables
| Variable | Where | Description |
|---|---|---|
| PORT | backend | Server port (5000) |
| DATABASE_URL | backend | PostgreSQL connection string |
| JWT_SECRET | backend | Secret for signing tokens |
| EXPO_PUBLIC_API_URL | mobile | Backend URL reachable from the phone |

## API
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/request-otp | No | Generate OTP |
| POST | /auth/verify-otp | No | Verify OTP, get JWT |
| POST | /loans | Yes | Add loan |
| GET | /loans | Yes | List my loans |
| PATCH | /loans/:id/repay | Yes | Mark repaid |
| GET | /loans/summary | Yes | Totals and overdue |
| POST | /loans/:id/receipt | Yes | Upload receipt (if implemented) |

A Postman collection is in `/docs`.

## Notes
- OTP is mocked by design (no SMS provider).
- Amounts use Postgres `Decimal(12,2)`, never floats.
- <Honest line: tests done / not done, receipt upload done / not done>
