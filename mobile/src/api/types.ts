export interface User {
  id: string;
  phone: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  user_id: string;
  friend_name: string;
  amount: number;
  due_date: string;
  is_repaid: boolean;
  repaid_at: string | null;
  receipt_url: string | null;
  created_at: string;
  is_overdue: boolean;
}

export interface LoanSummary {
  total_lent: number;
  total_repaid: number;
  total_outstanding: number;
  overdue_amount: number;
}

export interface CreateLoanPayload {
  friend_name: string;
  amount: number;
  due_date: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiMessageResponse {
  message: string;
}
