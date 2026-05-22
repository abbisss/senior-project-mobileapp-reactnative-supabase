import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import MapViewer from "@/src/maps/map_viewer";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";


export default function ServiceDetails() {
    const { id } = useLocalSearchParams();
    const { dbUser } = useContext(UserContext);

    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imagesUrls, setImagesUrls] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [ratingData, setRatingData] = useState(null);
    const [personalRating, setPersonalRating] = useState(1);
    const [reviewText, setReviewText] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewExists, setReviewExists] = useState(false);
    const [peopleReviews, setPeopleReviews] = useState([]);

    const showToast = (message) => {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert("", message);
        }
    };


    useEffect(() => {
        async function load() {
            const data = await getServiceRatingData();
            setRatingData(data);
        }
        load();
        checkIsFavorite();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        fetchServiceDetails();
        checkIsFavorite();
        checkPersonalReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbUser?.user_id, id]);

    useEffect(() => {
        if (service && service.Service_Image) {
            const urls = service.Service_Image.map((img) => img.url);
            setImagesUrls(urls);
        }
    }, [service]);

    useEffect(() => {
        getUsersReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, peopleReviews]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (service?.is_verified) {
                ToastAndroid.show(
                    "The service is verified by the owner",
                    ToastAndroid.SHORT
                );
            } else {
                ToastAndroid.show(
                    "The service was added by a user or admin, but not yet verified",
                    ToastAndroid.SHORT
                );
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [service]);

    async function fetchServiceDetails() {
        if (!id) return;
        const { data, error } = await supabase
            .from("Service")
            .select("*, Service_Image (url), User:created_by(name)")
            .eq("service_id", id)
            .single();
        if (error) {
            console.error("Error fetching service details:", error);
            return;
        }
        setService(data);
        setLoading(false);
    }

    async function checkIsFavorite() {
        const user_id = dbUser?.user_id;
        if (!user_id) return;
        const { data, error } = await supabase
            .from("Favorite_Service")
            .select("*")
            .eq("user_id", user_id)
            .eq("service_id", id)
            .maybeSingle();
        if (error) {
            console.error("Error checking favorite status:", error);
            return;
        }
        setIsFavorite(!!data);
    }

    async function toggleFavorite() {
        const user_id = dbUser?.user_id;
        if (!user_id) return;
        if (isFavorite) {
            const { error } = await supabase
                .from("Favorite_Service")
                .delete()
                .eq("user_id", user_id)
                .eq("service_id", id);
            if (error) {
                console.error("Error removing from favorites:", error);
                return;
            }
            setIsFavorite(false);
        } else {
            const { error } = await supabase
                .from("Favorite_Service")
                .insert({ user_id, service_id: id });
            if (error) {
                console.error("Error adding to favorites:", error);
                return;
            }
            setIsFavorite(true);
        }
    }

    async function getServiceRatingData() {
        const { data, error } = await supabase
            .from("Service_Review")
            .select("rating")
            .eq("service_id", id);
        if (error) {
            console.error("Error fetching ratings:", error);
            return null;
        }
        const reviews = data || [];
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total ? sum / total : 0;

        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => {
            counts[r.rating] = (counts[r.rating] || 0) + 1;
        });

        return { average, total, counts };
    }

    async function checkPersonalReview() {
        const user_id = dbUser?.user_id;
        if (!user_id) return;
        const { data, error } = await supabase
            .from("Service_Review")
            .select("*")
            .eq("service_id", id)
            .eq("user_id", user_id)
            .maybeSingle();
        if (error) {
            console.log("error fetching personal rating", error);
            return;
        }
        if (!data) {
            setReviewExists(false);
            setPersonalRating(1);
            setReviewText("");
            return;
        }
        setReviewExists(true);
        setPersonalRating(data.rating);
        setReviewText(data.comment);
    }

    async function handlePersonalReview() {
        if (submittingReview) return;
        setSubmittingReview(true);
        const user_id = dbUser?.user_id;
        if (!user_id) return;

        if (reviewExists) {
            const { error } = await supabase
                .from("Service_Review")
                .update({ rating: personalRating, comment: reviewText })
                .eq("user_id", user_id)
                .eq("service_id", id);
            if (error) console.log("error updating review", error);
            await checkPersonalReview();
            await getUsersReviews();
            const data = await getServiceRatingData();
            setRatingData(data);
            setSubmittingReview(false);
            showToast("Rating updated successfully!");
            return;
        }

        const { error } = await supabase
            .from("Service_Review")
            .insert({
                rating: personalRating,
                comment: reviewText,
                user_id,
                service_id: id,
            });
        if (error) console.log("error inserting review", error);
        await checkPersonalReview();
        await getUsersReviews();
        const data = await getServiceRatingData();
        setRatingData(data);
        setSubmittingReview(false);
        showToast("Rating added successfully!");
    }

    async function handleDeleteReview() {
        const user_id = dbUser?.user_id;
        if (!user_id) return;
        if (!reviewExists) {
            showToast("You must have a rating to delete it!");
            return;
        }

        const { error } = await supabase
            .from("Service_Review")
            .delete()
            .eq("user_id", user_id)
            .eq("service_id", id);
        if (error) {
            console.log("error deleting the rating:", error);
            return;
        }

        setReviewExists(false);
        showToast("Review deleted successfully!");
        setPersonalRating(1);
        setReviewText("");
        await checkPersonalReview();
        await getUsersReviews();
        const data = await getServiceRatingData();
        setRatingData(data);
    }

    async function getUsersReviews() {
        const { data, error } = await supabase
            .from("Service_Review")
            .select(
                `review_id, rating, comment, created_at, User ( name, profile_pic )`
            )
            .eq("service_id", id);
        if (error) {
            console.log("error getting personal reviews", error);
            return [];
        }
        setPeopleReviews(data || []);
        return data;
    }

    const renderStars = (rating, size = 18) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) {
                stars.push(
                    <Text key={i} style={{ color: "#f5a623", fontSize: size }}>
                        ★
                    </Text>
                );
            } else if (rating >= i - 0.5) {
                stars.push(
                    <Text key={i} style={{ color: "#f5a623", fontSize: size }}>
                        ½
                    </Text>
                );
            } else {
                stars.push(
                    <Text key={i} style={{ color: "#ccc", fontSize: size }}>
                        ★
                    </Text>
                );
            }
        }
        return stars;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, marginLeft: 60 }}>
                    Loading Service Details...
                </Text>
            </View>
        );
    }

    const getPriceBadgeStyle = (priceRange) => {
        switch (priceRange) {
            case "cheap":
                return { bg: "#28a745", text: "#fff" };
            case "budget":
                return { bg: "#ffc107", text: "#333" };
            case "moderate":
                return { bg: "#17a2b8", text: "#fff" };
            case "expensive":
                return { bg: "#dc3545", text: "#fff" };
            case "luxury":
                return { bg: "#343a40", text: "#fff" };
            default:
                return { bg: "#6c757d", text: "#fff" };
        }
    };

    const priceColors = getPriceBadgeStyle(service.price_range);
    const typeLabel = service.type.charAt(0).toUpperCase() + service.type.slice(1);



    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: "#86cc80", paddingHorizontal: 0 }}
        >
            <View style={{ position: "relative", width: "100%", height: 250 }}>
                {imagesUrls.length > 0 && (
                    <>
                        <Image
                            source={{ uri: imagesUrls[currentImageIndex] }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                        />
                        <View
                            style={{
                                borderColor: "#ffffff",
                                position: "absolute",
                                top: 30,
                                left: 20,
                                padding: 10,
                                borderRadius: 40,
                                borderWidth: 2,
                            }}
                        >
                            <Pressable onPress={() => router.back()}>
                                <Ionicons name="arrow-back" size={15} color="white" />
                            </Pressable>
                        </View>

                        <View
                            style={{
                                position: "absolute",
                                top: 30,
                                right: 10,
                                backgroundColor: "rgba(255,255,255,0.7)",
                                paddingHorizontal: 10,
                                borderRadius: 10,
                            }}
                        >
                            <Text style={{ color: "#000", fontSize: 14 }}>
                                {currentImageIndex + 1} / {imagesUrls.length}
                            </Text>
                        </View>

                        {imagesUrls.length > 1 && (
                            <>
                                <TouchableOpacity
                                    onPress={() =>
                                        setCurrentImageIndex((prev) =>
                                            prev === 0 ? imagesUrls.length - 1 : prev - 1
                                        )
                                    }
                                    style={{
                                        position: "absolute",
                                        left: 10,
                                        top: "50%",
                                        backgroundColor: "rgba(255,255,255,0.6)",
                                        borderRadius: 15,
                                        width: 30,
                                        height: 30,
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Text style={{ fontSize: 18, color: "#000" }}>❮</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() =>
                                        setCurrentImageIndex((prev) =>
                                            prev === imagesUrls.length - 1 ? 0 : prev + 1
                                        )
                                    }
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        top: "50%",
                                        backgroundColor: "rgba(255,255,255,0.6)",
                                        borderRadius: 15,
                                        width: 30,
                                        height: 30,
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Text style={{ fontSize: 18, color: "#000" }}>❯</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </>
                )}
            </View>

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 15,
                    marginTop: 10,
                    gap: 1,
                }}
            >
                <Text style={{ fontSize: 26, fontWeight: "bold" }}>
                    {service.name}
                </Text>
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
            </View>

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginHorizontal: 15,
                    marginTop: 5,
                    gap: 8,
                }}
            >
                <View
                    style={{
                        backgroundColor: "#198754",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                        {typeLabel}
                    </Text>
                </View>

                {service.price_range && (
                    <View
                        style={{
                            backgroundColor: priceColors.bg,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: priceColors.text,
                                fontSize: 14,
                                fontWeight: "bold",
                                textTransform: "capitalize",
                            }}
                        >
                            {service.price_range}
                        </Text>
                    </View>
                )}

                {service.pricing_type && (
                    <View
                        style={{
                            backgroundColor: "#6c757d",
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: 14,
                                fontWeight: "bold",
                                textTransform: "capitalize",
                            }}
                        >
                            {service.pricing_type}
                        </Text>
                    </View>
                )}

                <Text style={{ fontSize: 14, color: "#6c757d", fontWeight: "bold" }}>
                    📍 {service.town}, {service.governorate} Governorate
                </Text>
            </View>

            {service.contact_info && (
                <View
                    style={{
                        marginHorizontal: 15,
                        marginTop: 10,
                        backgroundColor: "#6dc48e",
                        padding: 14,
                        borderRadius: 14,
                        elevation: 2,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "#666",
                            marginBottom: 4,
                        }}
                    >
                        CONTACT
                    </Text>

                    <Text
                        style={{
                            fontSize: 16,
                            color: "#222",
                        }}
                    >
                        {service.contact_info}
                    </Text>
                </View>
            )}

            {service.opening_hours && (
                <View
                    style={{
                        marginHorizontal: 15,
                        marginTop: 10,
                        backgroundColor: "#6dc48e",
                        padding: 14,
                        borderRadius: 14,
                        elevation: 2,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "#666",
                            marginBottom: 4,
                        }}
                    >
                        OPENING HOURS
                    </Text>

                    <Text
                        style={{
                            fontSize: 16,
                            color: "#222",
                        }}
                    >
                        {service.opening_hours}
                    </Text>
                </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginHorizontal: 15, marginTop: 15, gap: 10 }}>
                <TouchableOpacity
                    onPress={toggleFavorite}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 0.5,
                        backgroundColor: isFavorite ? "#dc3545" : "transparent",
                        borderColor: isFavorite ? "#dc3545" : "#198754",
                    }}
                >
                    <Text
                        style={{
                            color: isFavorite ? "#fff" : "#dc3546d2",
                            marginRight: 5,
                            fontWeight: "bold",
                        }}
                    >
                        ♥
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: isFavorite ? "#fff" : "#198754",
                            fontWeight: "bold",
                        }}
                    >
                        {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    </Text>
                </TouchableOpacity>

            </View>

            {!ratingData ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <View
                    style={{
                        flexDirection: "row",
                        backgroundColor: "rgba(13,110,253,0.1)",
                        padding: 15,
                        marginHorizontal: 15,
                        marginTop: 20,
                        borderRadius: 12,
                        gap: 20,
                    }}
                >
                    <View style={{ alignItems: "center", flex: 1 }}>
                        <Text style={{ fontSize: 32, fontWeight: "bold" }}>
                            {ratingData.average ? ratingData.average.toFixed(1) : "0.0"}
                        </Text>
                        <View style={{ flexDirection: "row", marginTop: 4 }}>
                            {renderStars(ratingData.average, 22)}
                        </View>
                        <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "bold" }}>
                            {ratingData.total || 0} ratings
                        </Text>
                    </View>

                    <View style={{ flex: 2 }}>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = ratingData.counts[star] || 0;
                            const percent = ratingData.total
                                ? (count / ratingData.total) * 100
                                : 0;
                            return (
                                <View
                                    key={star}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }}
                                >
                                    <Text style={{ width: 30, fontSize: 12, fontWeight: "bold" }}>
                                        {star}★
                                    </Text>
                                    <View
                                        style={{
                                            flex: 1,
                                            height: 6,
                                            backgroundColor: "#e9ecef",
                                            borderRadius: 3,
                                            overflow: "hidden",
                                            marginHorizontal: 5,
                                        }}
                                    >
                                        <View
                                            style={{
                                                height: "100%",
                                                backgroundColor: "#f5a623",
                                                width: `${percent}%`,
                                            }}
                                        />
                                    </View>
                                    <Text style={{ width: 20, fontSize: 12, color: "#6c757d" }}>
                                        {count}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            <View style={{ marginHorizontal: 15, marginTop: 20 }}>
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#6c757d",
                        marginBottom: 5,
                    }}
                >
                    ABOUT THE SERVICE
                </Text>
                <Text style={{ fontSize: 16, lineHeight: 22 }}>
                    {service.description}
                </Text>
            </View>

            <View style={{ marginHorizontal: 15, marginTop: 20 }}>
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#6c757d",
                        marginBottom: 5,
                    }}
                >
                    LOCATION
                </Text>
                <Text
                    style={{
                        fontSize: 12,
                        fontStyle: "italic",
                        color: "#6c757d",
                        marginBottom: 8,
                    }}
                >
                    Tap the map to view on Google Maps
                </Text>
                <MapViewer place={service} />
            </View>

            <View
                style={{
                    height: 1,
                    backgroundColor: "#dee2e6",
                    marginHorizontal: 15,
                    marginVertical: 20,
                }}
            />

            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#6c757d",
                    marginHorizontal: 15,
                    marginBottom: 10,
                }}
            >
                LEAVE A RATING
            </Text>
            <View
                style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 8,
                    padding: 15,
                    marginHorizontal: 15,
                }}
            >
                <Text style={{ fontSize: 16, fontWeight: "300", marginBottom: 10 }}>
                    Rate this service
                </Text>
                <View style={{ flexDirection: "row", gap: 5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setPersonalRating(star)}>
                            <Text
                                style={{
                                    fontSize: 30,
                                    color: star <= personalRating ? "#f5a623" : "#ccc",
                                }}
                            >
                                ★
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    placeholder="Share your experience..."
                    value={reviewText}
                    onChangeText={setReviewText}
                    style={{
                        borderWidth: 1,
                        borderColor: "#ddd",
                        borderRadius: 6,
                        padding: 10,
                        marginTop: 15,
                        backgroundColor: "rgba(0,0,0,0.03)",
                        minHeight: 80,
                        textAlignVertical: "top",
                    }}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View
                style={{
                    flexDirection: "row",
                    gap: 10,
                    marginHorizontal: 15,
                    marginTop: 15,
                }}
            >
                <TouchableOpacity
                    style={{
                        backgroundColor: "#0d6efd",
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                    }}
                    onPress={handlePersonalReview}
                    disabled={submittingReview}
                >
                    <Text style={{ color: "#fff", textAlign: "center" }}>
                        {reviewExists ? "Update Review" : "Submit Review"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: "#dc3545",
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                    }}
                    onPress={handleDeleteReview}
                >
                    <Text style={{ color: "#fff", textAlign: "center" }}>
                        Delete Review
                    </Text>
                </TouchableOpacity>
            </View>

            {submittingReview && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 15,
                        marginTop: 10,
                        gap: 10,
                    }}
                >
                    <ActivityIndicator />
                    <Text>Submitting review</Text>
                </View>
            )}

            <View
                style={{
                    height: 1,
                    backgroundColor: "#dee2e6",
                    marginHorizontal: 15,
                    marginVertical: 20,
                }}
            />

            <Text
                style={{
                    marginHorizontal: 15,
                    fontSize: 16,
                    color: "#6c757d",
                    marginBottom: 10,
                }}
            >
                {ratingData?.total || 0} Ratings & Reviews
            </Text>

            {peopleReviews && peopleReviews.length > 0 ? (
                peopleReviews.map((userReview) => (
                    <View
                        key={userReview.review_id}
                        style={{
                            backgroundColor: "rgba(13, 109, 253, 0.07)",
                            borderRadius: 8,
                            padding: 15,
                            marginHorizontal: 15,
                            marginBottom: 10,
                            borderWidth: 1,
                            borderColor: "#dee2e6",
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <Image
                                    source={{ uri: userReview.User?.profile_pic }}
                                    style={{ width: 45, height: 45, borderRadius: 22.5 }}
                                />
                                <View>
                                    <Text style={{ fontWeight: "600" }}>
                                        {userReview.User?.name}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: "#6c757d",
                                            fontWeight: "600",
                                        }}
                                    >
                                        {new Date(userReview.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: "row" }}>
                                {renderStars(userReview.rating, 16)}
                            </View>
                        </View>
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                                marginTop: 10,
                            }}
                        >
                            <Text style={{ flex: 1, color: "#6c757d", marginRight: 10 }}>
                                {userReview.comment}
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <Text
                    style={{
                        textAlign: "center",
                        color: "#6c757d",
                        marginTop: 10,
                        marginBottom: 50,
                    }}
                >
                    No reviews yet.
                </Text>
            )}
        </ScrollView>
    );
}