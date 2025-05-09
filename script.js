const apiKey = '5b3ce3597851110001cf62481912bd9edc9d45f39c48928910e7ce67';  // OpenRouteService API Key

// Sample fuel station data (You can add more stations here)
const stations = [
    { lat: 43.7449999, lon: -79.6912853, name: "BVD Brampton, 130 Delta Park, Brampton, ON" },
    { lat: 43.6590715, lon: -79.6561726, name: "BVD Mississauga, 6125 Ordan Dr, Mississauga, ON" }
];

// Initialize Leaflet map
var map = L.map('map').setView([43.651070, -79.347015], 10);  // Default location is Toronto

// Tile Layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Variable to track the live location marker
var liveMarker;
var isMapMoving = false;
var locationUpdateTimeout;

// Event listener for map movement
map.on('moveend', function() {
    isMapMoving = true;
    clearTimeout(locationUpdateTimeout);
    locationUpdateTimeout = setTimeout(function() {
        isMapMoving = false; // Reset flag after delay
    }, 3000); // 3-second delay before re-enabling auto-centering
});

// Function to get live location
function getLiveLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            // Only auto-center the map if it's not being moved manually
            if (!isMapMoving) {
                map.setView([lat, lon], 14); // Zoom into the live location
            }

            // Update or set the live location pin
            if (!liveMarker) {
                liveMarker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        className: 'leaflet-live-location-icon',
                        html: '📍'  // Custom icon for live location
                    })
                }).addTo(map);
            } else {
                liveMarker.setLatLng([lat, lon]);
            }

            liveMarker.bindPopup("You're here!");

            // Calculate and show distances from current location to all fuel stations
            stations.forEach(function(station) {
                var straightLineDistance = calculateDistance(lat, lon, station.lat, station.lon);
                var marker = L.marker([station.lat, station.lon], {
                    icon: L.divIcon({
                        className: 'leaflet-fuel-station-icon'
                    })
                }).addTo(map)
                    .bindPopup(`
                        <b>${station.name}</b><br>Distance: ${straightLineDistance.toFixed(2)} km
                        <div class="popup-options">
                            <button class="popup-button" onclick="copyAddress('${station.name}')">Copy Address</button>
                            <button class="popup-button" onclick="openGoogleMaps('${station.name}')">Open in Google Maps</button>
                        </div>
                    `);

                // Check if driving distance is cached, else fetch from API
                var cachedDistance = localStorage.getItem(station.name);
                if (cachedDistance) {
                    marker.setPopupContent(`
                        <b>${station.name}</b><br>Driving Distance: ${cachedDistance} km
                        <div class="popup-options">
                            <button class="popup-button" onclick="copyAddress('${station.name}')">Copy Address</button>
                            <button class="popup-button" onclick="openGoogleMaps('${station.name}')">Open in Google Maps</button>
                        </div>
                    `);
                } else {
                    calculateDrivingDistance(lat, lon, station.lat, station.lon, marker);
                }
            });
        });
    }
}

// Event listener for the "Show My Location" button
document.getElementById('locationBtn').onclick = function() {
    getLiveLocation();
};

// Function to calculate straight-line distance (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

// Function to fetch driving distance from OpenRouteService API and cache it
function calculateDrivingDistance(lat1, lon1, lat2, lon2, marker) {
    var url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const drivingDistance = data.features[0].properties.segments[0].distance / 1000;
            localStorage.setItem(marker.getPopup().getContent(), drivingDistance); // Cache the driving distance

            // Update the popup with cached distance
            marker.setPopupContent(`
                <b>${marker.getPopup().getContent()}</b><br>Driving Distance: ${drivingDistance.toFixed(2)} km
            `);
        })
        .catch(err => console.log('API error: ' + err));
}

// Function to copy address to clipboard
function copyAddress(address) {
    var textArea = document.createElement("textarea");
    textArea.value = address;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert("Address copied to clipboard!");
}

// Function to open Google Maps with address
function openGoogleMaps(address) {
    var mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
}

// Initialize and fetch live location on window load
window.onload = function() {
    getLiveLocation();
};
