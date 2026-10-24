import { Loan } from "@prisma/client";
import prisma from "../db/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { CreateLoanInput } from "../validators/loan.validator.js";

export interface FormattedLoan {
  id: string;
  user_id: string;
  friend_name: string;
  amount: number;
  due_date: Date;
  is_repaid: boolean;
  repaid_at: Date | null;
  receipt_url: string | null;
  created_at: Date;
  is_overdue: boolean;
}

export interface LoanSummary {
  total_lent: number;
  total_repaid: number;
  total_outstanding: number;
  overdue_amount: number;
}

export const formatLoan = (loan: Loan): FormattedLoan => {
  const isOverdue = !loan.isRepaid && new Date(loan.dueDate) < new Date();
  return {
    id: loan.id,
    user_id: loan.userId,
    friend_name: loan.friendName,
    amount: Number(loan.amount),
    due_date: loan.dueDate,
    is_repaid: loan.isRepaid,
    repaid_at: loan.repaidAt,
    receipt_url: loan.receiptUrl,
    created_at: loan.createdAt,
    is_overdue: isOverdue,
  };
};

export const createLoan = async (
  userId: string,
  input: CreateLoanInput
): Promise<FormattedLoan> => {
  const loan = await prisma.loan.create({
    data: {
      userId,
      friendName: input.friend_name,
      amount: input.amount,
      dueDate: new Date(input.due_date),
    },
  });

  return formatLoan(loan);
};

export const getUserLoans = async (userId: string): Promise<FormattedLoan[]> => {
  const loans = await prisma.loan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return loans.map(formatLoan);
};

export const repayLoan = async (
  userId: string,
  loanId: string
): Promise<FormattedLoan> => {
  const loan = await prisma.loan.findFirst({
    where: {
      id: loanId,
      userId,
    },
  });

  if (!loan) {
    throw new AppError("Loan not found", 404);
  }

  if (loan.isRepaid) {
    throw new AppError("Loan is already repaid", 400);
  }

  const updatedLoan = await prisma.loan.update({
    where: { id: loanId },
    data: {
      isRepaid: true,
      repaidAt: new Date(),
    },
  });

  return formatLoan(updatedLoan);
};

export const attachReceipt = async (
  userId: string,
  loanId: string,
  receiptUrl: string
): Promise<FormattedLoan> => {
  const loan = await prisma.loan.findFirst({
    where: {
      id: loanId,
      userId,
    },
  });

  if (!loan) {
    throw new AppError("Loan not found", 404);
  }

  const updatedLoan = await prisma.loan.update({
    where: { id: loanId },
    data: {
      receiptUrl,
    },
  });

  return formatLoan(updatedLoan);
};

export const getLoansSummary = async (userId: string): Promise<LoanSummary> => {
  const summaryResult = await prisma.$queryRaw<
    Array<{
      total_lent: string | number | null;
      total_repaid: string | number | null;
      total_outstanding: string | number | null;
      overdue_amount: string | number | null;
    }>
  >`
    SELECT
      COALESCE(SUM(amount), 0)::numeric AS total_lent,
      COALESCE(SUM(CASE WHEN is_repaid = true THEN amount ELSE 0 END), 0)::numeric AS total_repaid,
      COALESCE(SUM(CASE WHEN is_repaid = false THEN amount ELSE 0 END), 0)::numeric AS total_outstanding,
      COALESCE(SUM(CASE WHEN is_repaid = false AND due_date < NOW() THEN amount ELSE 0 END), 0)::numeric AS overdue_amount
    FROM loans
    WHERE user_id = ${userId}
  `;

  const row = summaryResult[0];

  return {
    total_lent: Number(row?.total_lent ?? 0),
    total_repaid: Number(row?.total_repaid ?? 0),
    total_outstanding: Number(row?.total_outstanding ?? 0),
    overdue_amount: Number(row?.overdue_amount ?? 0),
  };
};
