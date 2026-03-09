import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { LogoIcon } from '../components/LogoIcon';
import { Card, Button } from '../components/Layout';
import {
    XCircle,
    Plus,
    Phone,
    UserCheck,
    RotateCw,
    Check,
    Navigation,
    MapPin,
    Sparkles,
    ChevronRight,
    Facebook,
    ArrowRight
} from 'lucide-react';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';

const AuthPage: React.FC = () => {
    const { view, setView, user, setUser, allAuthorities, refreshUserData } = useAppContext();
    const navigate = useNavigate();

    // Auth State
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [authStep, setAuthStep] = useState<'UNIFIED' | 'ADDRESS_ONLY'>('UNIFIED');
    const [authInput, setAuthInput] = useState(user?.phone || '');
    const [regName, setRegName] = useState(user?.name || '');
    const [regAddress, setRegAddress] = useState(user?.address || '');
    const [regVillage, setRegVillage] = useState('');
    const [regAreaOrPara, setRegAreaOrPara] = useState('');
    const [regHouseNo, setRegHouseNo] = useState('');
    const [regPostalCode, setRegPostalCode] = useState('');
    const [regLatitude, setRegLatitude] = useState<number | undefined>();
    const [regLongitude, setRegLongitude] = useState<number | undefined>();
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [regPassword, setRegPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [regPhoneVerified, setRegPhoneVerified] = useState(false);
    const [regDeliveryPhone, setRegDeliveryPhone] = useState('');
    const [regReferralCode, setRegReferralCode] = useState('');
    const [regProfilePic, setRegProfilePic] = useState<string | undefined>(user?.profilePic);
    const [isProcessingImg, setIsProcessingImg] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const [isManualLoginOpen, setIsManualLoginOpen] = useState(false);
    const referralRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (referralRef.current && !referralRef.current.contains(event.target as Node)) {
                setIsReferralOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAutoCrop = (file: File) => {
        if (!file) return;
        setIsProcessingImg(true);
        setAuthError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // @ts-ignore
                    const faceapi = window.faceapi;
                    const canvas = document.createElement('canvas');
                    const SIZE = 512;
                    canvas.width = SIZE;
                    canvas.height = SIZE;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error("Canvas context failed");

                    let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

                    if (faceapi) {
                        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());
                        if (detections) {
                            const { x, y, width, height } = detections.box;
                            const faceCenterX = x + width / 2;
                            const faceCenterY = y + height / 2;
                            const cropSize = Math.max(width, height) * 2.5;
                            const finalCropSize = Math.min(cropSize, img.width, img.height);
                            sourceX = Math.max(0, Math.min(faceCenterX - finalCropSize / 2, img.width - finalCropSize));
                            sourceY = Math.max(0, Math.min(faceCenterY - finalCropSize / 2, img.height - finalCropSize));
                            sourceWidth = finalCropSize;
                            sourceHeight = finalCropSize;
                        } else {
                            const minSide = Math.min(img.width, img.height);
                            sourceX = (img.width - minSide) / 2;
                            sourceY = (img.height - minSide) / 2;
                            sourceWidth = minSide;
                            sourceHeight = minSide;
                        }
                    }

                    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, SIZE, SIZE);
                    setRegProfilePic(canvas.toDataURL('image/jpeg', 0.8));
                } catch (err) {
                    console.error("AI Auto-crop error:", err);
                    setAuthError("Error processing photo.");
                } finally {
                    setIsProcessingImg(false);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleGoogleLogin = async () => {
        // Validation for new users signing up
        if (authMode === 'REGISTER' && !user) {
            if (!authInput) { setAuthError("Please enter your Phone Number."); return; }
            if (!regName) { setAuthError("Please enter your Household Name."); return; }
            if (!regHouseNo || !regAreaOrPara || !regVillage || !regPostalCode) {
                setAuthError("Please complete your Delivery Address fields (House No, Area, City, PIN).");
                return;
            }
        }

        setIsLoggingIn(true);
        setAuthError(null);
        try {
            if (authMode === 'REGISTER' && !user) {
                const pendingData = {
                    fullName: regName,
                    phone: authInput,
                    address: regAddress,
                    village: regVillage,
                    areaOrPara: regAreaOrPara,
                    houseNo: regHouseNo,
                    postalCode: regPostalCode,
                    latitude: regLatitude,
                    longitude: regLongitude,
                    referralCode: regReferralCode,
                    profilePic: regProfilePic
                };
                localStorage.setItem('pending_registration_data', JSON.stringify(pendingData));
            } else {
                localStorage.removeItem('pending_registration_data');
            }
            await authService.loginWithGoogle();
        } catch (error: any) {
            setAuthError(error.message || "Google Login failed.");
            setIsLoggingIn(false);
        }
    };

    const handleFacebookLogin = async () => {
        // Validation for new users signing up
        if (authMode === 'REGISTER' && !user) {
            if (!authInput) { setAuthError("Please enter your Phone Number."); return; }
            if (!regName) { setAuthError("Please enter your Household Name."); return; }
            if (!regHouseNo || !regAreaOrPara || !regVillage || !regPostalCode) {
                setAuthError("Please complete your Delivery Address fields (House No, Area, City, PIN).");
                return;
            }
        }

        setIsLoggingIn(true);
        setAuthError(null);
        try {
            if (authMode === 'REGISTER' && !user) {
                const pendingData = {
                    fullName: regName,
                    phone: authInput,
                    address: regAddress,
                    village: regVillage,
                    areaOrPara: regAreaOrPara,
                    houseNo: regHouseNo,
                    postalCode: regPostalCode,
                    latitude: regLatitude,
                    longitude: regLongitude,
                    referralCode: regReferralCode,
                    profilePic: regProfilePic
                };
                localStorage.setItem('pending_registration_data', JSON.stringify(pendingData));
            } else {
                localStorage.removeItem('pending_registration_data');
            }
            await authService.loginWithFacebook();
        } catch (error: any) {
            setAuthError(error.message || "Facebook Login failed.");
            setIsLoggingIn(false);
        }
    };

    const handleDetectLocation = async () => {
        setIsDetectingLocation(true);
        setAuthError(null);
        try {
            const position = await locationService.getCurrentLocation();
            setRegLatitude(position.latitude);
            setRegLongitude(position.longitude);
            const addressComponents = await locationService.reverseGeocode(position.latitude, position.longitude);
            if (addressComponents) {
                if (addressComponents.village) setRegVillage(addressComponents.village);
                if (addressComponents.area) setRegAreaOrPara(addressComponents.area);
                if (addressComponents.postalCode) setRegPostalCode(addressComponents.postalCode);
                const newAddress = `${regHouseNo ? regHouseNo + ', ' : ''}${addressComponents.area || ''}, ${addressComponents.village || ''}${addressComponents.postalCode ? ' - ' + addressComponents.postalCode : ''}`;
                setRegAddress(newAddress);
            } else {
                setAuthError("Could not determine your exact address. Please enter manually.");
            }
        } catch (error: any) {
            setAuthError(error.message || "Failed to detect location.");
        } finally {
            setIsDetectingLocation(false);
        }
    };

    const handleLogin = async () => {
        if (!authInput) {
            setAuthError("Please enter your phone number.");
            return;
        }
        setIsLoggingIn(true);
        setAuthError(null);
        try {
            const addressData = {
                fullName: regName,
                phone: regDeliveryPhone || authInput,
                village: regVillage,
                areaOrPara: regAreaOrPara,
                houseNo: regHouseNo,
                postalCode: regPostalCode,
                latitude: regLatitude,
                longitude: regLongitude,
            };

            const loggedInUser = await authService.registerOrLogin(
                authInput,
                regPassword,
                regName,
                regAddress,
                regPhoneVerified,
                regReferralCode,
                regProfilePic,
                undefined,
                authMode,
                addressData
            );

            if (loggedInUser) {
                storageService.setUser(loggedInUser);
                setUser(loggedInUser);
                await refreshUserData(loggedInUser.id);
                setView('PRODUCT_HUB');
                navigate('/products');
            }
        } catch (error: any) {
            if (error.message.includes("New user detected")) {
                setAuthError("No profile found. Please fill in details below to join.");
                setAuthMode('REGISTER');
            } else {
                setAuthError(error.message || "Authentication failed.");
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleBack = () => {
        if (user) {
            setView('PRODUCT_HUB');
        } else {
            setView('LANDING');
            navigate('/');
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#FCFBF7] relative overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-green-100/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[480px] z-10">
                <div className="text-center mb-10 animate-fade-in-up">
                    <div className="inline-block p-1 bg-white rounded-3xl shadow-xl shadow-green-900/5 mb-6">
                        <LogoIcon className="w-20 h-20" onClick={handleBack} />
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        {authStep === 'ADDRESS_ONLY' ? 'Delivery Address' : 'Member Access'}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-3 px-10">
                        {authStep === 'ADDRESS_ONLY' ? 'Please provide your correct delivery location.' : 'Simple, secure access to pure home care solutions.'}
                    </p>
                </div>

                <Card className="p-0 overflow-hidden border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] bg-white rounded-[2.5rem] animate-scale-in">
                    {authError && (
                        <div className="mx-8 mt-8 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-shake flex items-center gap-3">
                            <XCircle className="w-4 h-4 shrink-0" />
                            {authError}
                        </div>
                    )}

                    {!user && (
                        <div className="flex p-1 bg-slate-100/50 rounded-2xl mb-2 mx-8 mt-8 border border-slate-100">
                            <button
                                onClick={() => { setAuthMode('LOGIN'); setAuthError(null); }}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Already a Member
                            </button>
                            <button
                                onClick={() => { setAuthMode('REGISTER'); setAuthError(null); }}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Join the Family
                            </button>
                        </div>
                    )}

                    <div className="p-8 md:p-10 space-y-6">
                        {user ? (
                            <div className="flex flex-col items-center justify-center p-12">
                                <div className="w-8 h-8 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div>
                                <p className="text-slate-500 font-bold mt-4 animate-pulse text-sm">Getting things ready...</p>
                            </div>
                        ) : authMode === 'LOGIN' ? (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={handleGoogleLogin} disabled={isLoggingIn} className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 hover:bg-white flex items-center justify-center gap-3 shadow-sm transition-all">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Google</span>
                                        </button>
                                        <button type="button" onClick={handleFacebookLogin} disabled={isLoggingIn} className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 hover:bg-white flex items-center justify-center gap-3 shadow-sm transition-all">
                                            <Facebook className="w-5 h-5 text-[#1877F2] fill-current" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Facebook</span>
                                        </button>
                                    </div>

                                    <div className="pt-4 flex flex-col items-center">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsManualLoginOpen(!isManualLoginOpen)}
                                            className="w-full flex items-center justify-center relative mb-4 cursor-pointer group"
                                        >
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-100 group-hover:border-slate-200 transition-colors"></div>
                                            </div>
                                            <div className="relative bg-white px-4 flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-400 transition-colors">Email</span>
                                                <ChevronRight className={`w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-all duration-300 ${isManualLoginOpen ? 'rotate-90' : ''}`} />
                                            </div>
                                        </button>

                                        {isManualLoginOpen && (
                                            <div className="w-full space-y-3 bg-slate-50/30 p-4 rounded-2xl border border-slate-100 animate-fade-in-up">
                                                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-600 focus:border-green-300 focus:bg-white transition-all placeholder:text-slate-300" placeholder="Email or Phone Number" value={authInput} onChange={(e) => setAuthInput(e.target.value)} />
                                                <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-600 focus:border-green-300 focus:bg-white transition-all placeholder:text-slate-300" placeholder="Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                                                <Button fullWidth onClick={handleLogin} disabled={isLoggingIn} className="rounded-xl h-10 mt-1 bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 border-none uppercase tracking-widest font-black text-[10px]">
                                                    {isLoggingIn ? 'Processing...' : 'Manual Login'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in-up">
                                {authStep !== 'ADDRESS_ONLY' && (
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white bg-slate-50 shadow-xl flex items-center justify-center relative ring-1 ring-slate-100">
                                                {regProfilePic ? (
                                                    <img src={regProfilePic} className="w-full h-full object-cover" alt="Profile" />
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-200">
                                                        <UserCheck className="w-10 h-10" />
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center hover:bg-black/5 transition-all">
                                                    {isProcessingImg && (
                                                        <div className="bg-white/80 inset-0 absolute flex items-center justify-center rounded-full backdrop-blur-sm">
                                                            <div className="w-6 h-6 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAutoCrop(file); e.target.value = ''; }} />
                                                </label>
                                            </div>
                                            {!regProfilePic && !isProcessingImg && (
                                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 text-white rounded-xl flex items-center justify-center border-4 border-white shadow-lg pointer-events-none">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {authStep !== 'ADDRESS_ONLY' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${user ? 'text-slate-400' : 'text-slate-300 group-focus-within:text-green-600'}`} />
                                                <input type="tel" disabled={!!user} className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-200 ${user ? 'bg-slate-50 border-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5'}`} placeholder="E.g. 9876543210" value={authInput} onChange={(e) => setAuthInput(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    {authStep !== 'ADDRESS_ONLY' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Household Name</label>
                                            <div className="relative group">
                                                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                <input type="text" className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-200" placeholder="Your Family or Name" value={regName} onChange={(e) => setRegName(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        {authStep === 'ADDRESS_ONLY' && (
                                            <div className="space-y-2 mb-4">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Contact Number</label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                    <input type="tel" className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900" placeholder="Phone for Delivery Person" value={regDeliveryPhone} onChange={(e) => setRegDeliveryPhone(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Address</label>
                                            <button type="button" onClick={handleDetectLocation} disabled={isDetectingLocation} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${isDetectingLocation ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white shadow-md'}`}>
                                                {isDetectingLocation ? <RotateCw className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                                                {isDetectingLocation ? 'Locating...' : 'Find My Location'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 col-span-2" placeholder="House No. / Flat" value={regHouseNo} onChange={(e) => setRegHouseNo(e.target.value)} />
                                            <input type="text" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400" placeholder="Area / Para" value={regAreaOrPara} onChange={(e) => setRegAreaOrPara(e.target.value)} />
                                            <input type="text" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400" placeholder="Village / City" value={regVillage} onChange={(e) => setRegVillage(e.target.value)} />
                                            <input type="text" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 col-span-2" placeholder="PIN Code" value={regPostalCode} onChange={(e) => setRegPostalCode(e.target.value)} />
                                        </div>
                                    </div>

                                    {authStep !== 'ADDRESS_ONLY' && (
                                        <div className="relative" ref={referralRef}>
                                            <div onClick={() => setIsReferralOpen(!isReferralOpen)} className="p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 flex items-center justify-between cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <Sparkles className="w-4 h-4 text-slate-300" />
                                                    <span className="text-xs font-bold text-slate-400">{regReferralCode || 'Referral Code (Optional)'}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                            {isReferralOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 py-2">
                                                    {allAuthorities.filter(a => a.role === 'sales' && a.isActive).map(a => (
                                                        <div key={a.id} onClick={() => { setRegReferralCode(a.referralCode!); setIsReferralOpen(false); }} className="px-5 py-3 hover:bg-slate-50 cursor-pointer text-xs font-bold">
                                                            {a.referralCode} ({a.userName})
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={handleGoogleLogin} disabled={isLoggingIn} className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 hover:bg-white flex items-center justify-center gap-3 shadow-sm transition-all">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Google</span>
                                        </button>
                                        <button type="button" onClick={handleFacebookLogin} disabled={isLoggingIn} className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 hover:bg-white flex items-center justify-center gap-3 shadow-sm transition-all">
                                            <Facebook className="w-5 h-5 text-[#1877F2] fill-current" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Facebook</span>
                                        </button>
                                    </div>
                            </div>
                        )}

                        <button onClick={handleBack} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2 hover:text-slate-900 transition-colors">Go Back</button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AuthPage;
