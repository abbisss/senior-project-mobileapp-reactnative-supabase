import { router, useFocusEffect } from "expo-router";
import { useContext, useEffect, useState, useCallback } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";

function PlaceCard({ place, onUnFavorite, CardWidth, ImageHeight }) {
  const { dbUser } = useContext(UserContext);

  const [rating, setRating] = useState(null);
  const [isFav, setIsFav] = useState(false);

  const CARD_WIDTH = CardWidth;
  const IMAGE_HEIGHT = ImageHeight;

  // Fetch average rating for the place
  async function getPlaceAverageRating(placeId) {
    const { data, error } = await supabase
      .from("Place_Review")
      .select("rating")
      .eq("place_id", placeId);

    if (error || !data || data.length === 0) return null;

    const sum = data.reduce((acc, review) => acc + review.rating, 0);
    return (sum / data.length).toFixed(1);
  }

  async function checkFavorite() {
    const { data, error } = await supabase
      .from("Favorite_Place")
      .select("*")
      .eq("user_id", dbUser?.user_id)
      .eq("place_id", place.place_id);

    if (!error && data && data.length > 0) {
      setIsFav(true);
    } else {
      setIsFav(false);
    }
  }

  async function handleFavoriteToggle() {
    if (isFav) {
      const { error } = await supabase
        .from("Favorite_Place")
        .delete()
        .eq("user_id", dbUser?.user_id)
        .eq("place_id", place.place_id);

      if (!error) {
        setIsFav(false);
        if (onUnFavorite) onUnFavorite(place.place_id);
      }
    } else {
      const { error } = await supabase.from("Favorite_Place").insert([
        {
          user_id: dbUser?.user_id,
          place_id: place.place_id,
        },
      ]);

      if (!error) {
        setIsFav(true);
      }
    }
  }

  useEffect(() => {
    getPlaceAverageRating(place.place_id).then(setRating);
  }, [place.place_id]);
  
  useEffect(() => 
    { checkFavorite();   
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [place.place_id, dbUser?.user_id]);
  useFocusEffect(
    useCallback(() => {
      checkFavorite();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [place.place_id, dbUser?.user_id])
  );

  const difficultyColor =
    place.difficulty === "easy"
      ? "#28a745"
      : place.difficulty === "medium"
        ? "#ffc107"
        : "#dc3545";

  const difficultyTextColor = place.difficulty === "medium" ? "#333" : "#fff";

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
              place.Place_Image?.[0]?.url ||
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
        onPress={() =>
          router.push(`/place/${place.place_id}`)
        }
      >
        <View style={{ padding: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: "700",
              marginBottom: 6,
              color: "#1a1a1a",
            }}
          >
            {place.name}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 20,
                backgroundColor: difficultyColor,
              }}
            >
              <Text
                style={{
                  color: difficultyTextColor,
                  fontWeight: "600",
                  fontSize: 11,
                  textTransform: "capitalize",
                }}
              >
                {place.difficulty}
              </Text>
            </View>

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
            {place.description}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default PlaceCard;