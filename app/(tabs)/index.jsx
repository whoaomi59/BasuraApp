import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

// Nombre de la tarea en background
const LOCATION_TASK_NAME = "background-location-task";

// Centro del sector: Pitalito Huila
const sectorCenter = { latitude: 1.8537, longitude: -76.0515 };
const movementRadius = 0.01; // ~1km

// Formula para calcular distancia (en metros)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Generar posición random del camión
const getRandomTruckLocation = () => {
  const latOffset = (Math.random() * 2 - 1) * movementRadius;
  const lngOffset = (Math.random() * 2 - 1) * movementRadius;
  return {
    latitude: sectorCenter.latitude + latOffset,
    longitude: sectorCenter.longitude + lngOffset,
  };
};

// Definir la tarea en background
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  if (data) {
    const { locations } = data;
    const user = locations[0].coords;

    // Generamos nueva ubicación del camión simulada
    const truck = getRandomTruckLocation();

    // Calcular distancia
    const dist = getDistance(
      user.latitude,
      user.longitude,
      truck.latitude,
      truck.longitude
    );

    if (dist < 500) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚛 El camión está cerca",
          body: "El camión pasó a menos de 500m de tu ubicación.",
        },
        trigger: null,
      });
    }
  }
});

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [truckLocation, setTruckLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configurar permisos
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permiso de ubicación denegado");
        return;
      }
      await Location.requestBackgroundPermissionsAsync();
      await Notifications.requestPermissionsAsync();

      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Rastreo en segundo plano",
          notificationBody: "La app está rastreando tu ubicación",
        },
      });

      setInterval(() => {
        setTruckLocation(getRandomTruckLocation());
      }, 5000);

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🚛 Rastreo Camión Pitalito</Text>
      </View>

      {/* Estado */}
      <View style={styles.statusCard}>
        <MaterialIcons name="local-shipping" size={28} color="#2e7d32" />
        <Text style={styles.statusText}>Camión en ruta de recolección</Text>
      </View>

      {/* Mapa */}
      {userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={userLocation}
            title="Tu ubicación"
            pinColor="#e0223bff"
          />
          {truckLocation && (
            <Marker coordinate={truckLocation} title="Camión">
              <Image
                source={require("../../assets/logo.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </Marker>
          )}
        </MapView>
      )}

      {/* Nota inferior */}
      <View style={styles.infoCard}>
        <MaterialIcons name="info" size={22} color="#555" />
        <Text style={styles.infoText}>
          Recibirás una notificación cuando el camión esté a menos de 500m de tu
          ubicación.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  // Encabezado
  header: {
    backgroundColor: "#2e7d32",
    paddingVertical: 16,
    alignItems: "center",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  headerText: { fontSize: 20, fontWeight: "bold", color: "#fff" },

  // Estado
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    margin: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: { marginLeft: 8, fontSize: 16, color: "#2e7d32" },

  // Mapa
  map: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
  },

  // Info inferior
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
    flex: 1,
    flexWrap: "wrap",
  },

  // Loading
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#555" },
});
