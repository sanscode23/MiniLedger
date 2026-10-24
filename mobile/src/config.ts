// MiniLedger Mobile Configuration

// Using your computer's LAN IP so physical devices & emulators can communicate with the backend
export const DEFAULT_API_BASE_URL = "http://10.101.29.70:5000";

// Configurable via EXPO_PUBLIC_API_URL or defaults to computer LAN IP
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

export const TOKEN_STORAGE_KEY = "miniledger_jwt_token";
export const USER_STORAGE_KEY = "miniledger_user_profile";
