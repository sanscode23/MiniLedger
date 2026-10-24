import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { Loan, LoanSummary } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type HomeScreenNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeScreenNavProp>();
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);

  // Safe area top calculation: accounts for Android status bar and iOS notches
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0
  );

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const [summaryData, loansData] = await Promise.all([
        api.getLoansSummary(),
        api.getLoans(),
      ]);

      setSummary(summaryData);
      setLoans(loansData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load loans data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const handleMarkRepaid = async (id: string, friendName: string) => {
    Alert.alert(
      "Confirm Repayment",
      `Mark loan for ${friendName} as fully repaid?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Repaid",
          style: "default",
          onPress: async () => {
            setRepayingId(id);
            try {
              await api.repayLoan(id);
              await fetchData();
            } catch (err: any) {
              Alert.alert(
                "Repayment Error",
                err.message || "Failed to mark loan as repaid"
              );
            } finally {
              setRepayingId(null);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of MiniLedger?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() },
    ]);
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "$0.00";
    return `$${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderSummaryCard = () => {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>Ledger Overview</Text>
            <Text style={styles.summarySubtitle}>Real-time loan balance</Text>
          </View>
          <View style={styles.phoneBadge}>
            <Text style={styles.summaryPhone}>{user?.phone || "User"}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Lent</Text>
            <Text style={[styles.statValue, styles.totalLentText]}>
              {formatCurrency(summary?.total_lent)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Repaid</Text>
            <Text style={[styles.statValue, styles.totalRepaidText]}>
              {formatCurrency(summary?.total_repaid)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Overdue</Text>
            <Text style={[styles.statValue, styles.overdueStatText]}>
              {formatCurrency(summary?.overdue_amount)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLoanItem = ({ item }: { item: Loan }) => {
    const isOverdue = item.is_overdue;
    const isRepaid = item.is_repaid;

    return (
      <View
        style={[
          styles.loanCard,
          isOverdue && styles.overdueLoanCard,
          isRepaid && styles.repaidLoanCard,
        ]}
      >
        <View style={styles.loanCardHeader}>
          <View style={styles.friendInfo}>
            <Text
              style={[
                styles.friendName,
                isRepaid && styles.repaidFriendName,
              ]}
              numberOfLines={1}
            >
              {item.friend_name}
            </Text>
            <View style={styles.dueDateBadge}>
              <Text style={styles.dueDateText}>
                Due: {formatDate(item.due_date)}
              </Text>
            </View>
          </View>

          <View style={styles.loanAmountArea}>
            <Text
              style={[
                styles.amountText,
                isRepaid && styles.repaidAmountText,
              ]}
            >
              {formatCurrency(item.amount)}
            </Text>

            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>⚠️ OVERDUE</Text>
              </View>
            )}

            {isRepaid && (
              <View style={styles.repaidBadge}>
                <Text style={styles.repaidBadgeText}>✓ Repaid</Text>
              </View>
            )}
          </View>
        </View>

        {item.receipt_url && (
          <View style={styles.receiptContainer}>
            <Image
              source={{
                uri: item.receipt_url.startsWith("http")
                  ? item.receipt_url
                  : `${api.getBaseUrl()}${item.receipt_url}`,
              }}
              style={styles.receiptThumbnail}
              resizeMode="cover"
            />
            <View>
              <Text style={styles.receiptLabel}>Receipt Attached</Text>
              <Text style={styles.receiptSubtext}>Tap image to inspect</Text>
            </View>
          </View>
        )}

        {!isRepaid && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.markRepaidBtn,
                repayingId === item.id && styles.buttonDisabled,
              ]}
              onPress={() => handleMarkRepaid(item.id, item.friend_name)}
              disabled={repayingId === item.id}
              activeOpacity={0.8}
            >
              {repayingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.markRepaidBtnText}>✓ Mark Repaid</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Safe Area Insets */}
      <View style={[styles.topBar, { paddingTop: topSafePadding + 8 }]}>
        <View style={styles.brandContainer}>
          <View style={styles.brandIconWrapper}>
            <Text style={styles.brandIcon}>📒</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>MiniLedger</Text>
            <Text style={styles.brandSubtitle}>Personal Ledger</Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.addLoanButton}
            onPress={() => navigation.navigate("AddEntry")}
            activeOpacity={0.8}
          >
            <Text style={styles.addLoanButtonText}>+ Add Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => fetchData()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading loans...</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderSummaryCard}
          renderItem={renderLoanItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={["#4F46E5"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={styles.emptyTitle}>No loans recorded yet</Text>
              <Text style={styles.emptySubtitle}>
                Keep track of money lent to friends. Tap the button below to add your first entry.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate("AddEntry")}
              >
                <Text style={styles.emptyActionBtnText}>+ Add First Loan</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandIcon: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addLoanButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  addLoanButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    paddingBottom: 10,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  summarySubtitle: {
    color: "#A5B4FC",
    fontSize: 11,
    marginTop: 2,
  },
  phoneBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryPhone: {
    color: "#E0E7FF",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  statLabel: {
    color: "#C7D2FE",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  totalLentText: {
    color: "#FFFFFF",
  },
  totalRepaidText: {
    color: "#34D399",
  },
  overdueStatText: {
    color: "#F87171",
  },
  loanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  overdueLoanCard: {
    backgroundColor: "#FFF1F2",
    borderColor: "#F43F5E",
    borderWidth: 1.5,
  },
  repaidLoanCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  loanCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  friendInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  repaidFriendName: {
    color: "#475569",
  },
  dueDateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueDateText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  loanAmountArea: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  repaidAmountText: {
    color: "#64748B",
  },
  overdueBadge: {
    backgroundColor: "#F43F5E",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  overdueBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  repaidBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  repaidBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  receiptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  receiptThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#E2E8F0",
  },
  receiptLabel: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  receiptSubtext: {
    fontSize: 10,
    color: "#94A3B8",
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  markRepaidBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  markRepaidBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    color: "#991B1B",
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: "#4338CA",
    fontSize: 14,
    fontWeight: "700",
  },
});
