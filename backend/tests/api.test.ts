import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import app from "../src/app.js";
import prisma from "../src/db/prisma.js";

const PHONE_A = "+919999900001";
const PHONE_B = "+919999900002";

describe("MiniLedger Backend End-to-End Tests", () => {
  let tokenA: string;
  let userAId: string;
  let tokenB: string;
  let userBId: string;
  let loanAId: string;
  let overdueLoanAId: string;

  beforeAll(async () => {
    // Clean up test data before running
    await prisma.loan.deleteMany({
      where: {
        user: {
          phone: { in: [PHONE_A, PHONE_B] },
        },
      },
    });
    await prisma.otp.deleteMany({
      where: { phone: { in: [PHONE_A, PHONE_B] } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [PHONE_A, PHONE_B] } },
    });
  });

  afterAll(async () => {
    // Clean up test data after running
    await prisma.loan.deleteMany({
      where: {
        user: {
          phone: { in: [PHONE_A, PHONE_B] },
        },
      },
    });
    await prisma.otp.deleteMany({
      where: { phone: { in: [PHONE_A, PHONE_B] } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [PHONE_A, PHONE_B] } },
    });
    await prisma.$disconnect();
  });

  // 1. OTP request/verify flow
  describe("1. OTP Authentication Flow", () => {
    it("should request OTP successfully for User A", async () => {
      const res = await request(app)
        .post("/auth/request-otp")
        .send({ phone: PHONE_A });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");

      const otpRecord = await prisma.otp.findFirst({
        where: { phone: PHONE_A, used: false },
        orderBy: { createdAt: "desc" },
      });
      expect(otpRecord).toBeDefined();
      expect(otpRecord?.code).toHaveLength(6);
    });

    it("should reject verify-otp with incorrect OTP code", async () => {
      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phone: PHONE_A, otp: "000000" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should verify OTP, create User A, and return a JWT token", async () => {
      const otpRecord = await prisma.otp.findFirst({
        where: { phone: PHONE_A, used: false },
        orderBy: { createdAt: "desc" },
      });

      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phone: PHONE_A, otp: otpRecord!.code });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.phone).toBe(PHONE_A);

      tokenA = res.body.token;
      userAId = res.body.user.id;
    });

    it("should enforce single-use OTP (replay attack fails)", async () => {
      const otpRecord = await prisma.otp.findFirst({
        where: { phone: PHONE_A },
        orderBy: { createdAt: "desc" },
      });

      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phone: PHONE_A, otp: otpRecord!.code });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should authenticate User B for isolation tests", async () => {
      await request(app).post("/auth/request-otp").send({ phone: PHONE_B });
      const otpRecord = await prisma.otp.findFirst({
        where: { phone: PHONE_B, used: false },
        orderBy: { createdAt: "desc" },
      });

      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phone: PHONE_B, otp: otpRecord!.code });

      expect(res.status).toBe(200);
      tokenB = res.body.token;
      userBId = res.body.user.id;
    });
  });

  // 2. Rejecting invalid input
  describe("2. Validation & Input Rejection", () => {
    it("should reject request-otp with invalid phone format", async () => {
      const res = await request(app)
        .post("/auth/request-otp")
        .send({ phone: "12345" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject loan operations without auth token", async () => {
      const res = await request(app).get("/loans");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject loan creation with empty friend_name", async () => {
      const res = await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          friend_name: "   ",
          amount: 500,
          due_date: "2026-11-01T00:00:00.000Z",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("friend_name cannot be empty");
    });

    it("should reject loan creation with non-positive amount", async () => {
      const res = await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          friend_name: "John",
          amount: -100,
          due_date: "2026-11-01T00:00:00.000Z",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("amount must be greater than 0");
    });

    it("should reject loan creation with invalid due_date", async () => {
      const res = await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          friend_name: "John",
          amount: 100,
          due_date: "not-a-valid-date",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("due_date must be a valid date string");
    });
  });

  // 3. Creating loans
  describe("3. Creating Loans", () => {
    it("should create a valid active loan (not overdue)", async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          friend_name: "Charlie",
          amount: 1200,
          due_date: futureDate,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.friend_name).toBe("Charlie");
      expect(typeof res.body.amount).toBe("number");
      expect(res.body.amount).toBe(1200);
      expect(res.body.is_repaid).toBe(false);
      expect(res.body.is_overdue).toBe(false);

      loanAId = res.body.id;
    });

    it("should create a loan with past due date and compute is_overdue as true", async () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post("/loans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          friend_name: "Dana",
          amount: 800,
          due_date: pastDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.friend_name).toBe("Dana");
      expect(res.body.amount).toBe(800);
      expect(res.body.is_repaid).toBe(false);
      expect(res.body.is_overdue).toBe(true);

      overdueLoanAId = res.body.id;
    });

    it("should list loans in newest-first order", async () => {
      const res = await request(app)
        .get("/loans")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Newest (Dana) should be first
      expect(res.body[0].id).toBe(overdueLoanAId);
      expect(res.body[1].id).toBe(loanAId);
      expect(typeof res.body[0].amount).toBe("number");
    });
  });

  // 4. Repay flow
  describe("4. Repay Flow", () => {
    it("should return 404 when attempting to repay non-existent loan", async () => {
      const res = await request(app)
        .patch("/loans/00000000-0000-0000-0000-000000000000/repay")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should mark loan as repaid and record repaid_at", async () => {
      const res = await request(app)
        .patch(`/loans/${loanAId}/repay`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(loanAId);
      expect(res.body.is_repaid).toBe(true);
      expect(res.body.repaid_at).toBeDefined();
      expect(res.body.is_overdue).toBe(false);
    });

    it("should return 400 when attempting to repay an already repaid loan", async () => {
      const res = await request(app)
        .patch(`/loans/${loanAId}/repay`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Loan is already repaid");
    });
  });

  // 5. Summary calculation (including overdue)
  describe("5. Summary Aggregation Calculation", () => {
    it("should return accurate aggregated summary for User A via SQL aggregation", async () => {
      const res = await request(app)
        .get("/loans/summary")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total_lent: 2000,
        total_repaid: 1200,
        total_outstanding: 800,
        overdue_amount: 800,
      });

      // Verify all fields are numbers
      expect(typeof res.body.total_lent).toBe("number");
      expect(typeof res.body.total_repaid).toBe("number");
      expect(typeof res.body.total_outstanding).toBe("number");
      expect(typeof res.body.overdue_amount).toBe("number");
    });
  });

  // 6. User Isolation
  describe("6. Multi-User Isolation", () => {
    it("should ensure User B cannot see User A's loans", async () => {
      const res = await request(app)
        .get("/loans")
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should ensure User B's summary reflects only their own data (zeros)", async () => {
      const res = await request(app)
        .get("/loans/summary")
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total_lent: 0,
        total_repaid: 0,
        total_outstanding: 0,
        overdue_amount: 0,
      });
    });

    it("should prevent User B from repaying User A's loan (404 Not Found)", async () => {
      const res = await request(app)
        .patch(`/loans/${overdueLoanAId}/repay`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Loan not found");
    });

    it("should prevent User B from uploading receipt to User A's loan (404 Not Found)", async () => {
      const res = await request(app)
        .post(`/loans/${overdueLoanAId}/receipt`)
        .set("Authorization", `Bearer ${tokenB}`)
        .attach("receipt", Buffer.from("fake-png-content"), "receipt.png");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Loan not found");
    });
  });

  // 7. Receipt Upload Flow
  describe("7. Receipt Upload & Static File Serving", () => {
    it("should reject non-image file uploads", async () => {
      const res = await request(app)
        .post(`/loans/${loanAId}/receipt`)
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("receipt", Buffer.from("plain text content"), "document.txt");

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Only JPG and PNG image files are allowed");
    });

    it("should upload a valid PNG receipt and store path in receipt_url", async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const res = await request(app)
        .post(`/loans/${loanAId}/receipt`)
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("receipt", pngBuffer, "test-receipt.png");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(loanAId);
      expect(res.body.receipt_url).toMatch(/^\/uploads\/receipt-.*\.png$/);

      // Verify file is served statically
      const fileRes = await request(app).get(res.body.receipt_url);
      expect(fileRes.status).toBe(200);
      expect(fileRes.header["content-type"]).toContain("image/png");
    });
  });
});
