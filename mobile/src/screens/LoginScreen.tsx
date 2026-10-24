import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0
  );

  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed === "+") {
      setErrorMessage("Please enter your phone number in E.164 format");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await api.requestOtp(trimmed);
      setStep("otp");
      Alert.alert(
        "OTP Sent",
        "Mock OTP generated! Check your backend server console to view the 6-digit code."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.verifyOtp(phone.trim(), trimmedOtp);
      await login(response.token, response.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUrl = () => {
    api.setBaseUrl(serverUrl);
    setShowConfig(false);
    Alert.alert("Server URL Updated", `API Base URL set to:\n${serverUrl}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topSafePadding + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.headerArea}>
            <Text style={styles.appTitle}>MiniLedger</Text>
            <Text style={styles.appSubtitle}>
              Track money lent to friends with ease
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {step === "phone" ? (
            <View style={styles.stepContainer}>
              <Text style={styles.label}>Phone Number (E.164 Format)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  setErrorMessage(null);
                }}
                placeholder="+919876543210"
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!loading}
              />
              <Text style={styles.helperText}>
                Example: +919876543210 or +14155552671
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stepContainer}>
              <Text style={styles.label}>Enter 6-digit OTP</Text>
              <Text style={styles.otpSentNotice}>
                Sent to <Text style={styles.boldText}>{phone}</Text>
              </Text>

              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/\D/g, "").slice(0, 6));
                  setErrorMessage(null);
                }}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setStep("phone");
                  setOtp("");
                  setErrorMessage(null);
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  Change Phone Number
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? "▲ Hide Server Settings" : "▼ Server Settings"}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>API Base URL (Host LAN IP):</Text>
              <TextInput
                style={styles.configInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.configSaveBtn}
                onPress={handleUpdateUrl}
              >
                <Text style={styles.configSaveBtnText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerArea: {
    alignItems: "center",
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center",
  },
  stepContainer: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
  },
  otpInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    marginBottom: 16,
  },
  otpSentNotice: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "700",
    color: "#1F2937",
  },
  primaryButton: {
    height: 50,
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500",
  },
  configToggle: {
    marginTop: 24,
    alignSelf: "center",
  },
  configToggleText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  configBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
  },
  configInput: {
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#111827",
    marginBottom: 8,
  },
  configSaveBtn: {
    backgroundColor: "#374151",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  configSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
