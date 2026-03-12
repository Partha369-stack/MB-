import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserAddress } from '../types';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { useAppContext } from '../contexts/AppContext';

interface ProfileMobileProps {
    user: User;
    setUser: (u: User) => void;
    onLogout: () => void;
}

function Spinner() {
    return (
        <svg
            className="w-4 h-4 animate-spin text-[#2bee2b]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    );
}

const ProfileMobile: React.FC<ProfileMobileProps> = ({ user, setUser, onLogout }) => {
    const { setView, allAuthorities } = useAppContext();
    const navigate = useNavigate();

    type EditField = 'pic' | 'phone' | 'address' | null;
    const [editField, setEditField] = useState<EditField>(null);

    const [editPhone, setEditPhone] = useState(user.phone ?? '');
    const [editSecondaryPhone, setEditSecondaryPhone] = useState(user.secondaryPhone ?? '');
    const [isEditingSecondary, setIsEditingSecondary] = useState(!!user.secondaryPhone);
    const [editAddress, setEditAddress] = useState(user.address ?? '');
    const [editHouseNo, setEditHouseNo] = useState('');
    const [editArea, setEditArea] = useState('');
    const [editVillage, setEditVillage] = useState('');
    const [editPincode, setEditPincode] = useState('');
    const [editLat, setEditLat] = useState<number | undefined>(undefined);
    const [editLng, setEditLng] = useState<number | undefined>(undefined);

    // Manage Addresses specific state
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

    const [savingPhone, setSavingPhone] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [picPreview, setPicPreview] = useState<string | null>(null);

    const picInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);


    const openEdit = (field: EditField) => {
        if (field === 'phone') {
            setEditPhone(user.phone ?? '');
            setEditSecondaryPhone(user.secondaryPhone ?? '');
            setIsEditingSecondary(!!user.secondaryPhone);
        }
        if (field === 'address') setEditAddress(user.address ?? '');
        setEditField(field);
    };

    const savePhone = async () => {
        if (!editPhone.trim()) return;
        setSavingPhone(true);
        try {
            const updated = { ...user, phone: editPhone.trim(), secondaryPhone: editSecondaryPhone.trim() || null };
            await storageService.saveUserProfile(updated);
            storageService.setUser(updated);
            setUser(updated);
            setEditField(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSavingPhone(false);
        }
    };

    const saveAddress = async () => {
        if (!editVillage.trim() && !editArea.trim() && !editAddress.trim()) return;
        setSavingAddress(true);
        try {
            const generatedStr = [editHouseNo, editArea, editVillage, editPincode].filter(Boolean).join(', ');
            const finalStr = generatedStr || editAddress.trim();

            const savedAddr = await storageService.saveUserAddress({
                id: editingAddressId || undefined,
                userId: user.id,
                isDefault: !user.addresses?.length || (editingAddressId ? user.addresses?.find(a => a.id === editingAddressId)?.isDefault : true),
                houseNo: editHouseNo.trim(),
                areaOrPara: editArea.trim(),
                village: editVillage.trim(),
                postalCode: editPincode.trim(),
                latitude: editLat,
                longitude: editLng
            });

            // Refresh user local state
            let newAddresses = [...(user.addresses || [])];
            if (editingAddressId) {
                newAddresses = newAddresses.map(a => a.id === savedAddr.id ? savedAddr : a);
            } else {
                newAddresses.push(savedAddr);
            }

            if (savedAddr.isDefault) {
                newAddresses = newAddresses.map(a => ({ ...a, isDefault: a.id === savedAddr.id }));
            }

            const updatedUser = {
                ...user,
                addresses: newAddresses,
                address: savedAddr.isDefault ? finalStr : user.address
            };

            await storageService.saveUserProfile(updatedUser);
            storageService.setUser(updatedUser);
            setUser(updatedUser);

            setShowAddressForm(false);
            setEditingAddressId(null);
        } catch (e) {
            console.error('Failed to save address', e);
        } finally {
            setSavingAddress(false);
        }
    };

    const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to remove this address?")) return;
        try {
            await storageService.deleteUserAddress(id);
            const remaining = user.addresses?.filter(a => a.id !== id) || [];

            // If we deleted default and there are others left, maybe just let the user pick next time
            // Or auto set first to default. Let's keep it simple.
            const updatedUser = { ...user, addresses: remaining };
            setUser(updatedUser);
            storageService.setUser(updatedUser);
        } catch (e) { console.error("Error deleting", e) }
    };

    const handleSetPrimary = async (addr: UserAddress) => {
        if (addr.isDefault) return;
        try {
            const updatedAddr = await storageService.saveUserAddress({ ...addr, isDefault: true });
            const updatedAddresses = user.addresses?.map(a => ({ ...a, isDefault: a.id === updatedAddr.id })) || [];
            const fullAddrStr = [addr.houseNo, addr.areaOrPara, addr.village, addr.postalCode].filter(Boolean).join(', ');

            const updatedUser = { ...user, addresses: updatedAddresses, address: fullAddrStr };
            await storageService.saveUserProfile(updatedUser);
            setUser(updatedUser);
            storageService.setUser(updatedUser);
        } catch (e) { console.error(e) }
    };

    const handleEditAddressItem = (addr: UserAddress) => {
        setEditingAddressId(addr.id);
        const fullAddrStr = [addr.houseNo, addr.areaOrPara, addr.village, addr.postalCode].filter(Boolean).join(', ');
        setEditAddress(fullAddrStr);
        setEditHouseNo(addr.houseNo || '');
        setEditArea(addr.areaOrPara || '');
        setEditVillage(addr.village || '');
        setEditPincode(addr.postalCode || '');
        setEditLat(addr.latitude);
        setEditLng(addr.longitude);
        setShowAddressForm(true);
    };

    const handlePicPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setPicPreview(reader.result as string);
        reader.readAsDataURL(file);

        setUploadingPic(true);
        try {
            const croppedBlob = await cropToSquare(file);
            const { url, key } = await storageService.uploadProfilePictureWithDelete(
                user.id,
                croppedBlob,
                user.profilePicKey ?? null
            );

            const updated = { ...user, profilePic: url, profilePicKey: key };
            await storageService.saveUserProfile(updated);
            storageService.setUser(updated);
            setUser(updated);
            setPicPreview(null);
            setEditField(null);
        } catch (err) {
            console.error('[ProfilePic] error:', err);
            setPicPreview(null);
        } finally {
            setUploadingPic(false);
            if (picInputRef.current) picInputRef.current.value = '';
        }
    };


    const cancelEdit = () => {
        if (showAddressForm) {
            setShowAddressForm(false);
            setEditingAddressId(null);
        } else {
            setEditField(null);
            setPicPreview(null);
        }
    };

    const handleAddNewAddress = () => {
        setEditingAddressId(null);
        setEditAddress('');
        setEditHouseNo('');
        setEditArea('');
        setEditVillage('');
        setEditPincode('');
        setEditLat(undefined);
        setEditLng(undefined);
        setShowAddressForm(true);
    };

    const detectLocation = async () => {
        setDetectingLocation(true);
        try {
            const position = await locationService.getCurrentLocation();
            const { latitude, longitude } = position;
            
            const addrDetails = await locationService.reverseGeocode(latitude, longitude);
            
            if (addrDetails && addrDetails.fullAddress) {
                setEditVillage(addrDetails.village || '');
                setEditArea(addrDetails.area || '');
                setEditPincode(addrDetails.postalCode || '');
                // We don't necessarily have house number from reverse geocode easily but we can try
                setEditLat(latitude);
                setEditLng(longitude);
                setEditAddress(addrDetails.fullAddress);
            } else {
                throw new Error('No address found for these coordinates');
            }
        } catch (error: any) {
            console.error('Location error:', error);
            const msg = error.message || 'An error occurred while detecting location.';
            if (msg.toLowerCase().includes('permission')) {
                alert('We need permission to access your location. Please check your browser settings and ensured it is enabled in your device settings.');
            } else {
                alert(msg);
            }
        } finally {
            setDetectingLocation(false);
        }
    };

    if (editField === 'phone') {
        return (
            <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f8f6] overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif] slide-up">
                <style>{`
                    .material-symbols-outlined {
                        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    }
                    @keyframes slideUp {
                        from { transform: translateY(16px); opacity: 0; }
                        to   { transform: translateY(0);    opacity: 1; }
                    }
                    .slide-up { animation: slideUp 0.15s ease both; }
                `}</style>
                <header className="bg-[#f6f8f6] sticky top-0 z-10 border-b border-[#2bee2b]/10">
                    <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
                        <button onClick={cancelEdit} className="flex size-10 items-center justify-center rounded-full hover:bg-[#2bee2b]/10 transition-colors">
                            <span className="material-symbols-outlined text-slate-900">arrow_back</span>
                        </button>
                        <h1 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900">Phone Numbers</h1>
                    </div>
                </header>
                <main className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">
                    <div className="bg-[#2bee2b]/5 rounded-lg p-4 border border-[#2bee2b]/10">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-[#2bee2b]">info</span>
                            <p className="text-sm leading-relaxed text-slate-700">
                                Your <span className="font-semibold text-slate-900">primary number</span> is used for order delivery updates and receiving OTPs for secure login.
                            </p>
                        </div>
                    </div>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-base font-bold text-slate-900">Saved Numbers</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#2bee2b]/5">
                                <div className="flex items-center justify-center rounded-lg bg-[#2bee2b]/10 text-[#2bee2b] shrink-0 size-12">
                                    <span className="material-symbols-outlined">phone_android</span>
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center gap-2 max-w-full">
                                        <input
                                            type="tel"
                                            ref={phoneInputRef}
                                            value={editPhone}
                                            onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            className="min-w-0 flex-1 bg-transparent border-none outline-none text-base font-bold text-slate-900 p-0 focus:ring-0 leading-tight"
                                            placeholder="10-digit mobile"
                                            maxLength={10}
                                        />
                                        <span className="text-[10px] uppercase tracking-wider font-bold bg-[#2bee2b] text-white px-2 py-0.5 rounded-full shrink-0">Primary</span>
                                    </div>
                                    <p className="text-slate-500 text-sm mt-0.5">Main contact number</p>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button onClick={() => phoneInputRef.current?.focus()} className="text-xs text-left font-bold text-[#2bee2b] hover:underline">Edit</button>
                                </div>
                            </div>

                            {isEditingSecondary ? (
                                <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0 size-12">
                                        <span className="material-symbols-outlined">smartphone</span>
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2 max-w-full">
                                            <input
                                                type="tel"
                                                autoFocus={!user.secondaryPhone}
                                                value={editSecondaryPhone}
                                                onChange={e => setEditSecondaryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className="min-w-0 flex-1 bg-transparent border-none outline-none text-base font-bold text-slate-900 p-0 focus:ring-0 leading-tight"
                                                placeholder="Secondary mobile"
                                                maxLength={10}
                                            />
                                            <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Secondary</span>
                                        </div>
                                        <p className="text-slate-500 text-sm mt-0.5">Work / Other phone</p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => {
                                                setEditSecondaryPhone('');
                                                setIsEditingSecondary(false);
                                            }}
                                            className="text-xs text-left font-bold text-slate-400 hover:text-red-500"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditingSecondary(true)}
                                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#2bee2b]/30 rounded-xl text-[#2bee2b] font-bold hover:bg-[#2bee2b]/5 transition-colors"
                                >
                                    <span className="material-symbols-outlined">add_circle</span>
                                    <span>Add Secondary Number</span>
                                </button>
                            )}
                        </div>
                    </section>
                    <section className="pt-4 pb-20">
                        <button
                            onClick={savePhone}
                            disabled={savingPhone || editPhone.length < 10}
                            className="w-full bg-[#2bee2b] text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-[#2bee2b]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {savingPhone ? <Spinner /> : 'Save Changes'}
                        </button>
                    </section>
                </main>
            </div>
        );
    }

    if (editField === 'address') {
        return (
            <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f8f6] overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif] slide-up pt-4">
                <style>{`
                    .material-symbols-outlined {
                        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    }
                    @keyframes slideUp {
                        from { transform: translateY(16px); opacity: 0; }
                        to   { transform: translateY(0);    opacity: 1; }
                    }
                    .slide-up { animation: slideUp 0.15s ease both; }
                `}</style>
                <header className="flex items-center p-4 pt-6 gap-4 bg-[#f6f8f6] sticky top-0 z-10">
                    <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined block text-slate-700">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Manage Addresses</h1>
                </header>

                <div className="px-4 py-2">
                    <div className="bg-[#2bee2b]/10 border border-[#2bee2b]/20 rounded-xl p-4 flex gap-3">
                        <span className="material-symbols-outlined text-[#2bee2b]">info</span>
                        <p className="text-sm font-medium text-slate-700 leading-snug">
                            Your primary address is used for all medical supplies, prescriptions, and home care service deliveries.
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Saved Addresses</h2>
                        <button
                            onClick={handleAddNewAddress}
                            className="text-[#2bee2b] font-semibold text-sm flex items-center gap-1 hover:opacity-80"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Add New Address
                        </button>
                    </div>

                    {!showAddressForm && (
                        <button
                            onClick={() => {
                                handleAddNewAddress();
                                setTimeout(() => detectLocation(), 0);
                            }}
                            disabled={detectingLocation}
                            className="w-full mb-6 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl py-3 px-4 flex items-center gap-3 group text-slate-700 disabled:opacity-75"
                        >
                            <div className="size-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                {detectingLocation ? (
                                    <Spinner />
                                ) : (
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>my_location</span>
                                )}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm tracking-tight">Detect My Current Location</span>
                                <p className="text-[10px] text-slate-500 font-medium">Quickly find and autofill your address</p>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </button>
                    )}

                    {showAddressForm ? (
                        <div className="space-y-4 pb-20 mt-4">
                            <button
                                onClick={detectLocation}
                                disabled={detectingLocation}
                                className="w-full bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl py-3 px-4 flex items-center gap-3 group text-slate-700 disabled:opacity-75"
                            >
                                <div className="size-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    {detectingLocation ? (
                                        <Spinner />
                                    ) : (
                                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>my_location</span>
                                    )}
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="font-bold text-sm tracking-tight">
                                        {detectingLocation ? 'Detecting Location...' : 'Detect My Current Location'}
                                    </span>
                                    <p className="text-[10px] text-slate-500 font-medium">Quickly find and autofill your address</p>
                                </div>
                                <span className="material-symbols-outlined ml-auto text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>

                            <div className="bg-white border-2 border-[#2bee2b] rounded-xl p-4 relative shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                                <div className="flex gap-4">
                                    <div className="size-12 rounded-full bg-[#2bee2b]/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#2bee2b]">home</span>
                                    </div>
                                    <div className="flex-1 group space-y-3">
                                        <div className="flex items-center gap-2 mb-0.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <input
                                                type="text"
                                                value={editHouseNo}
                                                onChange={e => setEditHouseNo(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-900 p-0 focus:ring-0 placeholder:font-medium placeholder:text-slate-400"
                                                placeholder="House No / Flat / Bldg"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <input
                                                type="text"
                                                value={editVillage}
                                                onChange={e => setEditVillage(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-900 p-0 focus:ring-0 placeholder:font-medium placeholder:text-slate-400"
                                                placeholder="Village / Town"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <input
                                                type="text"
                                                value={editArea}
                                                onChange={e => setEditArea(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-900 p-0 focus:ring-0 placeholder:font-medium placeholder:text-slate-400"
                                                placeholder="Area / Para / Locality"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <input
                                                type="text"
                                                value={editPincode}
                                                onChange={e => setEditPincode(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-900 p-0 focus:ring-0 placeholder:font-medium placeholder:text-slate-400"
                                                placeholder="PIN Code"
                                            />
                                        </div>
                                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                            We use this structured information for accurate delivery mapping.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 pb-24">
                                <button
                                    onClick={saveAddress}
                                    disabled={savingAddress || (!editVillage.trim() && !editArea.trim() && !editAddress.trim())}
                                    className="w-full bg-[#2bee2b] text-slate-900 font-bold py-4 rounded-xl shadow-xl shadow-[#2bee2b]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingAddress ? <Spinner /> : 'Save Address'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-24">
                            {(!user.addresses || user.addresses.length === 0) && (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">Wrong_Location</span>
                                    <p className="text-slate-500 font-medium text-sm">No addresses saved yet</p>
                                </div>
                            )}

                            {user.addresses?.map(addr => (
                                <div key={addr.id} className={`bg-white border ${addr.isDefault ? 'border-2 border-[#2bee2b]' : 'border-slate-100'} rounded-xl p-4 relative`}>
                                    {addr.isDefault && (
                                        <div className="absolute top-4 right-4 bg-[#2bee2b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                            Primary
                                        </div>
                                    )}
                                    <div className="flex gap-4 cursor-pointer" onClick={() => handleSetPrimary(addr)}>
                                        <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${addr.isDefault ? 'bg-[#2bee2b]/20' : 'bg-slate-100'}`}>
                                            <span className={`material-symbols-outlined ${addr.isDefault ? 'text-[#2bee2b]' : 'text-slate-500'}`}>
                                                {addr.isDefault ? 'home' : 'work'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900">
                                                {addr.isDefault ? 'Home' : 'Saved Address'}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                                {[addr.houseNo, addr.village, addr.areaOrPara, addr.postalCode].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleEditAddressItem(addr)}
                                            className="flex-1 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 hover:text-[#2bee2b] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span> Edit
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 self-center"></div>
                                        <button
                                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                                            className="flex-1 text-sm font-semibold text-slate-400 flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-auto min-h-screen pb-20 w-full flex-col bg-white overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif]">
            <style>{`
                .material-symbols-outlined {
                    font-family: 'Material Symbols Outlined';
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    display: inline-block;
                    line-height: 1;
                    text-transform: none;
                    letter-spacing: normal;
                    word-wrap: normal;
                    white-space: nowrap;
                    direction: ltr;
                    font-size: inherit;
                }
                @keyframes slideUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .slide-up { animation: slideUp 0.15s ease both; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Header */}
            <div className="flex items-center p-4 pb-2 justify-between">
                <div className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer">
                    {/* Placeholder for symmetry */}
                </div>
                <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center">Profile</h2>
                <div className="flex size-12 shrink-0 items-center justify-center"></div>
            </div>

            {/* Profile Hero Section */}
            <div className="flex p-6">
                <div className="flex w-full flex-col gap-6 items-center">
                    <div className="flex gap-4 flex-col items-center">
                        <div className="relative bg-white rounded-full">
                            <label className="cursor-pointer relative block">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-[#2bee2b]/20 flex items-center justify-center overflow-hidden bg-slate-100"
                                    style={user.profilePic || picPreview ? { backgroundImage: `url(${picPreview || user.profilePic})` } : {}}
                                >
                                    {!(user.profilePic || picPreview) && (
                                        <span className="text-4xl font-black text-slate-400">{user.name.charAt(0).toUpperCase()}</span>
                                    )}
                                    {uploadingPic && (
                                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                            <Spinner />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 bg-[#2bee2b] p-2 rounded-full border-2 border-white flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[16px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                                <input
                                    ref={picInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingPic}
                                    onChange={handlePicPick}
                                />
                            </label>
                        </div>
                        <div className="flex flex-col items-center justify-center mt-2">
                            <p className="text-slate-900 text-2xl font-bold leading-tight tracking-tight text-center">{user.name}</p>
                            <p className="text-slate-500 text-sm font-medium leading-normal text-center">{user.email || 'Not linked'}</p>
                        </div>
                    </div>
                </div>
            </div>


            {/* Account Info Section */}
            <div className="px-4 py-2">
                <h3 className="text-slate-900 text-sm font-bold uppercase tracking-widest px-2 pb-4">Account Information</h3>
                <div className="space-y-3">

                    {/* Phone Display Panel */}
                    <div
                        onClick={() => openEdit('phone')}
                        className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="text-[#2bee2b] flex items-center justify-center rounded-lg bg-[#2bee2b]/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">call</span>
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-tighter">Phone Numbers</p>
                            <p className="text-slate-900 text-base font-semibold">{user.phone || 'Add phone number'}</p>
                            {user.secondaryPhone && (
                                <p className="text-slate-500 text-sm font-semibold mt-0.5">{user.secondaryPhone}</p>
                            )}
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>

                    {/* Address Display Panel */}
                    <div
                        onClick={() => openEdit('address')}
                        className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="text-[#2bee2b] flex items-center justify-center rounded-lg bg-[#2bee2b]/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">location_on</span>
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-tighter">Delivery Address</p>
                            <p className="text-slate-900 text-base font-semibold line-clamp-1">{user.address || 'Add delivery address'}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>
                </div>
            </div>

            {/* Management Section */}
            {(() => {
                const userAuths = (allAuthorities || []).filter(a => a.userId === user.id && a.isActive);
                const roles = userAuths.map(a => a.role);
                const isAdmin = user.role === 'admin' || roles.includes('admin') || user.email === 'pradhanparthasarthi3@gmail.com';
                const isSales = user.role === 'sales' || roles.includes('sales') || isAdmin;
                const isDelivery = user.role === 'delivery' || roles.includes('delivery') || isAdmin;
                const isLogistic = user.role === 'logistic' || roles.includes('logistic') || isAdmin;

                if (!(isAdmin || isSales || isDelivery || isLogistic)) return null;

                return (
                    <div className="px-4 py-2">
                        <h3 className="text-slate-900 text-sm font-bold uppercase tracking-widest px-2 pb-4">Management</h3>
                        <div className="space-y-3">
                            {isAdmin && (
                                <button
                                    onClick={() => window.location.href = '/admin'}
                                    className="flex w-full items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="text-blue-600 flex items-center justify-center rounded-lg bg-blue-50 shrink-0 size-10">
                                        <span className="material-symbols-outlined">shield_person</span>
                                    </div>
                                    <div className="flex flex-col flex-1 text-left">
                                        <p className="text-slate-900 text-base font-semibold">Admin Panel</p>
                                        <p className="text-slate-500 text-xs font-medium">System controls and oversight</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                </button>
                            )}
                            {isSales && (
                                <button
                                    onClick={() => navigate('/sales')}
                                    className="flex w-full items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="text-amber-600 flex items-center justify-center rounded-lg bg-amber-50 shrink-0 size-10">
                                        <span className="material-symbols-outlined">business_center</span>
                                    </div>
                                    <div className="flex flex-col flex-1 text-left">
                                        <p className="text-slate-900 text-base font-semibold">Sales Dashboard</p>
                                        <p className="text-slate-500 text-xs font-medium">Track targets and activities</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                </button>
                            )}
                            {isDelivery && (
                                <button
                                    onClick={() => navigate('/delivery')}
                                    className="flex w-full items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="text-green-600 flex items-center justify-center rounded-lg bg-green-50 shrink-0 size-10">
                                        <span className="material-symbols-outlined">local_shipping</span>
                                    </div>
                                    <div className="flex flex-col flex-1 text-left">
                                        <p className="text-slate-900 text-base font-semibold">Delivery Dashboard</p>
                                        <p className="text-slate-500 text-xs font-medium">Manage missions and routes</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                </button>
                            )}
                            {isLogistic && (
                                <button
                                    onClick={() => window.location.href = '/admin/Logistic'}
                                    className="flex w-full items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="text-emerald-600 flex items-center justify-center rounded-lg bg-emerald-50 shrink-0 size-10">
                                        <span className="material-symbols-outlined">dashboard</span>
                                    </div>
                                    <div className="flex flex-col flex-1 text-left">
                                        <p className="text-slate-900 text-base font-semibold">Logistic Dashboard</p>
                                        <p className="text-slate-500 text-xs font-medium">Warehouse and supply chain</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Actions Section */}
            {!editField && (
                <div className="px-4 py-6 space-y-3 pb-24">
                    <button className="flex w-full items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group active:scale-[0.98]">
                        <div className="text-slate-600 flex items-center justify-center size-6">
                            <span className="material-symbols-outlined">help_center</span>
                        </div>
                        <span className="text-slate-900 font-semibold flex-1 text-left">Help &amp; Support</span>
                        <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:bg-red-50 transition-colors group active:scale-[0.98]"
                    >
                        <div className="text-red-500 flex items-center justify-center size-6">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                        <span className="text-red-500 font-semibold flex-1 text-left">Logout</span>
                    </button>

                    {/* Legal Links (Medium Focus) */}
                    <div className="flex flex-col items-center justify-center pt-8 pb-12 gap-2 opacity-60">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('TERMS')} className="text-[10px] font-bold text-slate-600">Terms & Conditions</button>
                            <div className="w-1 h-1 rounded-full bg-slate-400" />
                            <button onClick={() => setView('PRIVACY')} className="text-[10px] font-bold text-slate-600">Privacy Policy</button>
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 tracking-wider">Mother Best Premium • v1.0.4</p>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-center justify-around py-2 px-4 pb-6">
                <button onClick={() => { setView('LANDING'); navigate('/'); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                </button>
                <button onClick={() => { setView('PRODUCT_HUB'); navigate('/products'); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                    <span className="material-symbols-outlined">storefront</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Shop</span>
                </button>
                <button onClick={() => setView('ORDER_HISTORY')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                    <span className="material-symbols-outlined">receipt_long</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
                </button>
                <button onClick={() => setView('PROFILE')} className="flex flex-col items-center gap-1 text-[#2bee2b]">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export async function cropToSquare(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = async () => {
            try {
                const SIZE = 400;
                const canvas = document.createElement('canvas');
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d')!;

                let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

                const minSide = Math.min(img.width, img.height);
                sourceX = (img.width - minSide) / 2;
                sourceY = (img.height - minSide) / 2;
                sourceWidth = minSide;
                sourceHeight = minSide;

                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, SIZE, SIZE);
                URL.revokeObjectURL(url);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                }, 'image/jpeg', 0.88);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = url;
    });
}

export default ProfileMobile;
