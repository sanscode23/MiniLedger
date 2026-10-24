import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { AddEntryScreen } from "../screens/AddEntryScreen";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AddEntry: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: "#1F2937",
        },
        headerTintColor: "#4F46E5",
        contentStyle: {
          backgroundColor: "#F3F4F6",
        },
      }}
    >
      {token ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddEntry"
            component={AddEntryScreen}
            options={{
              title: "Add Loan Entry",
              headerBackTitle: "Back",
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
});
