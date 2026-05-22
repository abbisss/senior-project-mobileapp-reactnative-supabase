import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserContext } from "../src/contexts/UserContext.js";
import { supabase } from "../src/lib/supabase-client.js";

WebBrowser.maybeCompleteAuthSession();

const createSessionFromUrl = async (url) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    console.error("Session error:", errorCode);
    return { error: errorCode };
  }

  const { access_token, refresh_token } = params;

  if (!access_token) {
    console.log("No access token in URL");
    return { error: "No access token" };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    console.error("Set session error:", error.message);
    return { error: error.message };
  }

  return { session: data.session, error: null };
};

export default function Index() {
  const [loginMode, setLoginMode] = useState(true);
  const [registerMode, setRegisterMode] = useState(false);

  const [email, setEmail] = useState("abbasscodingpc2@gmail.com");
  const [password, setPassword] = useState("abbass123");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerGoogleLoading, setRegisterGoogleLoading] = useState(false);
  const [name, setName] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    const isEmail = /\S+@\S+\.\S+/.test(email);
    setLoginError("");

    if (!email || !password) {
      setLoginError("Please enter both email and password!");
      setLoading(false);
      return;
    }
    if (isEmail) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("Login error:", error.message);
        setLoginError("Invalid email or password! Please try again.");
        setLoading(false);
        return;
      } else {
        router.replace("/tabs/home");
        setLoading(false);
      }
    } else {
      setLoginError(
        "Invalid email format! Please enter a valid email address.",
      );
      setLoading(false);
      return;
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError("");

    try {
      const redirectUri = AuthSession.makeRedirectUri();

      console.log("Redirect URI:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.log("OAuth error:", error.message);
        setLoginError("Google sign-in failed. Please try again.");
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
      );

      if (result.type === "success") {
        const { session, error: sessionError } = await createSessionFromUrl(
          result.url,
        );
        if (sessionError) {
          setLoginError("Failed to complete sign-in. Please try again.");
        } else {
          console.log("Google login success");
          router.replace("/tabs/home");
        }
      } else {
        setLoginError("Google sign-in was cancelled or failed.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setLoginError("An unexpected error occurred.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegisterLoading(true);
    setRegisterError("");

    const isEmail = /\S+@\S+\.\S+/.test(registerEmail);

    try {
      // Validation
      if (!name || !registerEmail || !registerPassword || !confirmPassword) {
        setRegisterError("Please fill in all fields!");
        return;
      }

      if (!isEmail) {
        setRegisterError("Please enter a valid email address!");
        return;
      }

      if (registerPassword.length < 6) {
        setRegisterError("Password must be at least 6 characters long!");
        return;
      }

      if (registerPassword !== confirmPassword) {
        setRegisterError("Passwords do not match!");
        return;
      }

      // Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (authError) {
        console.error("Registration error:", authError.message);
        setRegisterError(authError.message);
        return;
      }

      // Create user record
      const { error: userError } = await supabase.from("User").insert([
        {
          auth_id: authData.user?.id,
          name: name,
          email: registerEmail,
          role: "regular",
        },
      ]);

      if (userError) {
        console.error("User table error:", userError.message);
        setRegisterError("Account created, but profile setup failed.");
        return;
      }

      // Success
      setRegisterMode(false);
      setLoginMode(true);

      alert(
        "Account created successfully! Please check your email for verification.",
      );
      router.replace("/tabs/home");
    } catch (error) {
      console.error(error);
      setRegisterError("Something went wrong. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleRegister = async () => {};

  const { session } = useContext(UserContext);
  useEffect(() => {
    if (session) {
      router.replace("/tabs/home");
    }
  }, [session]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#1e5c1e" }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: "#f1faf7" }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, height: "100%", backgroundColor: "#f1faf7" }}>
          <LinearGradient
            style={{
              paddingBottom: 35,
              alignItems: "center",
              overflow: "hidden",
              padding: 20,
            }}
            colors={["#45a145", "#075812"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Image
              source={require("../assets/logo.png")}
              style={{
                width: 120,
                height: 120,
                marginTop: 20,
                marginBottom: 10,
                borderRadius: 60,
              }}
            />

            <Text
              style={{
                color: "white",
                fontSize: 40,
                fontWeight: "bold",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text>Daherni</Text> <Text style={{ fontSize: 30 }}>🌿</Text>
            </Text>

            <Text
              style={{
                color: "#eaefa9",
                marginTop: 5,
                fontSize: 13,
                width: "100%",
                textAlign: "center",
              }}
            >
              Explore Nature • Find Adventure • Create Memories
            </Text>
          </LinearGradient>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pressable
              style={{
                width: "50%",
                alignItems: "center",
                borderBottomWidth: loginMode ? 2 : 0,
                backgroundColor: loginMode ? "#e8f5e9" : "#f2f7f1",
                borderBottomColor: "#388e3c",
                padding: 20,
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
              onPress={() => {
                setLoginMode(true);
                setRegisterMode(false);
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: loginMode ? "#1b5e20" : "#7a7a7a",
                  fontSize: 20,
                }}
              >
                Login
              </Text>
              <Ionicons
                name="log-in-outline"
                style={{
                  fontWeight: "bold",
                  color: loginMode ? "#1b5e20" : "#7a7a7a",
                  fontSize: 18,
                }}
              />
            </Pressable>
            <Pressable
              style={{
                width: "50%",
                borderBottomWidth: registerMode ? 2 : 0,
                borderBottomColor: "#388e3c",
                backgroundColor: registerMode ? "#e8f5e9" : "#f2f7f1",
                padding: 20,
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              }}
              onPress={() => {
                setLoginMode(false);
                setRegisterMode(true);
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: registerMode ? "#1b5e20" : "#7a7a7a",
                  fontSize: 20,
                }}
              >
                Register
              </Text>
              <Ionicons
                name="person-add-outline"
                style={{
                  fontWeight: "bold",
                  color: registerMode ? "#1b5e20" : "#7a7a7a",
                  fontSize: 18,
                }}
              />
            </Pressable>
          </View>

          {loginMode && (
            <View
              style={{
                width: "100%",
                height: "100%",
                minWidth: 200,
                padding: 20,
                borderRadius: 12,
                backgroundColor: "#f1faf7",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: "#2e7d32",
                  backgroundColor: "#c8e6c9",
                  padding: 10,
                  borderRadius: 18,
                  fontWeight: "bold",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Welcome back nature Lover!
              </Text>
              <Text
                style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
              >
                Email Address
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 18,
                  paddingHorizontal: 10,
                  marginBottom: 10,
                  backgroundColor: "#fff",
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#666"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="example@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                  }}
                />
              </View>

              <Text
                style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 18,
                  paddingHorizontal: 10,
                  marginBottom: 10,
                  backgroundColor: "#fff",
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="••••••••"
                  secureTextEntry={true}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                  }}
                />
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#999" : "#2e7d32",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Ionicons
                      name="log-in-outline"
                      size={20}
                      color="white"
                      fontWeight="bold"
                    />
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Sign In to Daherni
                    </Text>
                  </View>
                )}
              </Pressable>

              {loginError && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    marginTop: 20,
                    textAlign: "center",
                    color: "red",
                  }}
                >
                  {loginError}
                </Text>
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 20,
                }}
              >
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "#c8e6c9" }}
                />
                <Text
                  style={{
                    marginHorizontal: 10,
                    color: "#87c389",
                    fontWeight: "400",
                  }}
                >
                  or continue with
                </Text>
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "#c8e6c9" }}
                />
              </View>

              <View
                style={{
                  padding: 12,
                  borderRadius: 30,
                  width: 50,
                  alignSelf: "center",
                  alignItems: "center",
                  gap: 20,
                  backgroundColor: "#e1f7dd",
                }}
              >
                <Pressable onPress={handleGoogleLogin} disabled={googleLoading}>
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="#2caa39" />
                  ) : (
                    <AntDesign name="google" size={24} color="#2caa39" />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {registerMode && (
            <View>
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  minWidth: 200,
                  padding: 20,
                  borderRadius: 12,
                  backgroundColor: "#f1faf7",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "#2e7d32",
                    backgroundColor: "#c8e6c9",
                    padding: 10,
                    borderRadius: 18,
                    fontWeight: "bold",
                    marginBottom: 20,
                    textAlign: "center",
                  }}
                >
                  Join us, Build your journey!
                </Text>
                <Text
                  style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
                >
                  {"Name (can be seen by other users)"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 18,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="Enter your name"
                    keyboardType="default"
                    autoCapitalize="none"
                    value={name}
                    onChangeText={setName}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                    }}
                  />
                </View>
                <Text
                  style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
                >
                  Email Address
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 18,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="example@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={registerEmail}
                    onChangeText={setRegisterEmail}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                    }}
                  />
                </View>

                <Text
                  style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
                >
                  Password
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 18,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="Create a strong password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                    }}
                  />
                </View>
                <Text
                  style={{ fontSize: 15, fontWeight: "bold", marginBottom: 5 }}
                >
                  Confirm Password
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 18,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="re-enter your password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                    }}
                  />
                </View>

                <Pressable
                  onPress={handleRegister}
                  disabled={registerLoading}
                  style={{
                    backgroundColor: registerLoading ? "#999" : "#2e7d32",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    opacity: registerLoading ? 0.7 : 1,
                  }}
                >
                  {registerLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 20,
                      }}
                    >
                      <Ionicons
                        name="log-in-outline"
                        size={20}
                        color="white"
                        fontWeight="bold"
                      />
                      <Text style={{ color: "white", fontWeight: "bold" }}>
                        Sign Up for Daherni
                      </Text>
                    </View>
                  )}
                </Pressable>

                {registerError && (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      marginTop: 20,
                      textAlign: "center",
                      color: "red",
                    }}
                  >
                    {registerError}
                  </Text>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 20,
                  }}
                >
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: "#c8e6c9" }}
                  />
                  <Text
                    style={{
                      marginHorizontal: 10,
                      color: "#87c389",
                      fontWeight: "400",
                    }}
                  >
                    or continue with
                  </Text>
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: "#c8e6c9" }}
                  />
                </View>

                <View
                  style={{
                    padding: 12,
                    borderRadius: 30,
                    width: 50,
                    alignSelf: "center",
                    alignItems: "center",
                    gap: 20,
                    backgroundColor: "#e1f7dd",
                  }}
                >
                  <Pressable
                    onPress={handleGoogleRegister}
                    disabled={registerGoogleLoading}
                  >
                    {registerGoogleLoading ? (
                      <ActivityIndicator size="small" color="#2caa39" />
                    ) : (
                      <AntDesign name="google" size={24} color="#2caa39" />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
