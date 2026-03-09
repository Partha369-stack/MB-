
export interface GeoLocation {
    latitude: number;
    longitude: number;
}

export interface ReversedAddress {
    village?: string;
    area?: string;
    postalCode?: string;
    fullAddress?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const locationService = {
    getCurrentLocation: (): Promise<GeoLocation> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            const options = { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    // Log the raw error for developer debugging
                    console.warn('Geolocation error:', error);

                    let errorMessage = 'Could not get your location.';

                    switch (error.code) {
                        case 1: // PERMISSION_DENIED
                            errorMessage = 'Location permission denied. Please allow location access in your browser settings and ensured it is enabled in Windows Privacy settings.';
                            break;
                        case 2: // POSITION_UNAVAILABLE
                            errorMessage = 'Location unavailable. This often happens if your device does not have a GPS or if Windows Location Services are disabled.';
                            break;
                        case 3: // TIMEOUT
                            errorMessage = 'Location request timed out. Please try again or enter your address manually.';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                options
            );
        });
    },

    reverseGeocode: async (lat: number, lng: number): Promise<ReversedAddress> => {
        try {
            // Using Nominatim (OpenStreetMap) as a free alternative to Google Maps API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch from reverse geocoding service');
            }

            const data = await response.json();
            const address = data.address;

            // Map Nominatim fields to our ReversedAddress interface - More robust check
            const village = address.village || address.town || address.suburb || address.city_district || address.city || address.county || '';
            const area = address.residential || address.neighbourhood || address.road || address.hamlet || address.isolated_dwelling || '';
            const postalCode = address.postcode || '';

            return {
                village,
                area,
                postalCode,
                fullAddress: data.display_name
            };
        } catch (error) {
            console.error('Error in reverseGeocode:', error);
            // Fallback to manual entry if geocoding fails
            return {
                village: '',
                area: '',
                postalCode: '',
                fullAddress: ''
            };
        }
    },

    getEmbedUrl: (latOrAddress: number | string, lng?: number, mode: 'roadmap' | 'hybrid' = 'roadmap'): string => {
        // Standard Google Maps embed URL that works without an API key
        const mapType = mode === 'hybrid' ? 'k' : 'm';
        const query = typeof latOrAddress === 'number' ? `${latOrAddress},${lng}` : encodeURIComponent(latOrAddress);
        return `https://maps.google.com/maps?q=${query}&t=${mapType}&z=17&output=embed`;
    },

    getGoogleMapsUrl: (lat: number, lng: number): string => {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    },

    searchAddress: async (query: string): Promise<any[]> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&priority=1`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error("Search failed", e);
            return [];
        }
    }
};
