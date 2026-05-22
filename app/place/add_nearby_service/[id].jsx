import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import MapPicker from "@/src/maps/map_picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const SERVICE_TYPES = [
    "restaurant", "cafe", "hotel", "campsite", "guesthouse",
    "chalet_rent", "resort", "activity", "tour_guide", "transport",
    "rental", "shop", "supermarket", "parking", "rest_area", "other",
];

const PRICE_RANGES = ["cheap", "budget", "moderate", "expensive", "luxury"];
const PRICING_TYPES = ["per_item", "per_person", "per_night", "entry_fee", "free"];

const ChipButton = ({ label, active, onPress, activeBg, inactiveBg }) => (
    <Pressable
        onPress={onPress}
        style={{
            marginRight: 10,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: "transparent",
            paddingVertical: 6,
            paddingHorizontal: 14,
            height: 33,
            justifyContent: "center",
            backgroundColor: active ? activeBg : inactiveBg,
            shadowColor: active ? "#000" : "transparent",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 2,
        }}
    >
        <Text
            style={{
                color: active ? "#fff" : "#333",
                fontSize: 12,
                fontWeight: "600",
            }}
        >
            {label}
        </Text>
    </Pressable>
);

function AddService() {
    const { dbUser } = useContext(UserContext);
    const { id: placeId } = useLocalSearchParams();

    const [placeName, setPlaceName] = useState("");
    const [placeLat, setPlaceLat] = useState(null);
    const [placeLng, setPlaceLng] = useState(null);
    const [isLoadingPlace, setIsLoadingPlace] = useState(true);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [town, setTown] = useState("");
    const [governorate, setGovernorate] = useState("");
    const [type, setType] = useState("");
    const [priceRange, setPriceRange] = useState("");
    const [pricingType, setPricingType] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const [openingHours, setOpeningHours] = useState("");
    const [image, setImage] = useState(null);
    const [position, setPosition] = useState(null);

    const [distanceKm, setDistanceKm] = useState("");
    const [linkNotes, setLinkNotes] = useState("");
    const [isPrimary, setIsPrimary] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function fetchPlace() {
            if (!placeId) {
                setIsLoadingPlace(false);
                return;
            }
            const { data, error } = await supabase
                .from("Place")
                .select("name, latitude, longitude")
                .eq("place_id", placeId)
                .single();

            if (error) {
                console.error("Error fetching place:", error);
                Alert.alert("Error", "Could not load place details.");
            } else {
                setPlaceName(data.name || "");
                setPlaceLat(data.latitude);
                setPlaceLng(data.longitude);
            }
            setIsLoadingPlace(false);
        }
        fetchPlace();
    }, [placeId]);

    useEffect(() => {
        if (placeLat == null || placeLng == null || !position) {
            return;
        }

        const { lat: serviceLat, lng: serviceLng } = position;
        const nums = [placeLat, placeLng, serviceLat, serviceLng].map(Number);
        if (nums.some(n => isNaN(n))) return;

        const toRad = (deg) => deg * Math.PI / 180;
        const R = 6371; // Earth's radius in km
        const dLat = toRad(serviceLat - placeLat);
        const dLon = toRad(serviceLng - placeLng);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(placeLat)) *
            Math.cos(toRad(serviceLat)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = +(R * c).toFixed(2);

        setDistanceKm(String(distance)); // Keep as string for later parsing
    }, [placeLat, placeLng, position]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    async function handleAddService() {
        if (!name.trim()) return Alert.alert("Error", "Service name is required");
        if (!type) return Alert.alert("Error", "Select a service type");
        if (!position) return Alert.alert("Error", "Pick a location on the map");
        if (!image) return Alert.alert("Error", "Image is required");
        if (!town.trim()) return Alert.alert("Error", "Town is required");
        if (!governorate.trim()) return Alert.alert("Error", "Governorate is required");
        if (!placeId) return Alert.alert("Error", "No place linked. Please go back and select a place.");

        setIsSubmitting(true);

        const fileName = `pictures/${name.replace(/\s+/g, "_").toLowerCase()}-${Date.now()}.jpg`;
        const response = await fetch(image.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("services")
            .upload(fileName, arrayBuffer, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
            Alert.alert("Error", "Image upload failed");
            setIsSubmitting(false);
            return;
        }

        const { data: publicData } = supabase.storage
            .from("services")
            .getPublicUrl(fileName);
        const imageUrl = publicData.publicUrl;

        const { data: serviceData, error: serviceError } = await supabase
            .from("Service")
            .insert([
                {
                    name,
                    description,
                    latitude: position.lat,
                    longitude: position.lng,
                    town,
                    governorate,
                    type,
                    price_range: priceRange || null,
                    pricing_type: pricingType || null,
                    contact_info: contactInfo || null,
                    opening_hours: openingHours || null,
                    status: "pending",
                    created_by: dbUser.user_id,
                    is_verified: false,
                },
            ])
            .select()
            .single();

        if (serviceError) {
            Alert.alert("Error", "Failed to submit service");
            setIsSubmitting(false);
            return;
        }

        const { error: imageError } = await supabase
            .from("Service_Image")
            .insert([{ url: imageUrl, service_id: serviceData.service_id }]);

        if (imageError) {
            console.error("Image insert error:", imageError);
        }

        const parsedDistance = parseFloat(distanceKm);
        const { error: linkError } = await supabase
            .from("Place_Service")
            .insert([
                {
                    place_id: placeId,
                    service_id: serviceData.service_id,
                    distance_km: !isNaN(parsedDistance) ? parsedDistance : null,
                    notes: linkNotes.trim() || null,
                    is_primary: isPrimary,
                },
            ]);

        if (linkError) {
            console.error("Place link error:", linkError);
        }

        setIsSubmitting(false);
        Alert.alert(
            "Submitted for Review",
            "Your service has been submitted and is pending admin approval. Thank you!",
            [{ text: "OK", onPress: () => router.back() }]
        );
    }

    const gradientHeaderStyle = {
        paddingHorizontal: 23,
        paddingTop: 30,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: "hidden",
    };

    const sectionTitle = {
        fontSize: 17,
        fontWeight: "700",
        color: "#1e5c1e",
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 4,
    };

    const inputStyle = {
        backgroundColor: "rgba(255,255,255,0.9)",
        borderWidth: 1,
        borderColor: "#c8e6c9",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        fontSize: 14,
        color: "#222",
    };

    const chipScroll = {
        marginBottom: 12,
        paddingRight: 16,
    };

    if (isLoadingPlace) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#86cc80" }}>
                <ActivityIndicator size="large" color="#1e5c1e" />
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: "#86cc80" }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
        >
            <LinearGradient
                colors={["#1e5c1e", "#2b7d2b", "#1e8030"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={gradientHeaderStyle}
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            borderRadius: 30,
                            borderColor: "#fff",
                            borderWidth: 1,
                            width: 30,
                            height: 30,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </Pressable>
                    <Text style={{ fontSize: 28, fontWeight: "bold", color: "#fff" }}>
                        Add a Service
                    </Text>
                </View>
                <Text style={{ color: "#e8f5e8", marginTop: 8, fontSize: 14 }}>
                    Fill in the details & link it to {placeName || "the place"}
                </Text>
            </LinearGradient>


            <Text style={sectionTitle}>🔗 Linked Place</Text>
            <View
                style={{
                    backgroundColor: "#e8f5e9",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    marginHorizontal: 10,
                    borderWidth: 1,
                    borderColor: "#a5d6a7",
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name="location" size={18} color="#1e5c1e" />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e5c1e", marginLeft: 6, flex: 1 }}>
                        {placeName}
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: "#fff",
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: "#c8e6c9",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <Ionicons name="navigate" size={16} color="#1e5c1e" />
                    {distanceKm ? (
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e5c1e" }}>
                            Distance: {distanceKm} km
                        </Text>
                    ) : (
                        <Text style={{ fontSize: 12, color: "#999", fontWeight:"bold" }}>
                            Pick a location on the map to calculate distance
                        </Text>
                    )}
                </View>
                <Text style={{ fontSize: 11, color: "#888", marginBottom: 8, marginLeft: 4 }}>
                    Distance auto‑calculated from coordinates
                </Text>

                <TextInput
                    style={{
                        ...inputStyle,
                        backgroundColor: "#fff",
                        minHeight: 60,
                        textAlignVertical: "top",
                        marginBottom: 8,
                    }}
                    placeholder="Additional notes about this link"
                    value={linkNotes}
                    onChangeText={setLinkNotes}
                    multiline
                />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, color: "#333", fontWeight: "500" }}>
                        Set as primary service for this place
                    </Text>
                    <Switch
                        value={isPrimary}
                        onValueChange={setIsPrimary}
                        trackColor={{ false: "#ccc", true: "#2e7d32" }}
                        thumbColor={isPrimary ? "#fff" : "#f4f3f4"}
                    />
                </View>
            </View>


            <Text style={sectionTitle}>📝 Service Details</Text>
            <View style={{ marginHorizontal: 10 }}>
                <TextInput
                    style={inputStyle}
                    placeholder="Service name"
                    value={name}
                    onChangeText={setName}
                />

                <TextInput
                    style={{ ...inputStyle, minHeight: 80, textAlignVertical: "top" }}
                    placeholder="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <TextInput
                        style={{ ...inputStyle, flex: 0.48 }}
                        placeholder="Town / City"
                        value={town}
                        onChangeText={setTown}
                    />
                    <TextInput
                        style={{ ...inputStyle, flex: 0.48 }}
                        placeholder="Governorate"
                        value={governorate}
                        onChangeText={setGovernorate}
                    />
                </View>
            </View>



            <Text style={{ ...sectionTitle, marginTop: 10 }}>🗂️ Service Type</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={chipScroll}
            >
                {SERVICE_TYPES.map((item) => (
                    <ChipButton
                        key={item}
                        label={item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        active={type === item}
                        onPress={() => setType(item)}
                        activeBg="#1e5c1e"
                        inactiveBg="rgba(255,255,255,0.12)"
                    />
                ))}
            </ScrollView>

            <Text style={sectionTitle}>💰 Price Range</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={chipScroll}
            >
                {PRICE_RANGES.map((item) => (
                    <ChipButton
                        key={item}
                        label={item.charAt(0).toUpperCase() + item.slice(1)}
                        active={priceRange === item}
                        onPress={() => setPriceRange(item)}
                        activeBg="#c62828"
                        inactiveBg="rgba(255,255,255,0.12)"
                    />
                ))}
            </ScrollView>

            <Text style={sectionTitle}>🏷️ Pricing Type</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={chipScroll}
            >
                {PRICING_TYPES.map((item) => (
                    <ChipButton
                        key={item}
                        label={item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        active={pricingType === item}
                        onPress={() => setPricingType(item)}
                        activeBg="#e65100"
                        inactiveBg="rgba(255,255,255,0.12)"
                    />
                ))}
            </ScrollView>

            <View style={{ marginHorizontal: 10 }}>
                <TextInput
                    style={{ ...inputStyle, minHeight: 80, textAlignVertical: "top" }}
                    placeholder="Contact info (phone, email, social media)"
                    value={contactInfo}
                    onChangeText={setContactInfo}
                    multiline
                />

                <TextInput
                    style={inputStyle}
                    placeholder="Opening hours e.g. 9am – 10pm"
                    value={openingHours}
                    onChangeText={setOpeningHours}
                />
            </View>


            {/* Image */}
            <Text style={sectionTitle}>🖼️ Service Image</Text>
            <TouchableOpacity
                style={{
                    backgroundColor: "rgba(255,255,255,0.8)",
                    borderWidth: 2,
                    borderColor: "#a5d6a7",
                    borderRadius: 16,
                    height: 220,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                    marginHorizontal:10,
                    overflow: "hidden",
                }}
                onPress={pickImage}
                activeOpacity={0.8}
            >
                {!image ? (
                    <View style={{ alignItems: "center", padding: 16 }}>
                        <Ionicons name="camera-outline" size={36} color="#4caf50" />
                        <Text style={{ color: "#555", marginTop: 8, textAlign: "center", fontWeight:"regular" }}>
                            Tap to upload an image
                        </Text>
                    </View>
                ) : (
                    <Image
                        source={{ uri: image.uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                    />
                )}
            </TouchableOpacity>

            <Text style={sectionTitle}>📍 Service Location</Text>
            <View
                style={{
                    height: 300,
                    borderRadius: 16,
                    overflow: "hidden",
                    marginBottom: 8,
                    borderWidth: 2,
                    borderColor: "#c8e6c9",
                    marginHorizontal:8,
                }}
            >
                <MapPicker setPosition={setPosition} />
            </View>
            {!position ? (
                <Text style={{ textAlign: "center", color: "#777", marginBottom: 16 }}>
                    Tap the map to pick a location
                </Text>
            ) : (
                <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                    <Text style={{ color: "#2e7d32", marginLeft: 6, fontWeight: "600" }}>
                        Location selected ✓
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={{
                    backgroundColor: "#1e5c1e",
                    borderRadius: 30,
                    paddingVertical: 14,
                    alignItems: "center",
                    marginTop: 12,
                    marginHorizontal: 16,
                    shadowColor: "#1e5c1e",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                }}
                onPress={handleAddService}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                        Submit Service
                    </Text>
                )}
            </TouchableOpacity>

            <Text
                style={{
                    textAlign: "center",
                    color: "#555",
                    fontSize: 12,
                    marginTop: 12,
                    fontStyle: "italic",
                }}
            >
                Your submission will be reviewed by an admin before going live.
            </Text>
        </ScrollView>
    );
}

export default AddService;