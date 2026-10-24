# MiniLedger - Backend API

Backend service for **MiniLedger**, an application designed to track loans and money lent to friends.

## 🚀 Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: Express 4
- **Database ORM**: Prisma ORM with PostgreSQL
- **Authentication**: JWT (`jsonwebtoken`) with Mock 6-digit OTP phone verification
- **Validation**: Zod
- **Development Engine**: `tsx` (TypeScript Execute & Watch)

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── migrations/
│   │   └── 20241024000000_init/
│   │       └── migration.sql
│   └── schema.prisma           # Prisma schema definition
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts  # Handlers for requesting and verifying OTP
│   ├── db/
│   │   └── prisma.ts           # Prisma client singleton instance
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT verification & route protection
│   │   └── error.middleware.ts # Central error handler & consistent { error: string } JSON
│   ├── routes/
│   │   ├── auth.routes.ts      # /auth endpoints
│   │   └── index.ts            # Aggregate routes & health check
│   ├── validators/
│   │   └── auth.validator.ts   # Zod validation schemas (E.164 phone & 6-digit OTP)
│   └── index.ts                # Express app initialization & server entry
├── .env.example                # Example environment variables
├── .env                        # Local environment variables
├── package.json
└── tsconfig.json
```

---

## 🗄️ Database Schema

### 1. `users`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | String / UUID | `@id @default(uuid())` | Primary key |
| `phone` | String | `@unique` | E.164 phone number |
| `created_at` | DateTime | `@default(now())` | Registration timestamp |

### 2. `otps`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | String / UUID | `@id @default(uuid())` | Primary key |
| `phone` | String | Indexed | Recipient phone number |
| `code` | String | | 6-digit numeric OTP code |
| `expires_at` | DateTime | | Expiration timestamp (5 mins) |
| `used` | Boolean | `default(false)` | Flag indicating single-use consumption |
| `created_at` | DateTime | `@default(now())` | Generation timestamp |

### 3. `loans`
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | String / UUID | `@id @default(uuid())` | Primary key |
| `user_id` | String | FK -> `users.id` (Cascade) | Lending user identifier |
| `friend_name` | String | | Name of friend borrowing money |
| `amount` | Decimal(12, 2) | | Loan amount |
| `due_date` | DateTime | | Repayment target date |
| `is_repaid` | Boolean | `default(false)` | Loan status |
| `repaid_at` | DateTime? | Nullable | Repayment completion date |
| `receipt_url` | String? | Nullable | Receipt / transaction proof attachment |
| `created_at` | DateTime | `@default(now())` | Record creation date |

---

## ⚙️ Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/miniledger?schema=public` |
| `JWT_SECRET` | Secret key for signing and verifying JWT tokens | `your-super-secret-jwt-key...` |

---

## 🛠️ How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database & Run Migrations
Make sure PostgreSQL is running on your machine and the database exists, then run:

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply database migrations
npm run prisma:migrate
```

### 3. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`.

### 4. Build and Start for Production
```bash
npm run build
npm start
```

---

## 🔒 Authentication Flow & Endpoints

### 1. Request OTP
- **Route**: `POST /auth/request-otp`
- **Request Body**:
  ```json
  {
    "phone": "+14155552671"
  }
  ```
- **Phone Format**: E.164 (e.g., `+1234567890`)
- **Behavior**:
  - Generates a random 6-digit OTP.
  - Saves OTP in database with a 5-minute expiry.
  - Logs the OTP to the server console for mock testing:
    ```
    =======================================================
                    [MOCK OTP SERVICE]                     
      Recipient Phone : +14155552671
      Generated OTP   : 654321
      Expires At      : 2026-10-24T10:45:00.000Z (5 mins)
    =======================================================
    ```
- **Response** `200 OK`:
  ```json
  {
    "message": "OTP sent successfully. Check the server console for the mock OTP code."
  }
  ```

---

### 2. Verify OTP
- **Route**: `POST /auth/verify-otp`
- **Request Body**:
  ```json
  {
    "phone": "+14155552671",
    "otp": "654321"
  }
  ```
- **Behavior**:
  - Verifies code matches active, unused OTP that hasn't expired.
  - Marks the OTP as `used: true` to prevent reuse.
  - Creates the user in `users` table if they do not exist.
  - Generates a JWT token signed with `userId` and `phone`.
- **Response** `200 OK`:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a54f1c98-132d-45f8-b3d5-226caea680e1",
      "phone": "+14155552671",
      "createdAt": "2026-10-24T10:40:00.000Z"
    }
  }
  ```

---

### 3. Consistent Error Handling
All errors follow a unified JSON shape:
```json
{
  "error": "Error description here"
}
```

Examples:
- **Validation Error (`400`)**:
  ```json
  {
    "error": "Invalid phone number format. Must follow E.164 format (e.g. +14155552671 or +919876543210)"
  }
  ```
- **Expired/Invalid OTP (`400`)**:
  ```json
  {
    "error": "Invalid OTP or code has already been used"
  }
  ```
- **Missing or Invalid Auth Token (`401`)**:
  ```json
  {
    "error": "Authentication token missing or invalid format. Expected 'Bearer <token>'"
  }
  ```

---

## 💰 Loan Endpoints (Require Bearer JWT)

All loan endpoints are protected by `authenticateToken` middleware (`Authorization: Bearer <token>`). Every user only accesses and manages their own loans. Amounts are consistently formatted as numeric values.

### 1. Create Loan
- **Route**: `POST /loans`
- **Request Body**:
  ```json
  {
    "friend_name": "Rahul",
    "amount": 500,
    "due_date": "2026-11-01T00:00:00.000Z"
  }
  ```
- **Validation**:
  - `friend_name`: string, non-empty
  - `amount`: number, strictly greater than 0
  - `due_date`: valid date string
- **Response** `201 Created`:
  ```json
  {
    "id": "c98b94ae-ee04-4130-8049-ce6a4ba73d04",
    "user_id": "3812301e-4da9-4e8e-b235-7cfa9176f152",
    "friend_name": "Rahul",
    "amount": 500,
    "due_date": "2026-11-01T00:00:00.000Z",
    "is_repaid": false,
    "repaid_at": null,
    "receipt_url": null,
    "created_at": "2026-10-24T07:06:06.813Z",
    "is_overdue": false
  }
  ```

---

### 2. List Loans
- **Route**: `GET /loans`
- **Behavior**:
  - Returns current user's loans only.
  - Ordered by newest first (`created_at` descending).
  - Dynamically calculates `is_overdue` (`!is_repaid && due_date < now`).
  - Amounts returned as numbers.
- **Response** `200 OK`:
  ```json
  [
    {
      "id": "afeb36fc-2cf5-4c51-b2c6-4adb14e97b21",
      "user_id": "3812301e-4da9-4e8e-b235-7cfa9176f152",
      "friend_name": "Amit",
      "amount": 1000,
      "due_date": "2026-10-15T00:00:00.000Z",
      "is_repaid": false,
      "repaid_at": null,
      "receipt_url": null,
      "created_at": "2026-10-24T07:06:07.379Z",
      "is_overdue": true
    }
  ]
  ```

---

### 3. Mark Loan as Repaid
- **Route**: `PATCH /loans/:id/repay`
- **Behavior**:
  - Marks loan as `is_repaid: true` and sets `repaid_at: new Date()`.
  - Returns `404 Not Found` if loan does not exist or belongs to another user.
  - Returns `400 Bad Request` if loan is already repaid (`{"error":"Loan is already repaid"}`).
- **Response** `200 OK`:
  ```json
  {
    "id": "d6752c5f-f9e8-4951-8bca-ae748a5d44a7",
    "user_id": "3812301e-4da9-4e8e-b235-7cfa9176f152",
    "friend_name": "Sneha",
    "amount": 250,
    "due_date": "2026-10-01T00:00:00.000Z",
    "is_repaid": true,
    "repaid_at": "2026-10-24T07:06:42.093Z",
    "receipt_url": null,
    "created_at": "2026-10-24T07:06:07.351Z",
    "is_overdue": false
  }
  ```

---

### 4. Loans Aggregation Summary
- **Route**: `GET /loans/summary`
- **Behavior**:
  - Computed via SQL aggregation (`SUM`, `CASE WHEN`, `COALESCE`) for the authenticated user only.
  - Returns all totals as numeric values.
- **Response** `200 OK`:
  ```json
  {
    "total_lent": 1750,
    "total_repaid": 250,
    "total_outstanding": 1500,
    "overdue_amount": 1000
  }
  ```

---

### 5. Upload Loan Receipt
- **Route**: `POST /loans/:id/receipt`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Form-Data**:
  - Field name: `receipt` (file)
  - Accepted formats: `.jpg`, `.jpeg`, `.png`
  - Max size: 5MB
- **Behavior**:
  - Saves the image to `/uploads` on the server.
  - Updates `receipt_url` on the loan (e.g. `/uploads/receipt-1729754500-123456.png`).
  - Statically serves `/uploads` so the receipt can be fetched directly at `GET http://localhost:5000/uploads/...`.
  - Returns `404` if loan is not found or not owned by user.
  - Returns `400` if file exceeds 5MB or has an invalid type.
- **Response** `200 OK`:
  ```json
  {
    "id": "c98b94ae-ee04-4130-8049-ce6a4ba73d04",
    "user_id": "3812301e-4da9-4e8e-b235-7cfa9176f152",
    "friend_name": "Rahul",
    "amount": 500,
    "due_date": "2026-11-01T00:00:00.000Z",
    "is_repaid": false,
    "repaid_at": null,
    "receipt_url": "/uploads/receipt-1729754500000-123456789.png",
    "created_at": "2026-10-24T07:06:06.813Z",
    "is_overdue": false
  }
  ```

---

## 🧪 Running Tests

A comprehensive Jest + Supertest test suite is included in `tests/api.test.ts`.

Ensure the PostgreSQL database is running via Docker, then run:

```bash
npm test
```

This runs 23 automated tests covering:
- Mock OTP generation and verification
- Single-use OTP replay protection
- Input validation rejection (empty names, negative amounts, invalid dates, malformed phone numbers)
- Protected route authentication checks (missing/invalid tokens)
- Loan creation, dynamic `is_overdue` calculation, and newest-first listing
- Loan repayment flow and 400 rejection for already-repaid loans
- SQL aggregation summary calculations (total lent, total repaid, total outstanding, overdue amount)
- Strict multi-user data isolation
- Receipt file upload with validation (reject non-image / oversized files) and static serving verification
