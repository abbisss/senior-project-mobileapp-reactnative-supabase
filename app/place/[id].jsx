import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import MapViewer from "@/src/maps/map_viewer";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
export default function PlaceDetails() {
    const { id } = useLocalSearchParams();
    const { dbUser } = useContext(UserContext);

    const [place, setPlace] = useState(null);
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

    const [addImage, setAddImage] = useState(false);
    const [imageIsBeingAdded, setImageisBeingAdded] = useState(false);
    const [image, setImage] = useState(null);

    const showToast = (message) => {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert("", message);
        }
    };

    useEffect(() => {
        async function load() {
            const data = await getPlaceRatingData();
            setRatingData(data);
        }
        load();
        checkIsFavorite();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchPlaceDetails();
        checkIsFavorite();
        checkPersonalReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbUser?.user_id, id]);

    useEffect(() => {
        if (place && place.Place_Image) {
            const urls = place.Place_Image.map((image) => image.url);
            setImagesUrls(urls);
        }
    }, [place]);

    useEffect(() => {
        getUsersReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, peopleReviews]);

    async function fetchPlaceDetails() {
        if (!id) return;

        const { data, error } = await supabase
            .from("Place")
            .select(`
            *,
            Place_Image!inner(url, status),
            User:created_by(name)
        `)
            .eq("place_id", id)
            .eq("Place_Image.status", "approved")
            .single();

        if (error) {
            console.error("Error fetching place details:", error);
            return;
        }

        setPlace(data);
        setLoading(false);
    }

    async function checkIsFavorite() {
        const user_id = dbUser?.user_id;
        if (!user_id) return;
        const { data, error } = await supabase
            .from("Favorite_Place")
            .select("*")
            .eq("user_id", user_id)
            .eq("place_id", id)
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
                .from("Favorite_Place")
                .delete()
                .eq("user_id", user_id)
                .eq("place_id", id);
            if (error) {
                console.error("Error removing from favorites:", error);
                return;
            }
            setIsFavorite(false);
        } else {
            const { error } = await supabase
                .from("Favorite_Place")
                .insert({ user_id, place_id: id });
            if (error) {
                console.error("Error adding to favorites:", error);
                return;
            }
            setIsFavorite(true);
        }
    }

    async function getPlaceRatingData() {
        const { data, error } = await supabase
            .from("Place_Review")
            .select("rating")
            .eq("place_id", id);
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
            .from("Place_Review")
            .select("*")
            .eq("place_id", id)
            .eq("user_id", user_id)
            .limit(1)
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
                .from("Place_Review")
                .update({ rating: personalRating, comment: reviewText })
                .eq("user_id", user_id)
                .eq("place_id", id);
            if (error) console.log("error updating review", error);
            await checkPersonalReview();
            await getUsersReviews();
            const data = await getPlaceRatingData();
            setRatingData(data);
            setSubmittingReview(false);
            showToast("Rating updated successfully!");
            return;
        }

        const { error } = await supabase.from("Place_Review").insert({
            rating: personalRating,
            comment: reviewText,
            user_id,
            place_id: id,
        });
        if (error) console.log("error inserting review", error);
        await checkPersonalReview();
        await getUsersReviews();
        const data = await getPlaceRatingData();
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
            .from("Place_Review")
            .delete()
            .eq("user_id", user_id)
            .eq("place_id", id);
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
        const data = await getPlaceRatingData();
        setRatingData(data);
    }

    async function getUsersReviews() {
        const { data, error } = await supabase
            .from("Place_Review")
            .select(
                `review_id, rating, comment, created_at, User ( name, profile_pic )`
            )
            .eq("place_id", id);
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

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    async function addPLaceImages() {
        if (!image) {
            Alert.alert("Error", "Image is required");
            return;
        }
        let imageUrl = "";
        setImageisBeingAdded(true);
        const fileName = `pictures/${place.name.replace(/\s+/g, "_").toLowerCase()}-${Date.now()}.jpg`;

        const response = await fetch(image.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("places")
            .upload(fileName, arrayBuffer, {
                contentType: "image/jpeg",
                upsert: true,
            });
        if (uploadError) {
            Alert.alert("Error", "Image upload failed" + uploadError);
            console.log(uploadError)
            setImageisBeingAdded(false);
            return;
        }

        const { data: publicData } = supabase.storage
            .from("places")
            .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;
        const { error: imageError } = await supabase
            .from("Place_Image")
            .insert([
                {
                    url: imageUrl,
                    place_id: id,
                    status: "pending"
                },
            ]);

        if (imageError) {
            console.error(imageError);
            Alert.alert("Error", "image failed");
            setImageisBeingAdded(false);
            return;
        }

        Alert.alert("Success", "Image submitted for admin review");
        setAddImage(false);
        setImageisBeingAdded(false);

    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, marginLeft: 60 }}>Loading Place Details...</Text>
            </View>
        );
    }

    const typeLabel = place.type.charAt(0).toUpperCase() + place.type.slice(1);
    const difficultyLabel =
        place.difficulty.charAt(0).toUpperCase() + place.difficulty.slice(1);
    const difficultyColor =
        place.difficulty === "easy"
            ? "#28a745"
            : place.difficulty === "medium"
                ? "#ffc107"
                : "#dc3545";

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "rgba(54, 186, 58, 0.5)" }}
            edges={["top"]}
        >
            <ScrollView style={{ flex: 1, backgroundColor: "#86cc80", paddingHorizontal: 0, paddingTop: 1 }}>

                <View style={{ position: "relative", width: "100%", height: 250 }}>
                    {imagesUrls.length > 0 && (
                        <>
                            <FlatList
                                data={imagesUrls}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(_, index) => index.toString()}
                                onMomentumScrollEnd={(e) => {
                                    const index = Math.round(
                                        e.nativeEvent.contentOffset.x /
                                        e.nativeEvent.layoutMeasurement.width
                                    );
                                    setCurrentImageIndex(index);
                                }}
                                renderItem={({ item }) => (
                                    <Image
                                        source={{ uri: item }}
                                        style={{ width: Dimensions.get("window").width, height: 250 }}
                                        resizeMode="cover"
                                    />
                                )}
                            />

                            {/* Back Button */}
                            <View style={{
                                borderColor: "#ffffff", position: "absolute", top: 30, left: 20,
                                padding: 10, borderRadius: 40, borderWidth: 2
                            }}>
                                <Pressable onPress={() => router.back()}>
                                    <Ionicons name="arrow-back" size={15} color="white" />
                                </Pressable>
                            </View>

                            {/* Image Counter */}
                            <View style={{
                                position: "absolute",
                                top: 30,
                                right: 10,
                                backgroundColor: "rgba(255,255,255,0.7)",
                                paddingHorizontal: 10,
                                borderRadius: 10,
                            }}>
                                <Text style={{ color: "#000", fontSize: 14 }}>
                                    {currentImageIndex + 1} / {imagesUrls.length}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap"
                    }}
                >
                    <Text style={{ fontSize: 26, fontWeight: "bold", marginHorizontal: 15, marginTop: 10 }}>
                        {place.name}
                    </Text>

                </View>

                <Modal
                    visible={addImage}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setAddImage(false)}
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        justifyContent: "flex-end",
                    }}>
                        <View style={{
                            backgroundColor: "#fff",
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: 40,
                        }}>

                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>Add a photo</Text>
                                <TouchableOpacity
                                    onPress={() => setAddImage(false)}
                                    style={{
                                        backgroundColor: "#f2f2f2",
                                        borderRadius: 20,
                                        padding: 6,
                                    }}
                                >
                                    <Ionicons name="close" size={20} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={pickImage}
                                style={{
                                    borderWidth: 1.5,
                                    borderColor: image ? "transparent" : "#d0d0d0",
                                    borderStyle: image ? "solid" : "dashed",
                                    borderRadius: 16,
                                    height: 200,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: image ? "transparent" : "#fafafa",
                                    overflow: "hidden",
                                    marginBottom: 20,
                                }}
                            >
                                {!image ? (
                                    <View style={{ alignItems: "center", gap: 10 }}>
                                        <View style={{
                                            backgroundColor: "#eef2ff",
                                            borderRadius: 50,
                                            padding: 14,
                                        }}>
                                            <Ionicons name="image-outline" size={28} color="#4f46e5" />
                                        </View>
                                        <Text style={{ fontWeight: "600", color: "#333", fontSize: 15 }}>Tap to upload a photo</Text>
                                        <Text style={{ color: "#999", fontSize: 13, textAlign: "center", paddingHorizontal: 20 }}>
                                            You can add more photos after saving the place
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <Image source={{ uri: image.uri }} style={{ width: "100%", height: "100%" }} />
                                        <View style={{
                                            position: "absolute", bottom: 10, right: 10,
                                            backgroundColor: "rgba(0,0,0,0.5)",
                                            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4
                                        }}>
                                            <Text style={{ color: "#fff", fontSize: 12 }}>Tap to change</Text>
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>

                            <Pressable
                                onPress={addPLaceImages}
                                disabled={imageIsBeingAdded || !image}
                                style={{
                                    backgroundColor: imageIsBeingAdded || !image ? "#c7c7c7" : "#4f46e5",
                                    borderRadius: 14,
                                    paddingVertical: 15,
                                    alignItems: "center",
                                }}
                            >
                                {imageIsBeingAdded ? (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Uploading...</Text>
                                    </View>
                                ) : (
                                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Add Image</Text>
                                )}
                            </Pressable>

                        </View>
                    </View>
                </Modal>


                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginHorizontal: 15, marginTop: 5, gap: 8 }}>
                    <View style={{ backgroundColor: "#198754", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>{typeLabel}</Text>
                    </View>
                    <View style={{ backgroundColor: difficultyColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>{difficultyLabel}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: "#6c757d", fontWeight: "bold" }}>
                        <Ionicons
                            name="location"
                            size={14}
                            color="#d32f2f"
                        /> {place.town}, {place.governorate} Governorate
                    </Text>
                </View>

                <Pressable
                    onPress={() => setAddImage(true)}
                    style={{
                        marginTop: 10,
                        marginHorizontal: 15,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        backgroundColor: "#14c214",
                        borderRadius: 14,
                        paddingVertical: 13,
                        paddingHorizontal: 20,
                        shadowColor: "#1feb1f",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Ionicons name="images-outline" size={18} color="#fff" />
                    <Text style={{ fontWeight: "700", fontSize: 15, color: "#fff", letterSpacing: 0.3 }}>
                        Add more pics
                    </Text>
                </Pressable>

                <View style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
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
                            marginHorizontal: 10,
                            marginTop: 15,
                            alignSelf: "flex-start",
                        }}
                    >
                        <Text style={{ color: isFavorite ? "#fff" : "#dc3546d2", marginRight: 5, fontWeight: "bold" }}>
                            ♥
                        </Text>
                        <Text style={{ fontSize: 14, color: isFavorite ? "#fff" : "#198754", fontWeight: "bold" }}>
                            {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 8,
                            borderWidth: 0.5,
                            marginTop: 15,
                            backgroundColor: "#ffa167d8",
                        }}
                        onPress={() => router.push(`/place/nearby_services/${place.place_id}`)}
                    >
                        <Text
                            style={{
                                fontWeight: "bold"
                            }}
                        >View Nearby Services</Text>
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
                                const percent = ratingData.total ? (count / ratingData.total) * 100 : 0;
                                return (
                                    <View key={star} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                        <Text style={{ width: 30, fontSize: 12, fontWeight: "bold" }}>{star}★</Text>
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
                                        <Text style={{ width: 20, fontSize: 12, color: "#6c757d" }}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={{ marginHorizontal: 15, marginTop: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", color: "#6c757d", marginBottom: 5 }}>
                        ABOUT THE PLACE
                    </Text>
                    <Text style={{ fontSize: 16, lineHeight: 22 }}>{place.description}</Text>
                </View>

                <View
                    style={{
                        backgroundColor: "rgba(220,53,69,0.1)",
                        padding: 15,
                        borderRadius: 8,
                        marginHorizontal: 15,
                        marginTop: 20,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: "600", color: "#6c757d", marginBottom: 5 }}>
                        SAFETY TIPS
                    </Text>
                    <Text style={{ fontSize: 12, fontStyle: "italic", color: "#6c757d", marginBottom: 8 }}>
                        (AI MAY BE USED TO REFINE TIPS)
                    </Text>
                    {place.safety_tips ? (
                        place.safety_tips
                            .split(".")
                            .filter(Boolean)
                            .map((sentence, i) => (
                                <Text key={i} style={{ fontSize: 14, marginBottom: 4 }}>
                                    {sentence.trim()}.
                                </Text>
                            ))
                    ) : (
                        <Text>No safety tips available.</Text>
                    )}
                </View>

                <View style={{ marginHorizontal: 15, marginTop: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", color: "#6c757d", marginBottom: 5 }}>
                        LOCATION
                    </Text>
                    <Text style={{ fontSize: 12, fontStyle: "italic", color: "#6c757d", marginBottom: 8 }}>
                        Tap the map to view on Google Maps
                    </Text>
                    <MapViewer place={place} />
                </View>

                <View style={{ height: 1, backgroundColor: "#dee2e6", marginHorizontal: 15, marginVertical: 20 }} />

                <Text style={{ fontSize: 18, fontWeight: "600", color: "#6c757d", marginHorizontal: 15, marginBottom: 10 }}>
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
                    <Text style={{ fontSize: 16, fontWeight: "300", marginBottom: 10 }}>Rate this place</Text>
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
                        placeholder="Share your thoughts, tips or anything that took your attention..."
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

                <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 15, marginTop: 15 }}>
                    <TouchableOpacity
                        style={{ backgroundColor: "#0d6efd", padding: 12, borderRadius: 8, flex: 1 }}
                        onPress={handlePersonalReview}
                        disabled={submittingReview}
                    >
                        <Text style={{ color: "#fff", textAlign: "center" }}>
                            {reviewExists ? "Update Review" : "Submit Review"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ backgroundColor: "#dc3545", padding: 12, borderRadius: 8, flex: 1 }}
                        onPress={handleDeleteReview}
                    >
                        <Text style={{ color: "#fff", textAlign: "center" }}>Delete Review</Text>
                    </TouchableOpacity>
                </View>

                {submittingReview && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 15, marginTop: 10, gap: 10 }}>
                        <ActivityIndicator />
                        <Text>Submitting review</Text>
                    </View>
                )}

                <View style={{ height: 1, backgroundColor: "#dee2e6", marginHorizontal: 15, marginVertical: 20 }} />

                <Text style={{ marginHorizontal: 15, fontSize: 16, color: "#6c757d", marginBottom: 10 }}>
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
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <Image
                                        source={{ uri: userReview.User?.profile_pic }}
                                        style={{ width: 45, height: 45, borderRadius: 22.5 }}
                                    />
                                    <View>
                                        <Text style={{ fontWeight: "600" }}>{userReview.User?.name}</Text>
                                        <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "600" }}>
                                            {new Date(userReview.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: "row" }}>
                                    {renderStars(userReview.rating, 16)}
                                </View>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
                                <Text style={{ flex: 1, color: "#6c757d", marginRight: 10 }}>{userReview.comment}</Text>

                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={{ textAlign: "center", color: "#6c757d", marginTop: 10, marginBottom: 50 }}>No reviews yet.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}