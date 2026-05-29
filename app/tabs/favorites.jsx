import PlaceCard from "@/src/components/place/place_card";
import ServiceCard from "@/src/components/service/service_card";
import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Favorites() {
  const { dbUser } = useContext(UserContext);

  const [activeTab, setActiveTab] = useState("places");

  const [favPlaces, setFavPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  const [favServices, setFavServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  async function fetchFavoritePlaces() {
    setPlacesLoading(true);
    const { data, error } = await supabase
      .from("Favorite_Place")
      .select(
        `
        place:Place (
          *,
          Place_Image (url)
        )
      `
      )
      .eq("user_id", dbUser?.user_id);

    if (error) {
      console.error("Fetch favorite places error:", error);
      setPlacesLoading(false);
      return;
    }

    setFavPlaces(data?.map((fav) => fav.place) || []);
    setPlacesLoading(false);
  }

  async function fetchFavoriteServices() {
    setServicesLoading(true);
    const { data, error } = await supabase
      .from("Favorite_Service")
      .select(
        `
        service:Service (
          *,
          Service_Image (url)
        )
      `
      )
      .eq("user_id", dbUser?.user_id);

    if (error) {
      console.error("Fetch favorite services error:", error);
      setServicesLoading(false);
      return;
    }

    setFavServices(data?.map((fav) => fav.service) || []);
    setServicesLoading(false);
  }

  function handleUnfavoritePlace(placeId) {
    setFavPlaces((prev) => prev.filter((p) => p.place_id !== placeId));
  }

  function handleUnfavoriteService(serviceId) {
    setFavServices((prev) => prev.filter((s) => s.service_id !== serviceId));
  }

  useEffect(() => {
    fetchFavoritePlaces();
    fetchFavoriteServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser?.user_id]);

  useFocusEffect(
    useCallback(() => {
      fetchFavoritePlaces();
      fetchFavoriteServices();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbUser?.user_id])
  )


  const tabs = [
    { label: "Places", value: "places", emoji: "🏔" },
    { label: "Services", value: "services", emoji: "🍽" },
  ];

  const isLoading = activeTab === "places" ? placesLoading : servicesLoading;
  const isEmpty =
    activeTab === "places" ? favPlaces.length === 0 : favServices.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#1e5c1e" }}
      edges={["top"]}
      
    >
      <ScrollView
                style={{ flex: 1, backgroundColor: "#86cc80" }}
            >
      <LinearGradient
        colors={["#1e5c1e", "#2b7d2b", "#1e8030"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 22,
          paddingTop: 35,
          marginTop: -3,
          paddingBottom: 24,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: "hidden",
        }}
      >

        <View
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(255,255,255,0.05)",
            top: -70,
            right: -50,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(255,255,255,0.04)",
            bottom: -30,
            left: -20,
          }}
        />

        <Text
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontFamily: "Poppins_600SemiBold",
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          My Favorites ❤️
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            fontFamily: "Inter_400Regular",
          }}
        >
          Your saved places & services
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 18,
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                style={{
                  flex: 1,
                  backgroundColor: active
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: active
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.1)",
                  paddingVertical: 8,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
                <Text
                  style={{
                    color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    fontWeight: active ? "700" : "400",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <View style={{ flex: 1, backgroundColor: "#86cc80" }}>
        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color="#1e5c1e" />
            <Text
              style={{
                marginTop: 10,
                fontFamily: "Inter_400Regular",
                fontWeight: "bold",
                color: "#1e5c1e",
              }}
            >
              Loading favorites...
            </Text>
          </View>
        ) : isEmpty ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🤍</Text>
            <Text
              style={{
                color: "#1e5c1e",
                fontSize: 16,
                fontFamily: "Inter_400Regular",
                fontWeight: "600",
              }}
            >
              {activeTab === "places"
                ? "No favorite places yet"
                : "No favorite services yet"}
            </Text>
            <Text
              style={{
                color: "rgba(30,92,30,0.6)",
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                marginTop: 4,
              }}
            >
              Tap ❤️ on any place card to save it here
            </Text>
          </View>
        ) : activeTab === "places" ? (
          <FlatList
            data={favPlaces}
            keyExtractor={(item) => String(item.place_id)}
            renderItem={({ item }) => (
              <PlaceCard place={item} onUnFavorite={handleUnfavoritePlace} CardWidth={370} ImageHeight={150} />
            )}
            contentContainerStyle={{
              paddingHorizontal: 10,
              paddingTop: 18,
              paddingBottom: 30,
              gap: 14,
            }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={favServices}
            keyExtractor={(item) => String(item.service_id)}
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onUnFavorite={handleUnfavoriteService}
                CardWidth={370} ImageHeight={150}
              />
            )}
            contentContainerStyle={{
              paddingHorizontal: 10,
              paddingTop: 18,
              paddingBottom: 30,
              gap: 14,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}