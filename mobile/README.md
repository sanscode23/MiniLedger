# MiniLedger Mobile App

Cross-platform mobile application for **MiniLedger** built with **React Native (Expo)** and **TypeScript**.

## 📱 Features

1. **Authentication (Login Screen)**:
   - Phone input with E.164 validation.
   - "Send OTP" triggers mock OTP generation on the backend.
   - OTP input (6-digit numeric) verifies code and returns JWT token.
   - Persists JWT token & user profile securely using `expo-secure-store`.
   - In-app configurable Backend Base URL (defaults to your LAN IP for physical device testing).

2. **Dashboard (Home Screen)**:
   - **Summary Card**: Real-time aggregated stats (`Total Lent`, `Total Repaid`, `Overdue`).
   - **Loan List**: FlatList ordered newest-first.
   - **Overdue Visuals**: Red border/tint and an **OVERDUE** badge for unrepaid past-due loans.
   - **Repaid Visuals**: Muted styling with a `✓ Repaid` checkmark badge.
   - **Mark Repaid Action**: One-tap repayment button for active loans.
   - **Receipt Preview**: Visual indicator/thumbnail if a receipt image is attached.
   - **Pull-to-Refresh**: Seamless gesture to refresh ledger data.

3. **Record Entry (Add Entry Screen)**:
   - Friend name input (validated non-empty).
   - Amount input (validated strictly positive numeric).
   - Due date picker using `@react-native-community/datetimepicker`.
   - Optional receipt photo picker with `expo-image-picker` (choose from gallery or capture with camera).
   - Complete input validation prior to submission.

---

## 🛠️ Tech Stack

- **Framework**: React Native 0.88 with Expo SDK 58
- **Language**: TypeScript
- **Navigation**: `@react-navigation/native` & `@react-navigation/native-stack`
- **Storage**: `expo-secure-store`
- **Camera / Gallery**: `expo-image-picker`
- **Date Picker**: `@react-native-community/datetimepicker`

---

## ⚙️ Configuration (Base URL)

For physical mobile devices running **Expo Go**, `localhost` points to the mobile device itself, so you must use your computer's **LAN IP**:

- Default configured IP: `http://10.101.29.70:5000`
- You can change it via `.env`:
  ```env
  EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000
  ```
- Or dynamically update it directly inside the app under the **Server Settings** toggle on the login screen.

---

## 🚀 How to Run Locally

### 1. Ensure the Backend and Database are Running
From the project root:
```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Start Backend Server
cd backend
npm run dev
```

### 2. Start Expo Development Server
In a new terminal:
```bash
cd mobile
npm start
```

### 3. Open on Your Device
- **Physical Device**: Scan the QR code using the **Expo Go** app (Android) or the Camera app (iOS). Ensure both your phone and computer are connected to the same Wi-Fi network.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal (macOS only).
- **Web**: Press `w` in the terminal.
