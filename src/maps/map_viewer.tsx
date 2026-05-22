import MapView, { Marker } from "react-native-maps";
import { Linking, StyleSheet, View, Text } from "react-native";

export default function MapViewer({ place }:{
  place: any;
}) {
  if (!place?.latitude || !place?.longitude) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No location available</Text>
      </View>
    );
  }

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  const position = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const openInGoogleMaps = async () => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    await Linking.openURL(url);
  };

  return (
    <MapView
      style={styles.map}
      initialRegion={position}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      onPress={openInGoogleMaps}
    >
      <Marker coordinate={{ latitude, longitude }} onPress={openInGoogleMaps} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  emptyContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
});