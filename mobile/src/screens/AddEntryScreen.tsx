import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { api } from "../api/client";

export const AddEntryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Photo library access is required to attach receipt photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Image Picker Error", err.message || "Failed to select photo.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is required to take a receipt photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err.message || "Failed to capture photo.");
    }
  };

  const onDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date | undefined
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    // 1. Validation before submitting
    const trimmedName = friendName.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter the friend's name");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid loan amount greater than 0");
      return;
    }

    if (!dueDate || isNaN(dueDate.getTime())) {
      setErrorMessage("Please select a valid due date");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Create loan record
      const createdLoan = await api.createLoan({
        friend_name: trimmedName,
        amount: parsedAmount,
        due_date: dueDate.toISOString(),
      });

      // If optional receipt photo was selected, upload it
      if (receiptUri) {
        try {
          await api.uploadReceipt(createdLoan.id, receiptUri);
        } catch (uploadErr: any) {
          Alert.alert(
            "Loan Created with Upload Warning",
            `The loan was created, but receipt photo failed to upload: ${uploadErr.message}`
          );
          navigation.goBack();
          return;
        }
      }

      Alert.alert("Success", `Loan recorded for ${trimmedName}!`);
      navigation.goBack();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create loan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 20) + 24 },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.formTitle}>Record New Loan</Text>
        <Text style={styles.formSubtitle}>
          Keep track of money lent to your friend
        </Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Friend Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Friend Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            value={friendName}
            onChangeText={(val) => {
              setFriendName(val);
              setErrorMessage(null);
            }}
            editable={!submitting}
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 150.00"
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              setErrorMessage(null);
            }}
            keyboardType="decimal-pad"
            editable={!submitting}
          />
        </View>

        {/* Due Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            disabled={submitting}
          >
            <Text style={styles.datePickerButtonText}>
              📅 {dueDate.toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Optional Receipt Photo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Receipt Photo (Optional)</Text>

          {receiptUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setReceiptUri(null)}
                disabled={submitting}
              >
                <Text style={styles.removeImageBtnText}>Remove Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickImage}
                disabled={submitting}
              >
                <Text style={styles.photoActionBtnText}>🖼️ Choose Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handleTakePhoto}
                disabled={submitting}
              >
                <Text style={styles.photoActionBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save Loan Entry</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
  },
  formSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
  },
  datePickerButton: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  datePickerButtonText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  photoActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
  },
  previewContainer: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiptPreview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  removeImageBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  removeImageBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    height: 50,
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBox: {
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
});
