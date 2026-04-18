const axios = require('axios');

// OpenStreetMap Nominatim API doesn't require an API key for basic usage
const SEARCH_RADIUS_KM = parseInt(process.env.OSM_SEARCH_RADIUS_KM) || 15;
const RADIUS_METERS = SEARCH_RADIUS_KM * 1000;

/**
 * Geocode an address to get latitude and longitude using OpenStreetMap
 * @param {String} address - Full address (e.g., "123 Main St, New York, NY")
 * @returns {Object} {latitude, longitude} or null if failed
 */
const geocodeAddress = async (address) => {
  try {
    if (!address || address.trim() === '') {
      return null;
    }

    // Use OpenStreetMap Nominatim API for geocoding
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'SkillConnect-App/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const location = response.data[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        formattedAddress: location.display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

/**
 * Calculate distance between two coordinates in km using Haversine formula
 * @param {Number} lat1, lon1 - First coordinate
 * @param {Number} lat2, lon2 - Second coordinate
 * @returns {Number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find workers within a certain radius of a job location
 * @param {Object} jobLocation - {latitude, longitude}
 * @param {Array} workers - Array of worker objects with location
 * @param {Number} radiusKm - Search radius (default: SEARCH_RADIUS_KM)
 * @returns {Array} Workers within radius with distance calculated
 */
const findNearbyWorkers = (jobLocation, workers, radiusKm = SEARCH_RADIUS_KM) => {
  if (!jobLocation || !jobLocation.latitude || !jobLocation.longitude) {
    return [];
  }

  return workers
    .map(worker => {
      if (worker.location && worker.location.coordinates) {
        const distance = calculateDistance(
          jobLocation.latitude,
          jobLocation.longitude,
          worker.location.coordinates.latitude,
          worker.location.coordinates.longitude
        );

        return {
          ...worker,
          distance: parseFloat(distance.toFixed(2))
        };
      }
      return null;
    })
    .filter(worker => worker && worker.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Get estimated travel time between two locations using OpenStreetMap (OSRM)
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {Object} {durationSeconds, durationText, distanceMeters, distanceText}
 */
const getTravelTime = async (origin, destination) => {
  try {
    // Use OSRM (Open Source Routing Machine) which uses OpenStreetMap data
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
      {
        params: {
          overview: 'false',
          alternatives: 'false',
          steps: 'false'
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        durationSeconds: Math.round(route.duration),
        durationText: `${Math.round(route.duration / 60)} mins`,
        distanceMeters: Math.round(route.distance),
        distanceText: `${(route.distance / 1000).toFixed(2)} km`
      };
    }
    return null;
  } catch (error) {
    console.error('OSRM Routing error:', error.message);
    return null;
  }
};

/**
 * Validate coordinates
 * @param {Number} latitude
 * @param {Number} longitude
 * @returns {Boolean}
 */
const isValidCoordinates = (latitude, longitude) => {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Format address from location components
 * @param {Object} location - {address, city, district, state, pincode}
 * @returns {String} Formatted full address
 */
const formatAddress = (location) => {
  if (!location) return '';
  const parts = [
    location.address,
    location.city,
    location.district,
    location.state,
    location.pincode
  ];
  return parts.filter(Boolean).join(', ');
};

/**
 * Reverse geocode coordinates to get address details using OpenStreetMap
 * @param {Number} latitude
 * @param {Number} longitude
 * @returns {Object} Address details or null if failed
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'SkillConnect-App/1.0'
      }
    });

    if (response.data && response.data.display_name) {
      return {
        formattedAddress: response.data.display_name,
        addressComponents: response.data.address,
        placeId: response.data.place_id
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
};

module.exports = {
  geocodeAddress,
  calculateDistance,
  findNearbyWorkers,
  getTravelTime,
  reverseGeocode,
  isValidCoordinates,
  formatAddress
};
