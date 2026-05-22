import { router, useFocusEffect } from "expo-router";
import { useContext, useEffect, useState, useCallback } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import { Ionicons } from "@expo/vector-icons";

function ServiceCard({ service, onUnFavorite, CardWidth, ImageHeight }) {
    const { dbUser } = useContext(UserContext);

    const [rating, setRating] = useState(null);
    const [isFav, setIsFav] = useState(false);

    const CARD_WIDTH = CardWidth;
    const IMAGE_HEIGHT = ImageHeight;

    async function getServiceAverageRating(serviceId) {
        const { data, error } = await supabase
            .from("Service_Review")
            .select("rating")
            .eq("service_id", serviceId);

        if (error || !data || data.length === 0) return null;

        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        return (sum / data.length).toFixed(1);
    }

    async function checkFavorite() {
        const { data, error } = await supabase
            .from("Favorite_Service")
            .select("*")
            .eq("user_id", dbUser.user_id)
            .eq("service_id", service.service_id);

        if (!error && data && data.length > 0) {
            setIsFav(true);
        } else {
            setIsFav(false);
        }
    }

    async function handleFavoriteToggle() {
        if (isFav) {
            const { error } = await supabase
                .from("Favorite_Service")
                .delete()
                .eq("user_id", dbUser.user_id)
                .eq("service_id", service.service_id);

            if (!error) {
                setIsFav(false);
                if (onUnFavorite) onUnFavorite(service.service_id);
            }
        } else {
            const { error } = await supabase.from("Favorite_Service").insert([
                {
                    user_id: dbUser.user_id,
                    service_id: service.service_id,
                },
            ]);

            if (!error) {
                setIsFav(true);
            }
        }
    }

    useEffect(() => {
        getServiceAverageRating(service.service_id).then(setRating);
    }, [service.service_id]);

    useEffect(() => {
        checkFavorite();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [service.service_id, dbUser.user_id]);

    useFocusEffect(
        useCallback(() => {
            checkFavorite();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [service.service_id, dbUser.user_id])
    );



    const priceBadgeColor =
        service.price_range === "cheap"
            ? { bg: "#28a745", text: "#fff" }
            : service.price_range === "budget"
                ? { bg: "#ffc107", text: "#333" }
                : service.price_range === "moderate"
                    ? { bg: "#17a2b8", text: "#333" }
                    : service.price_range === "expensive"
                        ? { bg: "#dc3545", text: "#fff" }
                        : service.price_range === "luxury"
                            ? { bg: "#1a1a1a", text: "#fff" }
                            : { bg: "#6c757d", text: "#333" };

    return (
        <View
            style={{
                width: CARD_WIDTH,
                backgroundColor: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                marginRight: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
            }}
        >
            <View style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT }}>
                <Image
                    source={{
                        uri:
                            service.Service_Image?.[0]?.url ||
                            "https://via.placeholder.com/400x300?text=No+Image",
                    }}
                    style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT }}
                    resizeMode="cover"
                />

                <TouchableOpacity
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(255,255,255,0.85)",
                        borderRadius: 50,
                        width: 32,
                        height: 32,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                    onPress={handleFavoriteToggle}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Text style={{ fontSize: 16 }}>
                        {isFav ? "❤️" : "🤍"}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/service/${service.service_id}`)}
            >
                <View style={{ padding: 10 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 6,
                        }}
                    >
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: "#1a1a1a",
                                flexShrink: 1,
                            }}
                        >
                            {service.name}
                        </Text>
                        <Text style={{ fontSize: 14 }}>
                            {service.is_verified ? (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color="#0d6efd"
                                    style={{ alignSelf: 'center', marginTop: 5 }}
                                />
                            ) : (
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={20}
                                    color="#6c757d"
                                    style={{ alignSelf: 'center', marginTop: 5 }}
                                />
                            )}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 6,
                            marginBottom: 6,
                        }}
                    >
                        <View
                            style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 20,
                                backgroundColor: "#6c757d",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: 11,
                                    textTransform: "capitalize",
                                }}
                            >
                                {service.type}
                            </Text>
                        </View>

                        {service.price_range && (
                            <View
                                style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 20,
                                    backgroundColor: priceBadgeColor.bg,
                                }}
                            >
                                <Text
                                    style={{
                                        color: priceBadgeColor.text,
                                        fontWeight: "600",
                                        fontSize: 11,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {service.price_range}
                                </Text>
                            </View>
                        )}

                        <View
                            style={{
                                backgroundColor: "#d4edda",
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 20,
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ fontSize: 11 }}>⭐ </Text>
                            <Text
                                style={{ fontSize: 11, fontWeight: "600", color: "#155724" }}
                            >
                                {rating ?? "Not yet"}
                            </Text>
                        </View>
                    </View>

                    <Text
                        numberOfLines={2}
                        style={{ fontSize: 12, color: "#777", lineHeight: 17 }}
                    >
                        {service.description}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

export default ServiceCard;