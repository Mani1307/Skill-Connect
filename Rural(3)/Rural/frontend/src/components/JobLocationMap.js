import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const JobLocationMap = ({ job, height = '200px' }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!job?.location?.coordinates?.latitude || !job?.location?.coordinates?.longitude) {
      return;
    }

    // Clean up previous map instance
    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    // Create map
    const map = L.map(mapRef.current).setView([
      job.location.coordinates.latitude, 
      job.location.coordinates.longitude
    ], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add marker
    const marker = L.marker([
      job.location.coordinates.latitude, 
      job.location.coordinates.longitude
    ]).addTo(map);

    marker.bindPopup(job.location.address || 'Job Location').openPopup();

    // Store map instance
    mapInstance.current = map;

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [job]);

  if (!job?.location?.coordinates?.latitude || !job?.location?.coordinates?.longitude) {
    return <div>No location data available</div>;
  }

  return <div ref={mapRef} style={{ height, width: '100%' }} />;
};

export default JobLocationMap;