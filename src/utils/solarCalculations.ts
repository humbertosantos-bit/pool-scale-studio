/**
 * Solar calculation utilities for sun position and heatmap generation
 */

export interface SunPosition {
  azimuth: number;    // degrees from north (0-360)
  altitude: number;   // degrees above horizon (0-90)
}

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Calculate sun position for given location, date, and time
 */
export function calculateSunPosition(
  location: Location,
  date: Date,
  hour: number // 0-23
): SunPosition {
  const { latitude, longitude } = location;
  
  // Convert to radians
  const lat = (latitude * Math.PI) / 180;
  
  // Calculate day of year
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Solar declination (simplified)
  const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81)) * (Math.PI / 180));
  const declinationRad = (declination * Math.PI) / 180;
  
  // Hour angle
  const solarNoon = 12 - (longitude / 15);
  const hourAngle = 15 * (hour - solarNoon);
  const hourAngleRad = (hourAngle * Math.PI) / 180;
  
  // Calculate altitude
  const sinAlt = 
    Math.sin(lat) * Math.sin(declinationRad) +
    Math.cos(lat) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitude = Math.asin(sinAlt) * (180 / Math.PI);
  
  // Calculate azimuth
  const cosAzimuth = 
    (Math.sin(declinationRad) - Math.sin(lat) * sinAlt) /
    (Math.cos(lat) * Math.cos(Math.asin(sinAlt)));
  
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * (180 / Math.PI);
  
  // Adjust azimuth for afternoon (when hour angle > 0)
  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }
  
  return {
    azimuth: azimuth,
    altitude: Math.max(0, altitude)
  };
}

/**
 * Get sunlight intensity at a point based on sun position and obstructions
 */
export function getSunlightIntensity(
  sunPosition: SunPosition,
  pointAngle: number, // angle from north to the point
  northRotation: number = 0 // rotation of north arrow in degrees
): number {
  const { azimuth, altitude } = sunPosition;
  
  // No sunlight if sun is below horizon
  if (altitude <= 0) return 0;
  
  // Adjust azimuth for north rotation
  const adjustedAzimuth = (azimuth - northRotation + 360) % 360;
  
  // Calculate angle difference between sun and point
  let angleDiff = Math.abs(adjustedAzimuth - pointAngle);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  
  // Calculate intensity based on:
  // 1. Sun altitude (higher = more intense)
  // 2. Angle to sun (facing sun = more intense)
  const altitudeFactor = Math.sin((altitude * Math.PI) / 180);
  const angleFactor = Math.cos((angleDiff * Math.PI) / 180);
  
  // Combine factors (0-1 range)
  return Math.max(0, altitudeFactor * (0.5 + 0.5 * angleFactor));
}

/**
 * Get color for heatmap based on intensity
 */
export function getHeatmapColor(intensity: number): string {
  // intensity: 0 (no sun) to 1 (full sun)
  
  if (intensity < 0.2) {
    // Very low sun - blue/gray
    const gray = Math.floor(100 + intensity * 5 * 50);
    return `rgba(${gray}, ${gray}, ${gray + 20}, 0.4)`;
  } else if (intensity < 0.5) {
    // Medium sun - light yellow
    const factor = (intensity - 0.2) / 0.3;
    const r = Math.floor(255);
    const g = Math.floor(200 + factor * 55);
    const b = Math.floor(100 * (1 - factor));
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  } else {
    // High sun - orange/yellow
    const factor = (intensity - 0.5) / 0.5;
    const r = Math.floor(255);
    const g = Math.floor(200 - factor * 50);
    const b = 0;
    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  }
}

/**
 * Canadian provinces with approximate center coordinates
 */
export const CANADIAN_PROVINCES = {
  'Alberta': { latitude: 53.9333, longitude: -116.5765 },
  'British Columbia': { latitude: 53.7267, longitude: -127.6476 },
  'Manitoba': { latitude: 53.7609, longitude: -98.8139 },
  'New Brunswick': { latitude: 46.5653, longitude: -66.4619 },
  'Newfoundland and Labrador': { latitude: 53.1355, longitude: -57.6604 },
  'Northwest Territories': { latitude: 64.8255, longitude: -124.8457 },
  'Nova Scotia': { latitude: 44.6820, longitude: -63.7443 },
  'Nunavut': { latitude: 70.2998, longitude: -83.1076 },
  'Ontario': { latitude: 51.2538, longitude: -85.3232 },
  'Prince Edward Island': { latitude: 46.5107, longitude: -63.4168 },
  'Quebec': { latitude: 52.9399, longitude: -73.5491 },
  'Saskatchewan': { latitude: 52.9399, longitude: -106.4509 },
  'Yukon': { latitude: 64.2823, longitude: -135.0000 },
};

export type Province = keyof typeof CANADIAN_PROVINCES;
