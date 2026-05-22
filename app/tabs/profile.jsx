import { View, Text, ScrollView, TextInput, Pressable, Image, Alert } from "react-native";
import { useContext, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { UserContext } from "../../src/contexts/UserContext";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/src/lib/supabase-client";
import { router } from "expo-router";

export default function Profile() {

  const { dbUser, setDbUser } = useContext(UserContext);
  const [tempUser, setTempUser] = useState(dbUser);
  const [submitting, setSubmitting] = useState(false);

  // Update tempUser when dbUser changes
  useEffect(() => {
    if (dbUser) setTempUser(dbUser);
  }, [dbUser]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    setSubmitting(true);

    // Use tempUser for current values
    const updatedUser = tempUser;
    const oldImageUrl = dbUser?.profile_pic;

    // Basic validation
    if (
      !updatedUser.name?.trim() ||
      updatedUser.age <= 0 ||
      (updatedUser.language !== "AR" && updatedUser.language !== "EN") ||
      (updatedUser.phone && updatedUser.phone.length < 8)
    ) {
      setSubmitting(false);
      return Alert.alert("Please fill all fields correctly.");
    }

    const payload = {
      name: updatedUser.name.trim(),
      age: Number(updatedUser.age),
      language: updatedUser.language,
      phone: updatedUser.phone,
      profile_pic: updatedUser.profile_pic, // fallback (old or default URL)
    };

    // If a new local image has been selected, upload it
    if (updatedUser.profileFile) {
      const file = updatedUser.profileFile;

      if (file.fileSize > 10 * 1024 * 1024) {
        setSubmitting(false);
        return Alert.alert("File too large (max 10MB)");
      }

      const fileName = `avatars/${updatedUser.user_id}-${Date.now()}-${file.fileName ?? "avatar.jpg"}`;
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, arrayBuffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        Alert.alert("Error", "Image upload failed");
        setSubmitting(false);
        return;
      }

      const { data } = supabase.storage.from("profiles").getPublicUrl(fileName);
      payload.profile_pic = data.publicUrl;
    }

    // Update database
    const { error } = await supabase
      .from("User")
      .update(payload)
      .eq("user_id", updatedUser.user_id);

    if (error) {
      setSubmitting(false);
      return Alert.alert("Update failed");
    }

    // Update context
    setDbUser((prev) => ({ ...prev, ...payload }));

    Alert.alert("Profile updated successfully");

    // Delete old profile picture if it was replaced and is not the default
    const defaultPic =
      "https://qwtxlgzjjtjdohmnsuly.supabase.co/storage/v1/object/public/profiles/avatars/default_profile.jpg";
    if (oldImageUrl && oldImageUrl !== defaultPic && oldImageUrl !== payload.profile_pic) {
      const oldPath = oldImageUrl.split("/storage/v1/object/public/profiles/")[1];
      if (oldPath) {
        await supabase.storage.from("profiles").remove([oldPath]);
      }
    }

    setSubmitting(false);
  };

  const handleImageRemove = () => {
    Alert.alert(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            setTempUser((prev) => ({
              ...prev,
              profile_pic:
                "https://qwtxlgzjjtjdohmnsuly.supabase.co/storage/v1/object/public/profiles/avatars/default_profile.jpg",
              profileFile: null,
            })),
        },
      ]
    );
  };

  const handleImageEdit = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setTempUser((prev) => ({
      ...prev,
      profile_pic: asset.uri,
      profileFile: asset, // store full asset for upload
    }));
  };

  // Guard against empty dbUser
  if (!dbUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#1e5c1e" }} edges={["top"]}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1e5c1e" }} edges={["top"]}>
      <ScrollView style={{ flex: 1, backgroundColor: "#86cc80" }}>
        <LinearGradient
          colors={["#1e5c1e", "#2b7d2b", "#1e8030"]}
          style={{
            padding: 20,
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 10 }}>
            My Profile
          </Text>

          <Image
            source={{ uri: tempUser.profile_pic}}
            style={{ width: 100, height: 100, borderRadius: 50, marginVertical: 10 }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={{
                padding: 8,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 20,
                paddingHorizontal: 16,
              }}
              onPress={handleImageEdit}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Change</Text>
            </Pressable>

            <Pressable
              style={{
                padding: 8,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 20,
                paddingHorizontal: 16,
              }}
              onPress={handleImageRemove}
            >
              <Text style={{ color: "#ff6b6b", fontWeight: "bold" }}>Remove</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={{ margin: 15, padding: 15, backgroundColor: "#fff", borderRadius: 15 }}>
          <TextInput
            placeholder="Name"
            style={{ backgroundColor: "#f2f2f2", padding: 10, borderRadius: 10, marginBottom: 10 }}
            value={tempUser.name}
            onChangeText={(text) => setTempUser({ ...tempUser, name: text })}
          />

          <TextInput
            placeholder="Age"
            keyboardType="numeric"
            style={{ backgroundColor: "#f2f2f2", padding: 10, borderRadius: 10, marginBottom: 10 }}
            value={String(tempUser.age ?? "")}
            onChangeText={(text) => {
              // Remove non-digits and allow empty
              const num = text.replace(/[^0-9]/g, "");
              setTempUser({ ...tempUser, age: num === "" ? "" : Number(num) });
            }}
          />

          <TextInput
            placeholder="Phone"
            keyboardType="phone-pad"
            style={{ backgroundColor: "#f2f2f2", padding: 10, borderRadius: 10, marginBottom: 10 }}
            value={tempUser.phone}
            onChangeText={(text) => setTempUser({ ...tempUser, phone: text })}
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={() => setTempUser((prev) => ({ ...prev, language: "EN" }))}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                backgroundColor: tempUser.language === "EN" ? "#1e5c1e" : "#eee",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#000", fontWeight: "600" }}>EN</Text>
            </Pressable>

            <Pressable
              onPress={() => setTempUser((prev) => ({ ...prev, language: "AR" }))}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                backgroundColor: tempUser.language === "AR" ? "#1e5c1e" : "#eee",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#000", fontWeight: "600" }}>AR</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ margin: 15, gap: 10 }}>
          <Pressable
            onPress={handleSaveProfile}
            disabled={submitting}
            style={{
              backgroundColor: "#1e5c1e",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {submitting ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={{
              borderWidth: 1,
              backgroundColor: "#e62828",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000000", fontWeight: "600" }}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}