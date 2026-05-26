import AddPlace from "@/src/components/place/add_place";
import { supabase } from "@/src/lib/supabase-client";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  FlatList,
  RefreshControl,
  LogBox
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PlaceCard from "../../src/components/place/place_card";
import { UserContext } from "../../src/contexts/UserContext";
import { handleUrlParams } from "expo-router/build/fork/getStateFromPath-forks";

const placeTypes = [
  { value: "all", label: "All 🌍" },
  { value: "river", label: "River 🚣" },
  { value: "mountain", label: "Mountain ⛰️" },
  { value: "forest", label: "Forest 🌲" },
  { value: "lake", label: "Lake 🌊" },
  { value: "beach", label: "Beach 🏖️" },
  { value: "waterfall", label: "Waterfall 💧" },
  { value: "cave", label: "Cave 🕳️" },
  { value: "valley", label: "Valley 🛣️" },
  { value: "hill", label: "Hill 🌄" },
  { value: "park", label: "Park 🌳" },
  { value: "historical", label: "Historical 🏛️" },
  { value: "religious", label: "Religious ⛪" },
];

LogBox.ignoreLogs([
  "VirtualizedLists should never be nested inside plain ScrollViews",
]);

export default function Home() {
  const { dbUser } = useContext(UserContext);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = dbUser?.name?.split(" ")[0] ?? "";

  const [selectedPlaceType, setSelectedPlaceType] = useState("all");
  const [places, setPlaces] = useState([]);
  const [randomPlaces, setRandomPlaces] = useState([]);
  const [place_loading, setPlaceLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const difficultyLevels = ["no choice", "easy", "medium", "hard"];
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const sliderRef = useRef(null);

  async function fetchPlaces(name, type, difficulty) {
    setPlaceLoading(true);
    let query = supabase
      .from("Place")
      .select(` *, Place_Image (url) `)
      .eq("status", "approved");

    // filter by type
    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    // filter by difficulty
    if (difficulty !== undefined && difficulty !== null && difficulty !== 0) {
      query = query.eq("difficulty", difficultyLevels[difficulty]);
    }

    //filter by name
    if (name && name.trim() !== "") {
      query = query.or(
        `name.ilike.%${name.trim()}%,town.ilike.%${name.trim()}%,governorate.ilike.%${name.trim()}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch places error:", error);
      setPlaceLoading(false);
      return;
    }

    setPlaceLoading(false);
    setPlaces(data ?? []);
  }

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchPlaces(searchName, selectedPlaceType, difficulty);
    setDifficulty(0)
    setSearchName("")
    setSelectedPlaceType("all")

    setRefreshing(false);
  };

  useEffect(() => {

    fetchPlaces(searchName, selectedPlaceType, difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceType, difficulty, searchName]);

  useEffect(() => {
    const shuffled = [...places].sort(() => Math.random() - 0.5);
    setRandomPlaces(shuffled);
  }, [places]);

  useEffect(() => {
    //if placecards are in horizontal mode
    sliderRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });
  }, [selectedPlaceType, difficulty, searchName]);

  useEffect(() => {
    const updateLastLogin = async () => {
      if (!dbUser) return;
      const { error } = await supabase
        .from("User")
        .update({ last_login: new Date().toISOString() })
        .eq("auth_id", dbUser.auth_id)
        .select();

      if (error) {
        console.error("Last login update error:", error.message);
      }
    };
    updateLastLogin();
  }, [dbUser]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#1e5c1e" }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: "#86cc80"}}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#1e5c1e", "#2b7d2b", "#1e8030"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 22,
            paddingTop: 0,
            paddingBottom: 30,
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

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <View>
              <Text
                style={{
                  color: "#a8e6b8",
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {greeting}
                {firstName ? `, ${firstName}` : ""} 👋
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  marginTop: 2,
                }}
              >
                Ready for your next adventure?
              </Text>
            </View>
            <Image
              source={require("../../assets/logo.png")}
              style={{
                width: 50,
                height: 50,
                borderRadius: 23,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.25)",
              }}
            />
          </View>

          <Text
            style={{
              color: "#ffffff",
              fontSize: 36,
              lineHeight: 44,
              fontFamily: "Poppins_600SemiBold",
              letterSpacing: -0.5,
            }}
          >
            Discover{"\n"}
            <Text style={{ color: "#a8e6b8" }}>Lebanon&apos;s</Text>
            {"\n"}Wild Beauty
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 18,
            }}
          >
            {["🏔 Places", "🍽 Services", "✨ AI Trips"].map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                  paddingVertical: 5,
                  paddingHorizontal: 13,
                }}
              >
                <Text
                  style={{
                    color: "#d4f5df",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Text
          style={{
            color: "#000000",
            fontSize: 24,
            fontFamily: "Inter_400Regular",
            fontWeight: "bold",
            marginLeft: 18,
            marginTop: 12,
          }}
        >
          Featured Places
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18 }}
        >
          {placeTypes.map((item) => {
            const active = selectedPlaceType === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setSelectedPlaceType(item.value)}
                style={{
                  marginRight: 10,
                  backgroundColor: active
                    ? "rgba(30, 92, 30, 0.9)"
                    : "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: "transparent",
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  height: 33,
                  justifyContent: "center",
                  shadowColor: "rgba(168,230,184,0.4)",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: active ? "#ffffff" : "#000000",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 18,
            marginTop: 8,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Slider
            minimumValue={0}
            maximumValue={3}
            step={1}
            value={difficulty}
            onValueChange={setDifficulty}
            minimumTrackTintColor="#2d9c2d"
            maximumTrackTintColor="#d1f3e5"
            thumbTintColor="#2d9c2d"
            style={{ width: "70%", height: 30 }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "75%",
            }}
          >
            {difficultyLevels.map((level, index) => (
              <Text
                key={index}
                style={{
                  color: difficulty === index ? "#2d9c2d" : "#cefde7",
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {level}
              </Text>
            ))}
          </View>
          <TextInput
            placeholder="Search places (name, town, governate)..."
            style={{
              marginTop: 12,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: 30,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
              color: "#000000",
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              justifyContent: "center",
              width: "80%",
              height: 50,
              textAlign: "center",
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
            value={searchName}
            onChangeText={setSearchName}
          />
          <FlatList
            ref={sliderRef}
            data={randomPlaces.slice(0, visibleCount)}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => <View style={{ marginTop: 8 }}><PlaceCard place={item} onUnFavorite={handleUrlParams} CardWidth={350} ImageHeight={180} /></View>}
            style={{ marginTop: 18, marginBottom: 30 }}
            ListFooterComponent={
              randomPlaces.length > visibleCount ? (
                <Pressable
                  onPress={() => setVisibleCount(prev => prev + 10)}
                  style={{
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#2d9c2d", fontWeight: "bold" }}>
                    Show More
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              place_loading ? (
                <View style={{ alignItems: "center", marginTop: 20 }}>
                  <ActivityIndicator size="large" color="#2d9c2d" />
                  <Text style={{ marginLeft: 20, fontWeight: "bold" }}>
                    Loading places...
                  </Text>
                </View>
              ) : places.length === 0 ? (
                <Text
                  style={{
                    color: "#777",
                    fontSize: 14,
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  No places found.
                </Text>
              ) : null
            }
          />
        </View>

        <View
          style={{
            fontFamily: "Inter_400Regular",
            fontWeight: "thin",
            marginLeft: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: -14,
            marginBottom: 5
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontWeight: "thin",
            }}
          >Didnt find your place? Add it!</Text>
          <Pressable
            onPress={() => setShowAddPlace(!showAddPlace)}
            style={{ backgroundColor: "rgba(62, 190, 62, 0.9)", borderRadius: 20 }}
          ><Text style={{
            fontFamily: "Inter_400Regular",
            padding: 5,
          }}>Suggest new place</Text></Pressable>
        </View>
        {showAddPlace && (<AddPlace addPlaceStatus={showAddPlace} setAddPlaceStatus={setShowAddPlace} />)}
      </ScrollView>
    </SafeAreaView>
  );
}