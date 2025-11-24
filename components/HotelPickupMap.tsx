'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Maximize2 } from 'lucide-react';

interface HotelPickupLocation {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface HotelPickupMapProps {
  onLocationSelect: (location: HotelPickupLocation | null) => void;
  initialLocation?: HotelPickupLocation;
  tourLocation?: string; // For centering the map near the tour area
}

declare global {
  interface Window {
    google: any;
    googleMapsScriptLoaded?: boolean;
  }
}

export default function HotelPickupMap({ onLocationSelect, initialLocation, tourLocation = 'Cairo, Egypt' }: HotelPickupMapProps) {
  const [knowsLocation, setKnowsLocation] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<HotelPickupLocation | null>(initialLocation || null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const isInitializing = useRef(false);

  const GOOGLE_MAPS_API_KEY = '***REMOVED***';

  // Load Google Maps script
  useEffect(() => {
    if (knowsLocation !== true) return;

    // Check if script already loaded
    if (window.google && window.google.maps) {
      setScriptLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (window.googleMapsScriptLoaded) {
      return;
    }

    window.googleMapsScriptLoaded = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      window.googleMapsScriptLoaded = false;
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount to avoid the error
      // The script can be reused across different component instances
    };
  }, [knowsLocation]);

  // Initialize map when script is loaded
  const initializeMap = () => {
    if (!window.google || !mapRef.current || isInitializing.current) return;

    isInitializing.current = true;

    try {
      // Default center (Cairo, Egypt)
      const defaultCenter = { lat: 30.0444, lng: 31.2357 };
      
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : defaultCenter,
        zoom: initialLocation ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Add click listener to map
      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Reverse geocode to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const location: HotelPickupLocation = {
              address: results[0].formatted_address,
              lat,
              lng,
              placeId: results[0].place_id
            };
            
            setSelectedLocation(location);
            setSearchQuery(location.address);
            onLocationSelect(location);
            placeMarker(lat, lng, location.address);
          }
        });
      });

      // Initialize autocomplete
      if (searchInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          types: ['lodging', 'establishment', 'geocode'],
          componentRestrictions: { country: 'eg' } // Restrict to Egypt
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.geometry && place.geometry.location) {
            const location: HotelPickupLocation = {
              address: place.formatted_address || place.name || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: place.place_id
            };

            setSelectedLocation(location);
            setSearchQuery(location.address);
            onLocationSelect(location);
            
            map.setCenter(place.geometry.location);
            map.setZoom(16);
            placeMarker(location.lat, location.lng, location.address);
          }
        });

        autocompleteRef.current = autocomplete;
      }

      // Place initial marker if location exists
      if (initialLocation) {
        placeMarker(initialLocation.lat, initialLocation.lng, initialLocation.address);
      }

      setIsMapLoaded(true);
      isInitializing.current = false;
    } catch (error) {
      console.error('Error initializing map:', error);
      isInitializing.current = false;
    }
  };

  const placeMarker = (lat: number, lng: number, title: string) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Create new marker
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title,
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#DC2626',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }
    });

    markerRef.current = marker;
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    onLocationSelect(null);
    
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  };

  const handleSkip = () => {
    setKnowsLocation(false);
    onLocationSelect(null);
  };

  // Initialize map when script loads and user selects "Yes"
  useEffect(() => {
    if (scriptLoaded && knowsLocation === true && !mapInstanceRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, knowsLocation]);

  return (
    <div className="space-y-4">
      {/* Question Section */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="text-red-600" size={24} />
          Do you know where you want to be picked up?
        </h3>
        
        <div className="space-y-3">
          {/* Option 1: Yes, I can add it now */}
          <button
            type="button"
            onClick={() => setKnowsLocation(true)}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
              knowsLocation === true
                ? 'border-red-500 bg-red-50'
                : 'border-slate-200 hover:border-red-300 hover:bg-red-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                knowsLocation === true 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-slate-300'
              }`}>
                {knowsLocation === true && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">Yes, I can add it now</div>
                <div className="text-sm text-slate-600">Search for your hotel or click on the map</div>
              </div>
            </div>
          </button>

          {/* Option 2: I don't know yet */}
          <button
            type="button"
            onClick={handleSkip}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
              knowsLocation === false
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                knowsLocation === false 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-slate-300'
              }`}>
                {knowsLocation === false && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">I don't know yet</div>
                <div className="text-sm text-slate-600">We'll contact you 24 hours before your tour</div>
              </div>
            </div>
          </button>
        </div>

        {/* Skip confirmation message */}
        {knowsLocation === false && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ✓ No problem! Our team will reach out via WhatsApp or email 24 hours before your tour to confirm your pickup location.
            </p>
          </div>
        )}
      </div>

      {/* Map Interface (shown when user selects "Yes") */}
      {knowsLocation === true && (
        <>
          <div className={`bg-white border-2 border-slate-200 rounded-2xl overflow-hidden transition-all ${
            isFullscreen ? 'fixed inset-4 z-50' : ''
          }`}>
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for hotel, address, etc."
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-3 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 size={18} />
                </button>
              </div>

              {/* Helper text */}
              <p className="text-sm text-slate-600 mt-2">
                💡 <strong>Tip:</strong> Search for your hotel name or click directly on the map to select your pickup location
              </p>
            </div>

            {/* Map Container */}
            <div className={`relative bg-slate-100 ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[450px]'}`}>
              <div 
                ref={mapRef}
                className="w-full h-full"
              />
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 pointer-events-none">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading map...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-900">Pickup Location Selected</p>
                    <p className="text-sm text-green-700 mt-1 break-words">{selectedLocation.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="text-green-700 hover:text-green-900 flex-shrink-0"
                    title="Clear selection"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

