import { useEffect, useState } from "react";
import MapView, {
  Marker,
  MapPressEvent,
  MarkerDragStartEndEvent,
  Region,
} from "react-native-maps";
import { StyleSheet, View, Text } from "react-native";

type Position = {
  lat: number;
  lng: number;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Props = {
  setPosition: (position: Position) => void;
  initialPosition?: Position | null;
};

export default function MapPicker({
  setPosition,
  initialPosition = null,
}: Props) {
  const [selected, setSelected] = useState<Coordinate | null>(
    initialPosition
      ? {
          latitude: Number(initialPosition.lat),
          longitude: Number(initialPosition.lng),
        }
      : null
  );

  const center: Region = {
    latitude: selected?.latitude || 33.8547,
    longitude: selected?.longitude || 35.8623,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    if (initialPosition) {
      const pos: Coordinate = {
        latitude: Number(initialPosition.lat),
        longitude: Number(initialPosition.lng),
      };

      setSelected(pos);

      setPosition({
        lat: pos.latitude,
        lng: pos.longitude,
      });
    }
  }, [initialPosition, setPosition]);

  const handleMapPress = (e: MapPressEvent) => {
    const pos = e.nativeEvent.coordinate;

    setSelected(pos);

    setPosition({
      lat: pos.latitude,
      lng: pos.longitude,
    });
  };

  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    const pos = e.nativeEvent.coordinate;

    setSelected(pos);

    setPosition({
      lat: pos.latitude,
      lng: pos.longitude,
    });
  };

  return (
    <View>
      <MapView
        style={styles.map}
        initialRegion={center}
        onPress={handleMapPress}
      >
        {selected && (
          <Marker
            coordinate={selected}
            draggable
            onDragEnd={handleMarkerDragEnd}
          />
        )}
      </MapView>

      {!selected && (
        <Text style={styles.helperText}>
          Tap on the map to choose a location
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  helperText: {
    marginTop: 8,
    textAlign: "center",
    color: "#666",
  },
});