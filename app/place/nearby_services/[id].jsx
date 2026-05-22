import ServiceCard from "@/src/components/service/service_card";
import { supabase } from "@/src/lib/supabase-client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const service_types = [
    { value: "all", label: "All 🌍" },
    { value: "restaurant", label: "Restaurant 🍽️" },
    { value: "cafe", label: "Cafe ☕" },
    { value: "hotel", label: "Hotel 🏨" },
    { value: "campsite", label: "Campsite ⛺" },
    { value: "guesthouse", label: "Guesthouse 🏡" },
    { value: "chalet_rent", label: "Chalet Rent 🏠" },
    { value: "resort", label: "Resort 🌴" },
    { value: "activity", label: "Activity 🏄" },
    { value: "tour_guide", label: "Tour Guide 🧭" },
    { value: "transport", label: "Transport 🚗" },
    { value: "rental", label: "Rental 🎒" },
    { value: "shop", label: "Shop 🛍️" },
    { value: "supermarket", label: "Supermarket 🛒" },
    { value: "parking", label: "Parking 🅿️" },
    { value: "rest_area", label: "Rest Area 🛋️" },
    { value: "other", label: "Other 📌" },
];

const price_ranges = [
    { value: "all", label: "All 💰" },
    { value: "cheap", label: " Cheap" },
    { value: "budget", label: "Budget" },
    { value: "moderate", label: "Moderate" },
    { value: "expensive", label: "Expensive" },
    { value: "luxury", label: "Luxury" },
];

const pricing_types = [
    { value: "all", label: "All 🏷️" },
    { value: "per_item", label: "Per Item" },
    { value: "per_person", label: "Per Person" },
    { value: "per_night", label: "Per Night" },
    { value: "entry_fee", label: "Entry Fee" },
    { value: "free", label: "Free" }
];

const buttonBaseStyle = {
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 3,
    paddingVertical: 6,
    paddingHorizontal: 14,
    height: 33,
    justifyContent: "center",
    shadowColor: "rgba(168,230,184,0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
};

function NearbyServices() {
    const { id } = useLocalSearchParams();
    const [placeName, setPlaceName] = useState("");
    const [services, setServices] = useState([]);

    const [isOpen, setIsOpen] = useState(false);
    const [serviceSearchName, setServiceSearchName] = useState("");
    const [selectedServiceType, setSelectedServiceType] = useState("all");
    const [selectedPricingType, setSelectedPricingType] = useState("all");
    const [selectedPriceRange, setSelectedPriceRange] = useState("all");
    const [filteredServices, setFilteredServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);

    const [selectedSort, setSelectedSort] = useState("");

    async function getPlaceName() {
        const { data, error } = await supabase
            .from("Place")
            .select("name")
            .eq("place_id", id)
        if (error) {
            console.log(error);
            return;
        }
        setPlaceName(data[0]?.name)
    }
    async function getPlaceServices() {
        setServicesLoading(true);

        const { data, error } = await supabase
            .from("Place_Service")
            .select(`
            distance_km,
            Service (
                *,
                Service_Image (*)
            )
        `)
            .eq("place_id", id);

        if (error) {
            console.log(error);
            setServicesLoading(false);
            return;
        }

        const formatted = data.map(item => ({
            ...item.Service,
            distance_km: item.distance_km || 0
        }));

        setServices(formatted);
        setServicesLoading(false);
    }
    function isOpenNow(str) {
        if (typeof str !== 'string') return false;

        const match = str.match(
            /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*$/i
        );
        if (!match) return false;

        // Extract components
        let openHour = parseInt(match[1], 10);
        const openMin = match[2] ? parseInt(match[2], 10) : 0;
        const openMer = match[3].toLowerCase();
        let closeHour = parseInt(match[4], 10);
        const closeMin = match[5] ? parseInt(match[5], 10) : 0;
        const closeMer = match[6].toLowerCase();

        // Validate hours and minutes
        if (openHour < 1 || openHour > 12) return false;
        if (closeHour < 1 || closeHour > 12) return false;
        if (openMin < 0 || openMin > 59) return false;
        if (closeMin < 0 || closeMin > 59) return false;

        // Convert to 24‑hour format
        if (openMer === 'am') {
            if (openHour === 12) openHour = 0;
        } else { // pm
            if (openHour !== 12) openHour += 12;
        }

        if (closeMer === 'am') {
            if (closeHour === 12) closeHour = 0;
        } else {
            if (closeHour !== 12) closeHour += 12;
        }

        // 12am – 12am → open 24 hours
        if (openHour === 0 && openMin === 0 && closeHour === 0 && closeMin === 0) {
            return true;
        }

        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const open = openHour * 60 + openMin;
        const close = closeHour * 60 + closeMin;

        // Overnight range (open > close)
        if (open > close) {
            return current >= open || current < close;
        }
        // Normal range
        return current >= open && current < close;
    }

    async function getServiceAverageRating(serviceId) {
        const { data, error } = await supabase
            .from("Service_Review")
            .select("rating")
            .eq("service_id", serviceId);

        if (error) {
            console.error("Rating fetch error:", error);
            return null;
        }
        if (!data || data.length === 0) return null;
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        return (sum / data.length).toFixed(1);
    }

    const handleSortPress = (type) => {
        setSelectedSort((prev) => (prev === type ? "" : type));
    };

    useEffect(() => {
        getPlaceName();
        getPlaceServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    useEffect(() => {
        let result = [...services];

        if (selectedServiceType !== "all") {
            result = result.filter(s => s.type === selectedServiceType);
        }

        if (selectedPricingType !== "all") {
            result = result.filter(s => s.pricing_type === selectedPricingType);
        }

        if (selectedPriceRange !== "all") {
            result = result.filter(s => s.price_range === selectedPriceRange);
        }

        if (isOpen) {
            result = result.filter(s => isOpenNow(s.opening_hours));
        }

        if (serviceSearchName?.trim() !== "") {
            const q = serviceSearchName.trim().toLowerCase();
            result = result.filter(s =>
                s.name?.toLowerCase().includes(q)
            );
        }
        setFilteredServices(result)

        async function sortAndSet() {
            if (selectedSort === "") {
                return;
            }
            if (selectedSort === "rating") {
                const rated = await Promise.all(
                    result.map(async (s) => ({
                        ...s,
                        avgRating: Number(await getServiceAverageRating(s.service_id)),
                    }))
                );

                result = rated.sort((a, b) => b.avgRating - a.avgRating);
            }

            if (selectedSort === "nearest") {
                result.sort((a, b) => a.distance_km - b.distance_km)
            }

            setFilteredServices(result);
        }

        sortAndSet();
    }, [
        services,
        selectedServiceType,
        selectedPricingType,
        selectedPriceRange,
        isOpen,
        serviceSearchName,
        selectedSort
    ]);



    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "#1e5c1e" }}
            edges={["top"]}
        >
            <ScrollView
                style={{ flex: 1, backgroundColor: "#86cc80" }}
                contentContainerStyle={{}}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={["#1e5c1e", "#2b7d2b", "#1e8030"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        paddingHorizontal: 22,
                        paddingTop: 16,
                        paddingBottom: 20,
                        borderBottomLeftRadius: 28,
                        borderBottomRightRadius: 28,
                        overflow: "hidden",
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Pressable onPress={() => router.back()}
                            style={{
                                borderRadius: 30, borderColor: "#fff", borderStyle: "solid",
                                borderWidth: 1, width: 30, height: 30, flexDirection: "row", alignItems: "center", justifyContent: "center",
                                marginTop: 2
                            }}
                        >
                            <Ionicons name="arrow-back" size={20} color="white" />
                        </Pressable>
                        <Text
                            style={{ fontSize: 30, fontWeight: "bold", color: "#ffff" }}
                        >{placeName}</Text>
                    </View>

                    <Text
                        style={{ fontSize: 25, fontWeight: "400", color: "#ffff", marginTop: 15 }}
                    >Nearby Services</Text>
                    <Text
                        style={{ fontWeight: "100", color: "#ffff" }}
                    >Discover hotels,restaurants, cafes & more</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View
                            style={{
                                width: 150,
                                marginRight: 10,
                                marginTop: 10,
                                backgroundColor: "rgba(255,255,255,0.12)",
                                borderRadius: 20,
                                borderWidth: 3,
                                borderColor: "transparent",
                                height: 33,
                                justifyContent: "center",
                                shadowColor: "rgba(168,230,184,0.4)",
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.4,
                                shadowRadius: 4,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6
                            }}
                        >
                            <Ionicons
                                name="storefront-outline"
                                size={20}
                                color="#5ddc47"
                            />
                            <Text
                                style={{ color: "#ffff", fontWeight: "330" }}
                            >{services.length} services found</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push(`/place/add_nearby_service/${id}`)}
                            style={{
                                width: 150,
                                marginRight: 10,
                                marginTop: 10,
                                backgroundColor: "rgba(255,255,255,0.12)",
                                borderRadius: 20,
                                borderWidth: 3,
                                borderColor: "transparent",
                                height: 33,
                                justifyContent: "center",
                                shadowColor: "rgba(168,230,184,0.4)",
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.4,
                                shadowRadius: 4,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6
                            }}
                        >
                            <Ionicons
                                name="add"
                                size={20}
                                color="#5ddc47"
                            />
                            <Text
                                style={{ color: "#ffff", fontWeight: "330" }}
                            >Add new service</Text>
                        </Pressable>
                    </View>
                </LinearGradient>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <TextInput
                        placeholder="Search for services by name..."
                        placeholderTextColor="#fdfdfd"
                        value={serviceSearchName}
                        onChangeText={setServiceSearchName}
                        style={{
                            marginTop: 12,
                            marginLeft: 10,
                            backgroundColor: "rgba(255,255,255,0.12)",
                            borderRadius: 30,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.15)",
                            color: "#000000",
                            fontSize: 12,
                            fontFamily: "Inter_400Regular",
                            justifyContent: "center",
                            width: "50%",
                            height: 50,
                            textAlign: "center",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                        }}
                    />
                    <View
                        style={{
                            width: 150,
                            marginRight: 10,
                            marginTop: 10,
                            backgroundColor: !isOpen ? "rgba(255,255,255,0.12)" : "rgba(66, 251, 56, 0.18)",
                            borderRadius: 20,
                            borderWidth: 3,
                            borderColor: "transparent",
                            height: 50,
                            justifyContent: "center",
                            shadowColor: "rgba(168,230,184,0.4)",
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.4,
                            shadowRadius: 4,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6
                        }}
                    >

                        <Text
                            style={{ color: "#ffff", fontWeight: "330" }}
                        > Open Now</Text>
                        <Switch
                            value={isOpen}
                            onValueChange={setIsOpen}
                            trackColor={{ false: "#ccc", true: "#4fc353" }}
                            thumbColor={isOpen ? "#fff" : "#f4f3f4"}
                        />
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18 }}
                >
                    {service_types.map((item) => {
                        const active = selectedServiceType === item.value;
                        return (
                            <Pressable
                                key={item.value}
                                onPress={() => setSelectedServiceType(item.value)}
                                style={[
                                    buttonBaseStyle,
                                    {
                                        backgroundColor: active
                                            ? "rgba(30, 92, 30, 0.9)"
                                            : "rgba(255,255,255,0.12)",
                                        borderColor: "transparent",
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
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18 }}
                >
                    {price_ranges.map((item) => {
                        const active = selectedPriceRange === item.value;
                        return (
                            <Pressable
                                key={item.value}
                                onPress={() => setSelectedPriceRange(item.value)}
                                style={[
                                    buttonBaseStyle,
                                    {
                                        backgroundColor: active
                                            ? "rgba(183, 28, 28, 0.9)"
                                            : "rgba(255,255,255,0.12)",
                                        borderColor: "transparent",
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
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18 }}
                >
                    {pricing_types.map((item) => {
                        const active = selectedPricingType === item.value;
                        return (
                            <Pressable
                                key={item.value}
                                onPress={() => setSelectedPricingType(item.value)}
                                style={[
                                    buttonBaseStyle,
                                    {
                                        backgroundColor: active
                                            ? "rgba(230, 81, 0, 0.9)"
                                            : "rgba(255,255,255,0.12)",
                                        borderColor: "transparent",
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

                <View style={{ flexDirection: "row", marginHorizontal: 20, marginTop: 15, alignItems: "center", gap: 10 }}>
                    <Text style={{ fontWeight: "light", color: "dark-gray" }}>Sort By</Text>
                    <View style={{ display: 'flex', flexDirection: "row", gap: 10 }}>
                        <Pressable
                            style={{
                                backgroundColor: selectedSort === "rating" ? "rgba(77, 125, 79, 0.85)" : "rgba(255,255,255,0.12)"
                                , width: 100, padding: 3, flexDirection: "row", justifyContent: "center", borderRadius: 40
                            }}
                            onPress={() => handleSortPress("rating")}
                        ><Text style={{ fontWeight: "400" }}> <Ionicons name="star" color={"#ffda06"}></Ionicons> Avg Rating</Text></Pressable>
                        <Pressable
                            style={{
                                backgroundColor: selectedSort === "nearest" ? "rgba(77, 125, 79, 0.85)" : "rgba(255,255,255,0.12)"
                                , width: 100, padding: 3, flexDirection: "row", justifyContent: "center", borderRadius: 40
                            }}
                            onPress={() => handleSortPress("nearest")}
                        ><Text style={{ fontWeight: "400" }}>
                                <Ionicons name="location" color={"#2dba25"}></Ionicons> Nearest</Text></Pressable>
                    </View>
                </View>

                <View
                    style={{
                        marginTop: 10,
                        marginLeft: 10,
                        flexDirection: "column",
                        alignItems: "center"
                    }}
                >
                    {servicesLoading && services.length === 0 ? (
                        <View
                            style={{
                                alignItems: "center",
                                marginTop: 20,
                                justifyContent: "center",
                            }}
                        >
                            <ActivityIndicator size="large" color="#2d9c2d" />
                            <Text
                                style={{
                                    marginLeft: 20,
                                    fontWeight: "bold",
                                }}
                            >
                                Loading Services...
                            </Text>
                        </View>
                    ) : null}
                    {filteredServices.length === 0 && !servicesLoading ?
                        (<Text
                            style={{ fontWeight: "light", color: "gray", marginTop: 50 }}
                        >No Results</Text>) : null}
                    {filteredServices.map(f_service => (
                        <View key={f_service.service_id}
                            style={{ marginTop: 10, alignItems: "center", marginBottom:20 }}
                        >
                            <ServiceCard service={f_service} CardWidth={370} ImageHeight={150} /></View>

                    ))}
                </View>


            </ScrollView>
        </SafeAreaView>

    )
}
export default NearbyServices;