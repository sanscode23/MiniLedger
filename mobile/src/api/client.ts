import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, TOKEN_STORAGE_KEY } from "../config";
import {
  AuthResponse,
  ApiMessageResponse,
  Loan,
  LoanSummary,
  CreateLoanPayload,
} from "./types";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public setBaseUrl(newUrl: string) {
    this.baseUrl = newUrl.replace(/\/+$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const token = await this.getToken();

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Do not set Content-Type if uploading FormData (let engine set boundary)
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : typeof data === "string" && data.length > 0
            ? data
            : `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error: any) {
      if (error.message?.includes("Network request failed")) {
        throw new Error(
          `Cannot connect to backend at ${this.baseUrl}. Check that your phone and computer are on the same Wi-Fi and port 5000 is reachable.`
        );
      }
      throw error;
    }
  }

  // Auth Endpoints
  async requestOtp(phone: string): Promise<ApiMessageResponse> {
    return this.request<ApiMessageResponse>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  }

  // Loan Endpoints
  async getLoans(): Promise<Loan[]> {
    return this.request<Loan[]>("/loans", {
      method: "GET",
    });
  }

  async getLoansSummary(): Promise<LoanSummary> {
    return this.request<LoanSummary>("/loans/summary", {
      method: "GET",
    });
  }

  async createLoan(payload: CreateLoanPayload): Promise<Loan> {
    return this.request<Loan>("/loans", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async repayLoan(id: string): Promise<Loan> {
    return this.request<Loan>(`/loans/${id}/repay`, {
      method: "PATCH",
    });
  }

  async uploadReceipt(id: string, imageUri: string): Promise<Loan> {
    const filename = imageUri.split("/").pop() || `receipt-${Date.now()}.jpg`;
    const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";

    const formData = new FormData();
    formData.append("receipt", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    return this.request<Loan>(`/loans/${id}/receipt`, {
      method: "POST",
      body: formData,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
