import React, { useState, useEffect } from 'react';
import { MapPin, Search, Navigation, AlertCircle, CheckCircle2, XCircle, Home, Map as MapIcon, Layers } from 'lucide-react';
import { UserAddress } from '../types';
import { locationService } from '../services/locationService';

interface AddressFormProps {
    userId: string;
    initialAddress?: Partial<UserAddress>;
    onSave: (address: UserAddress) => void;
    hidePersonalFields?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({ userId, initialAddress, onSave, hidePersonalFields = false }) => {
    const [formData, setFormData] = useState<Partial<UserAddress>>({
        fullName: '',
        phone: '',
        village: '',
        areaOrPara: '',
        houseNo: '',
        landmark: '',
        postalCode: '',
        ...initialAddress
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');

    // Update local state if initialAddress changes
    useEffect(() => {
        if (initialAddress) {
            setFormData(prev => ({ ...prev, ...initialAddress }));
        }
    }, [initialAddress]);


    const handleUseLocation = async () => {
        setIsLocating(true);
        setError(null);
        try {
            const position = await locationService.getCurrentLocation();
            setFormData(prev => ({
                ...prev,
                latitude: position.latitude,
                longitude: position.longitude
            }));

            // Reverse geocode
            const addressDetails = await locationService.reverseGeocode(position.latitude, position.longitude);
            if (addressDetails) {
                setFormData(prev => ({
                    ...prev,
                    village: addressDetails.village || prev.village,
                    areaOrPara: addressDetails.area || prev.areaOrPara,
                    postalCode: addressDetails.postalCode || prev.postalCode,
                    latitude: position.latitude,
                    longitude: position.longitude
                }));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to get location');
        } finally {
            setIsLocating(false);
        }
    };

    const handleAddressSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 2) {
            try {
                const results = await locationService.searchAddress(query);
                setAddressSuggestions(results);
            } catch (e) {
                console.error("Search failed", e);
            }
        } else {
            setAddressSuggestions([]);
        }
    };

    const selectPlace = (place: any) => {
        setFormData(prev => ({
            ...prev,
            village: place.address?.village || place.address?.city || '',
            areaOrPara: place.address?.suburb || place.address?.neighborhood || '',
            postalCode: place.address?.postcode || '',
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon)
        }));
        setSearchQuery('');
        setAddressSuggestions([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!hidePersonalFields) {
            if (!formData.fullName?.trim()) {
                setError('Full Name is required');
                return;
            }
            if (!formData.phone?.trim() || !/^\d{10}$/.test(formData.phone)) {
                setError('Valid 10-digit Phone Number is required');
                return;
            }
        }

        if (!formData.village?.trim()) {
            setError('Village / City is required');
            return;
        }
        if (!formData.areaOrPara?.trim()) {
            setError('Area / Para is required');
            return;
        }
        if (!formData.landmark?.trim()) {
            setError('Landmark is required');
            return;
        }

        onSave(formData as UserAddress);
    };

    const mapUrl = locationService.getEmbedUrl(
        formData.latitude && formData.longitude
            ? `${formData.latitude},${formData.longitude}`
            : (formData.village || 'Kolkata'),
        undefined,
        mapMode
    );


    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 animate-shake">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-bold">{error}</span>
                </div>
            )}

            {/* Personal Details - Conditionally Rendered */}
            {!hidePersonalFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">Full Name</label>
                        <input
                            type="text"
                            value={formData.fullName || ''}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                            placeholder="e.g. Rahul Sharma"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData({ ...formData, phone: val });
                            }}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                            placeholder="10-digit number"
                        />
                    </div>
                </div>
            )}

            {/* Map Section */}
            <div className="relative rounded-3xl overflow-hidden border-4 border-slate-100 bg-slate-200 h-64 md:h-80 shadow-inner group">
                <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={mapUrl}
                    className={`transition-opacity duration-500 ${isLocating ? 'opacity-50' : 'opacity-100'}`}
                />

                {/* Map Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => setMapMode(m => m === 'roadmap' ? 'satellite' : 'roadmap')}
                        className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:text-green-600 active:scale-95 transition-all"
                        title="Toggle Map View"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleUseLocation}
                        className="w-10 h-10 bg-black text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-green-600 active:scale-95 transition-all"
                        title="Use My Location"
                    >
                        {isLocating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                    </button>
                </div>

                {/* Address Search Overlay */}
                <div className="absolute top-4 left-4 right-16">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleAddressSearch(e.target.value)}
                            placeholder="Search area or landmark..."
                            className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg text-sm font-bold text-slate-700 outline-none border border-white/50 focus:ring-2 focus:ring-green-500/50"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                        {addressSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                                {addressSuggestions.map((place, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => selectPlace(place)}
                                        className="w-full text-left px-4 py-3 hover:bg-green-50 border-b last:border-0 border-slate-50 transition-colors"
                                    >
                                        <p className="text-xs font-bold text-slate-700 truncate">{place.display_name}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">Village / City</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.village || ''}
                            onChange={e => setFormData({ ...formData, village: e.target.value })}
                            className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                            placeholder="Auto-filled from map"
                        />
                        <MapIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">Area / Para</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.areaOrPara || ''}
                            onChange={e => setFormData({ ...formData, areaOrPara: e.target.value })}
                            className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                            placeholder="Locality"
                        />
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
                <div className="col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">House No.</label>
                    <input
                        type="text"
                        value={formData.houseNo || ''}
                        onChange={e => setFormData({ ...formData, houseNo: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                        placeholder="#"
                    />
                </div>
                <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3">Landmark (Required)</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.landmark || ''}
                            onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                            className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                            placeholder="Near..."
                        />
                        <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
                <CheckCircle2 className="w-5 h-5" />
                Save Address
            </button>
            <div className="pt-8 flex justify-center">
                <button
                    type="button"
                    onClick={async () => {
                        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                            try {
                                const { authService } = await import('../services/authService');
                                const success = await authService.deleteUser(userId);
                                if (success) {
                                    window.location.href = '/';
                                } else {
                                    alert("Failed to delete account. Please try again.");
                                }
                            } catch (e) {
                                console.error("Error deleting account", e);
                                alert("Failed to delete account.");
                            }
                        }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 transition-colors flex items-center gap-2"
                >
                    <XCircle className="w-3 h-3" /> Delete Account
                </button>
            </div>

        </form>
    );
};
