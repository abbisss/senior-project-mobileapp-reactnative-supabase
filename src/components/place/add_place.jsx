import { UserContext } from "@/src/contexts/UserContext";
import { supabase } from "@/src/lib/supabase-client";
import MapPicker from "@/src/maps/map_picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useContext, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function AddPlace({ addPlaceStatus, setAddPlaceStatus }) {
    const { dbUser } = useContext(UserContext);
    const [placeIsBeingAdded, setPlaceIsBeingAdded] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [town, setTown] = useState("");
    const [governorate, setGovernorate] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [safety_tips, setSafety_tips] = useState("");
    const [type, setType] = useState("");
    const [image, setImage] = useState(null);
    const [position, setPosition] = useState(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    async function handleAddPlace() {
        setPlaceIsBeingAdded(false);
        if (!name.trim()) {
            Alert.alert("Error", "Place name is required");
            return;
        }
        if (!type) {
            Alert.alert("Error", "Select place type");
            return;
        }
        if (!difficulty) {
            Alert.alert("Error", "Select difficulty");
            return;
        }
        if (!position) {
            Alert.alert("Error", "Pick location on map");
            return;
        }
        if (!image) {
            Alert.alert("Error", "Image is required");
            return;
        }
        if (!town.trim()) {
            Alert.alert("Error", "Town is required");
            return;
        }
        if (!governorate.trim()) {
            Alert.alert("Error", "Governorate is required");
            return;
        }
        setPlaceIsBeingAdded(true);

        let finalSafetyTips = safety_tips;
        let imageUrl = "";

        const fileName = `pictures/${name.replace(/\s+/g, "_").toLowerCase()}-${Date.now()}.jpg`;

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
            setPlaceIsBeingAdded(false);
            return;
        }

        const { data: publicData } = supabase.storage
            .from("places")
            .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;

        const { data: placeData, error: placeError } = await supabase
            .from("Place")
            .insert([
                {
                    name,
                    description,
                    latitude: position.lat,
                    longitude: position.lng,
                    town,
                    governorate,
                    type,
                    difficulty,
                    safety_tips: finalSafetyTips,
                    status: "pending",
                    created_by: dbUser.user_id,
                },
            ])
            .select()
            .single();

        if (placeError) {
            Alert.alert("Error", "Failed to add place");
            setPlaceIsBeingAdded(false);
            return;
        }

        const { error: imageError } = await supabase
            .from("Place_Image")
            .insert([
                {
                    url: imageUrl,
                    place_id: placeData.place_id,
                },
            ]);

        if (imageError) {
            console.error(imageError);
            Alert.alert("Error", "Place added but image failed");
            setPlaceIsBeingAdded(false);
            return;
        }

        Alert.alert("Success", "Place submitted for admin review");
        setAddPlaceStatus(!addPlaceStatus);
        setPlaceIsBeingAdded(false);
    }

    return (
        <Modal
            visible={addPlaceStatus}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setAddPlaceStatus(!addPlaceStatus)}
        >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }}>
                    <View
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: 12,
                            padding: 16,
                            elevation: 5,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Place Details</Text>
                            <TouchableOpacity onPress={() => setAddPlaceStatus(!addPlaceStatus)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 12,
                                    fontSize: 14,
                                    backgroundColor: "#f9f9f9",
                                }}
                                placeholder="Place name"
                                value={name}
                                onChangeText={setName}
                            />
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 12,
                                    fontSize: 14,
                                    backgroundColor: "#f9f9f9",
                                    minHeight: 80,
                                    textAlignVertical: "top",
                                }}
                                placeholder="Description"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: "#ccc",
                                        borderRadius: 8,
                                        padding: 12,
                                        marginBottom: 12,
                                        fontSize: 14,
                                        backgroundColor: "#f9f9f9",
                                        flex: 0.48,
                                    }}
                                    placeholder="Town/City"
                                    value={town}
                                    onChangeText={setTown}
                                />
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: "#ccc",
                                        borderRadius: 8,
                                        padding: 12,
                                        marginBottom: 12,
                                        fontSize: 14,
                                        backgroundColor: "#f9f9f9",
                                        flex: 0.48,
                                    }}
                                    placeholder="Governorate"
                                    value={governorate}
                                    onChangeText={setGovernorate}
                                />
                            </View>


                            <View style={{ marginBottom: 12 }}>
                                <Text
                                    style={{
                                        padding: 12,
                                        fontSize: 14,
                                        color: "#3f3e3e"
                                    }}
                                >Place Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginTop: 6 }}>
                                    {[
                                        "river", "mountain", "forest", "lake", "beach", "waterfall",
                                        "cave", "valley", "hill", "park", "historical", "religious",
                                    ].map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={{
                                                backgroundColor: type === item ? "#007bff" : "#eee",
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                marginRight: 8,
                                            }}
                                            onPress={() => setType(item)}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: "bold", color: type === item ? "#fff" : "#333" }}>
                                                {item.charAt(0).toUpperCase() + item.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={{ marginBottom: 12 }}>
                                <Text
                                    style={{
                                        padding: 12,
                                        fontSize: 14,
                                        color: "#3f3e3e",
                                        marginTop: -5
                                    }}

                                >Place Difficulty</Text>
                                <View style={{ flexDirection: "row", marginTop: 6 }}>
                                    {["easy", "medium", "hard"].map((lvl) => (
                                        <TouchableOpacity
                                            key={lvl}
                                            style={{
                                                backgroundColor: difficulty === lvl ? "#007bff" : "#eee",
                                                paddingHorizontal: 16,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                marginRight: 8,
                                            }}
                                            onPress={() => setDifficulty(lvl)}
                                        >
                                            <Text style={{ fontSize: 12, color: difficulty === lvl ? "#fff" : "#333" }}>
                                                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 12,
                                    fontSize: 14,
                                    backgroundColor: "#f9f9f9",
                                    minHeight: 60,
                                    textAlignVertical: "top",
                                }}
                                placeholder="Safety tips"
                                value={safety_tips}
                                onChangeText={setSafety_tips}
                                multiline
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <TouchableOpacity
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#ddd",
                                    borderRadius: 8,
                                    height: 220,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginBottom: 12,
                                    overflow: "hidden",
                                }}
                                onPress={pickImage}
                            >
                                {!image ? (
                                    <Text style={{ textAlign: "center", color: "#888", padding: 16 }}>
                                        Click here to upload an image, you can add more in edit place after adding the place
                                    </Text>
                                ) : (
                                    <Image
                                        source={{ uri: image.uri }}
                                        style={{ width: "100%", height: "100%" }}
                                    />
                                )}
                            </TouchableOpacity>

                            <View style={{ height: 200, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                                <MapPicker setPosition={setPosition} />
                            </View>
                            {!position ? (
                                <Text style={{ textAlign: "center", color: "#999", marginTop: 4 }}>
                                    Pick location
                                </Text>
                            ) : (
                                <Text style={{ textAlign: "center", color: "green", marginTop: 4 }}>
                                    Location selected ✓
                                </Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: "#007bff",
                                borderRadius: 30,
                                paddingVertical: 14,
                                alignItems: "center",
                            }}
                            onPress={handleAddPlace}
                            disabled={placeIsBeingAdded}
                        >
                            {placeIsBeingAdded ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Add Place</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

export default AddPlace;