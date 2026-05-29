import { supabase } from "@/src/lib/supabase-client";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// eslint-disable-next-line import/no-named-as-default
import Checkbox from "expo-checkbox";

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

const difficultyLevels = [
    { value: "no choice", label: "No choice" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
];

const governorates = [
    { value: "any", label: "Any Where" },
    { value: "Baalbek-Hermel", label: "Baalbek-Hermel" },
    { value: "Beirut", label: "Beirut" },
    { value: "Beqaa", label: "Beqaa" },
    { value: "Mount Lebanon", label: "Mount Lebanon" },
    { value: "Nabatieh", label: "Nabatieh" },
    { value: "North Lebanon", label: "North Lebanon" },
    { value: "South Lebanon", label: "South Lebanon" },
    { value: "Akkar", label: "Akkar" },
    { value: "Keserwan-Jbeil", label: "Keserwan-Jbeil" },
];

const serivceTypes = [
    { value: "restaurant", label: "Restaurants 🍽️" },
    { value: "cafe", label: "Cafes ☕" },
    { value: "campsite", label: "Campsites 🏕️" },
    { value: "guesthouse", label: "Guesthouses 🏡" },
    { value: "resort", label: "Resorts 🌴" },
    { value: "rest_area", label: "Rest Areas 🛋️" },
];

const tripStyles = [
    { label: "Any 🐞", value: "any" },
    { label: "Adventure 🧗", value: "adventure" },
    { label: "Relaxation 🌅", value: "relaxation" },
    { label: "Nature 🌲", value: "nature" },
    { label: "Cultural 🏛️", value: "cultural" },
    { label: "Photography 📸", value: "photography" },
    { label: "Road Trip 🚗", value: "roadtrip" },
    { label: "Family 👨‍👩‍👧", value: "family" },
    { label: "Luxury ✨", value: "luxury" },
    { label: "Budget 💸", value: "budget" },
    { label: "Camping 🏕️", value: "camping" },
];

const chipButtonStyle = {
    marginRight: 10,
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
};

export default function AI_Trips() {
    const [activeTab, setActiveTab] = useState("planned");
    const [description, setDescription] = useState("your own AI suggested trips")
    const [selectedPlaceTypes, setSelectedPlaceTypes] = useState(["all"]);
    const [selectedDifficulties, setSelectedDifficulties] = useState(["no choice"]);
    const [selectedGovernonates, setSelectedGovernonates] = useState(["any"]);
    const [duration, setDuration] = useState(2);

    const [inculdeServices, setInculdeServices] = useState(false)

    const tabs = [
        { label: "Planned", value: "planned", emoji: "🗺️", description: "your own AI suggested trips" },
        { label: "Discover", value: "discover", emoji: "✨", description: "Generate new AI trips" },
    ];

    const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);
    const [selectedTripStyle, setSelectedTripStyle] = useState("any");

    const [submitting, setSubmitting] = useState(false);

    const toggleServiceType = (value) => {
        setSelectedServiceTypes((prev) =>
            prev.includes(value)
                ? prev.filter((t) => t !== value)
                : [...prev, value]
        );
    };

    const callTripEdgeFunction = async () => {
        setSubmitting(true);
        const { data, error } = await supabase.rpc('get_trip_data', {
            place_types: selectedPlaceTypes,
            difficulties: selectedDifficulties,
            governorates: selectedGovernonates,
            service_types: inculdeServices ? selectedServiceTypes : []
        });

        if (error) {
            console.log("Database Function Error:", error);
            setSubmitting(false);
            return null;
        }

        setSubmitting(false);
        const placeNames = data.places.map(p => p.name);
        const serviceNames = data.services.map(s => s.name);
        console.log('Places:', placeNames, 'Services:', serviceNames);
        return data;
    };

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
                        paddingBottom: 16,
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
                        AI Made Trips 🌿
                    </Text>
                    <Text
                        style={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                        }}
                    >
                        Plan your next adventure with AI
                    </Text>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                        {tabs.map((tab) => {
                            const active = activeTab === tab.value;
                            return (
                                <Pressable
                                    key={tab.value}
                                    // eslint-disable-next-line no-unused-expressions
                                    onPress={() => { setActiveTab(tab.value), setDescription(tab.description) }}
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
                    <Text
                        style={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                            textAlign: "center",
                            marginTop: 10,
                            fontWeight: "bold"
                        }}
                    >
                        {description}
                    </Text>
                </LinearGradient>

                {activeTab === "planned" && (
                    <View style={{ flex: 1 }}>
                        {/* ---- PLANNED TAB CONTENT ---- */}
                    </View>
                )}

                {activeTab === "discover" && (
                    <View style={{ flex: 1, marginTop: 10, gap:12 }}>
                        <Text
                            style={{ marginHorizontal: 13, fontFamily: "monospace", fontWeight: "bold" }}
                        >Places types</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12 }}
                        >
                            {placeTypes.map((item) => {
                                const active = selectedPlaceTypes.includes(item.value)
                                return (
                                    <Pressable
                                        key={item.value}
                                        onPress={() => {
                                            if (item.value === "all") {
                                                setSelectedPlaceTypes(["all"])
                                            } else {
                                                setSelectedPlaceTypes((prev) => {
                                                    const filtered = prev.filter(p => p !== "all")
                                                    return filtered.includes(item.value)
                                                        ? filtered.filter((p) => p !== item.value)
                                                        : [...filtered, item.value];
                                                })
                                            }
                                        }}
                                        style={[
                                            chipButtonStyle,
                                            {
                                                backgroundColor: active
                                                    ? "rgba(30, 92, 30, 0.9)"
                                                    : "rgba(255,255,255,0.12)",
                                            },
                                        ]}
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

                        <Text
                            style={{ marginTop: 10, marginHorizontal: 13, fontFamily: "monospace", fontWeight: "bold" }}
                        >Difficulty</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12 }}
                        >
                            {difficultyLevels.map((item) => {
                                const active = selectedDifficulties.includes(item.value)
                                return (
                                    <Pressable
                                        key={item.value}
                                        onPress={() => {
                                            if (item.value === "no choice") {
                                                setSelectedDifficulties(["no choice"]);
                                            }
                                            else {
                                                setSelectedDifficulties((prev) => {
                                                    const filtered = prev.filter((f) => f !== "no choice");
                                                    return filtered.includes(item.value) ? filtered.filter((f) => f !== item.value) :
                                                        [...filtered, item.value];
                                                })
                                            }
                                        }}
                                        style={[
                                            chipButtonStyle,
                                            {
                                                backgroundColor: active
                                                    ? "rgba(30, 92, 30, 0.9)"
                                                    : "rgba(255,255,255,0.12)",
                                            },
                                        ]}
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

                        <Text
                            style={{ marginTop: 10, marginHorizontal: 13, fontFamily: "monospace", fontWeight: "bold" }}
                        >Governorates</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal: 12 }}
                        >
                            {governorates.map((item) => {
                                const active = selectedGovernonates.includes(item.value);
                                return (
                                    <Pressable
                                        key={item.value}
                                        onPress={() => {
                                            if (item.value === "any") {
                                                setSelectedGovernonates(["any"]);
                                            }
                                            else {
                                                setSelectedGovernonates((prev) => {
                                                    const filtered = prev.filter((f) => f !== "any");
                                                    return filtered.includes(item.value) ? filtered.filter((f) => f !== item.value) :
                                                        [...filtered, item.value]
                                                })

                                            }
                                        }}
                                        style={[
                                            chipButtonStyle,
                                            {
                                                backgroundColor: active
                                                    ? "rgba(30, 92, 30, 0.9)"
                                                    : "rgba(255,255,255,0.12)",
                                            },
                                        ]}
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

                        <View style={{ marginTop: 10, marginHorizontal: 12 }}>
                            <Text
                                style={{ fontFamily: "monospace", fontWeight: "bold", marginLeft: 2 }}
                            >Trip type</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingTop: 10 }}
                            >
                                {tripStyles.map((item) => {
                                    const active = selectedTripStyle === item.value;

                                    return (
                                        <Pressable
                                            key={item.value}
                                            onPress={() => {
                                                setSelectedTripStyle(item.value);
                                            }}
                                            style={[
                                                chipButtonStyle,
                                                {
                                                    backgroundColor: active
                                                        ? "rgba(30, 92, 30, 0.9)"
                                                        : "rgba(255,255,255,0.12)",
                                                },
                                            ]}
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
                        </View>


                        <View style={{ marginTop: 15, flexDirection: "row" }}>
                            <Text style={{ marginHorizontal: 13, fontFamily: "monospace", fontWeight: "bold" }}>Duration</Text>
                            <Slider
                                minimumValue={2}
                                maximumValue={8}
                                step={1}
                                value={duration}
                                onValueChange={setDuration}
                                minimumTrackTintColor="#2d9c2d"
                                maximumTrackTintColor="#d1f3e5"
                                thumbTintColor="#2d9c2d"
                                style={{ width: "55%", height: 30 }}
                            />
                            <Text
                                style={{ fontFamily: "monospace", fontWeight: "bold" }}
                            >{duration} hrs</Text>
                        </View>

                        <View
                            style={{ marginHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 }}
                        >
                            <Text
                                style={{ fontFamily: "monospace", fontWeight: "bold" }}
                            >Include Services</Text>
                            <Switch
                                value={inculdeServices}
                                onValueChange={() => {
                                    setInculdeServices(!inculdeServices);
                                    setSelectedServiceTypes([]);
                                }}
                                trackColor={{ false: "#ccc", true: "#4fc353" }}
                                thumbColor={inculdeServices ? "#fff" : "#f4f3f4"}
                            />
                        </View>



                        {inculdeServices && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    justifyContent: "space-between",
                                    marginTop: 10,
                                    marginBottom: 5,
                                    gap: 10,
                                }}
                            >
                                {serivceTypes.map((s) => {
                                    const active = selectedServiceTypes.includes(s.value);

                                    return (
                                        <Pressable
                                            key={s.value}
                                            onPress={() => toggleServiceType(s.value)}
                                            style={{
                                                width: "48%",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                paddingVertical: 14,
                                                paddingHorizontal: 14,
                                                borderRadius: 18,
                                                backgroundColor: active
                                                    ? "rgba(30,92,30,0.12)"
                                                    : "#13b3731d",
                                                borderWidth: 1,
                                                borderColor: active
                                                    ? "rgba(30,92,30,0.5)"
                                                    : "rgba(0,0,0,0.08)",
                                            }}
                                        >
                                            <Checkbox
                                                value={active}
                                                onValueChange={() => toggleServiceType(s.value)}
                                                color={active ? "#1e5c1e" : undefined}
                                            />

                                            <Text
                                                style={{
                                                    marginLeft: 10,
                                                    fontSize: 15,
                                                    fontWeight: "600",
                                                    color: active ? "#1e5c1e" : "#222",
                                                }}
                                            >
                                                {s.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}

                        <View style={{ alignItems: "center", marginTop: 30, marginBottom: 30 }}>
                            <Pressable
                                onPress={callTripEdgeFunction}
                                disabled={submitting}
                                style={{
                                    backgroundColor: "#20ab1b86",
                                    borderColor: "#000000",
                                    borderWidth: 0.2,
                                    borderRadius: 25,
                                    paddingVertical: 10,
                                    paddingHorizontal: 20,
                                    shadowRadius: 12,
                                    shadowColor: "#090909",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {submitting ? (
                                    <View
                                        style={{ flexDirection: "row", gap: 2 }}
                                    ><Text style={{ fontWeight: "bold" }}>Generating</Text><ActivityIndicator color="#000" /></View>
                                ) : (
                                    <Text style={{ fontWeight: "600" }}>Generate Trip</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}