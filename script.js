const apiKey = '5b3ce3597851110001cf62481912bd9edc9d45f39c48928910e7ce67';  // OpenRouteService API Key

// Fuel Station Data (Hardcoded for now)
const stations = [
    {lat: 43.7449999, lon: -79.6912853, name: "BVD Brampton, 130 Delta Park, Brampton, ON"},
    {lat: 43.6590715, lon: -79.6561726, name: "BVD Mississauga, 6125 Ordan Dr, Mississauga, ON"}
];

// Initialize Map
var map = L.map('map').setView([43.651070, -79.347015], 10); // Toronto as default location

// OpenStreetMap Tile Layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Watch for user location and update live position
var liveMarker;
var isMapMoving = false;
var locationUpdateTimeout;

// Handle map movements to disable auto-centering
map.on('moveend', function() {
    isMapMoving = true;
    clearTimeout(locationUpdateTimeout);
    locationUpdateTimeout = setTimeout(function() {
        isMapMoving = false; // Reset flag after delay
    }, 3000);
});

// Function to get live location
function getLiveLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            // Auto-center if map hasn't been moved manually
            if (!isMapMoving) {
                map.setView([lat, lon], 14); // Zoom into live location
            }

            // Update or set live location pin
            if (!liveMarker) {
                liveMarker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        className: 'leaflet-live-location-icon',
                        html: ''
                    })
                }).addTo(map);
            } else {
                liveMarker.setLatLng([lat, lon]);
            }

            liveMarker.bindPopup("You're here!");

            // Calculate and show distances from live location to all fuel stations
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

                // Fetch driving distance if not cached
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

// Event listener for location button
document.getElementById('locationBtn').onclick = function() {
    getLiveLocation();
};

// Calculate straight-line distance (Haversine Formula)
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

// Fetch driving distance from OpenRouteService API and cache it
function calculateDrivingDistance(lat1, lon1, lat2, lon2, marker) {
    var url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const drivingDistance = data.features[0].properties.segments[0].distance / 1000;
            localStorage.setItem(marker.getPopup().getContent(), drivingDistance); // Cache the distance

            // Update the popup with cached distance
            marker.setPopupContent(`
                <b>${marker.getPopup().getContent()}</b><br>Driving Distance: ${drivingDistance.toFixed(2)} km
            `);
        })
        .catch(err => console.log('API error: ' + err));
}

// Copy address to clipboard
function copyAddress(address) {
    var textArea = document.createElement("textarea");
    textArea.value = address;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert("Address copied to clipboard!");
}

// Open location in Google Maps
function openGoogleMaps(address) {
    var mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
}

// Initialize and fetch live location on window load
window.onload = function() {
    getLiveLocation();
};
