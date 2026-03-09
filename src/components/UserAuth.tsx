import React, { useState, useRef, useEffect } from 'react';
import { Card, Button } from './Layout';
import {
    Phone,
    Mail,
    Lock,
    Eye,
    EyeOff,
    UserCheck,
    Plus,
    XCircle,
    ArrowRight,
    RotateCw,
    Ticket,
    MapPin
} from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface UserAuthProps {
    onSuccess: (user: User) => void;
    onBack: () => void;
    existingUser?: User | null;
    logoComponent: React.ReactNode;
}

type AuthMode = 'LOGIN' | 'REGISTER';

export const UserAuth: React.FC<UserAuthProps> = ({
    onSuccess,
    onBack,
    existingUser,
    logoComponent
}) => {
    // Mode State
    const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');

    // Form Fields
    const [phone, setPhone] = useState(existingUser?.phone || '');
    const [email, setEmail] = useState(existingUser?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState(existingUser?.name || '');
    const [referralCode, setReferralCode] = useState('');
    const [profilePic, setProfilePic] = useState<string | undefined>(existingUser?.profilePic);

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isProcessingImg, setIsProcessingImg] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);

    const referralRef = useRef<HTMLDivElement>(null);

    // Close referral dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (referralRef.current && !referralRef.current.contains(event.target as Node)) {
                setIsReferralOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Validation Functions
    const validatePhone = (phoneNumber: string): boolean => {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phoneNumber);
    };

    const validateEmail = (emailAddress: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailAddress);
    };

    const validatePassword = (pwd: string): boolean => {
        // At least 6 characters
        return pwd.length >= 6;
    };

    const validateForm = (): string | null => {
        // Phone validation
        if (!phone.trim()) {
            return "Phone number is required";
        }
        if (!validatePhone(phone)) {
            return "Please enter a valid 10-digit Indian phone number";
        }

        // Password validation
        if (!password.trim()) {
            return "Password is required";
        }
        if (!validatePassword(password)) {
            return "Password must be at least 6 characters long";
        }

        // Registration-specific validations
        if (authMode === 'REGISTER') {
            if (!fullName.trim()) {
                return "Full name is required";
            }
            if (fullName.trim().length < 3) {
                return "Full name must be at least 3 characters long";
            }

            if (email && !validateEmail(email)) {
                return "Please enter a valid email address";
            }

            if (password !== confirmPassword) {
                return "Passwords do not match";
            }
        }

        return null;
    };

    // Image Processing with AI Face Detection
    const handleAutoCrop = (file: File) => {
        if (!file) return;
        setIsProcessingImg(true);
        setError(null);

        const reader = new FileReader();
        reader.onerror = () => {
            setError("Failed to read file.");
            setIsProcessingImg(false);
        };
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => {
                setError("Failed to load image.");
                setIsProcessingImg(false);
            };
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

                    // Attempt AI Face Detection
                    if (faceapi) {
                        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());

                        if (detections) {
                            const { x, y, width, height } = detections.box;

                            // Define a square area centered on the face with padding
                            const faceCenterX = x + width / 2;
                            const faceCenterY = y + height / 2;
                            const cropSize = Math.max(width, height) * 2.5;

                            // Constrain cropSize to image dimensions
                            const finalCropSize = Math.min(cropSize, img.width, img.height);

                            sourceX = Math.max(0, Math.min(faceCenterX - finalCropSize / 2, img.width - finalCropSize));
                            sourceY = Math.max(0, Math.min(faceCenterY - finalCropSize / 2, img.height - finalCropSize));
                            sourceWidth = finalCropSize;
                            sourceHeight = finalCropSize;
                        } else {
                            // Fallback to center crop if no face found
                            const minSide = Math.min(img.width, img.height);
                            sourceX = (img.width - minSide) / 2;
                            sourceY = (img.height - minSide) / 2;
                            sourceWidth = minSide;
                            sourceHeight = minSide;
                        }
                    }

                    // Draw and resize
                    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, SIZE, SIZE);
                    setProfilePic(canvas.toDataURL('image/jpeg', 0.8));
                } catch (err) {
                    console.error("AI Auto-crop error:", err);
                    setError("Error processing photo.");
                } finally {
                    setIsProcessingImg(false);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Handle Form Submission
    const handleSubmit = async () => {
        setError(null);

        // Validate form
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        try {
            const user = await authService.registerOrLogin(
                phone,
                password,
                authMode === 'REGISTER' ? fullName : undefined,
                undefined, // address will be set in profile setup
                false, // phoneVerified
                referralCode || undefined,
                profilePic,
                email || undefined
            );

            if (user) {
                onSuccess(user);
            } else {
                setError("Authentication failed. Please try again.");
            }
        } catch (error: any) {
            console.error("Authentication error:", error);

            if (error.message?.includes("Invalid login credentials")) {
                if (authMode === 'LOGIN') {
                    setError("Invalid phone number or password. Please try again or register.");
                } else {
                    setError("This account already exists. Please login instead.");
                }
            } else if (error.message?.includes("User already registered")) {
                setError("This phone number is already registered. Please login instead.");
                setAuthMode('LOGIN');
            } else {
                setError(error.message || "Authentication failed. Please check your connection and try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Google Login Handler
    const handleGoogleLogin = async () => {
        try {
            setError(null);
            await authService.loginWithGoogle();
        } catch (error: any) {
            console.error("Google Login Error:", error);
            setError("Google Login failed. Please try again.");
        }
    };

    // Facebook Login Handler
    const handleFacebookLogin = async () => {
        try {
            setError(null);
            await authService.loginWithFacebook();
        } catch (error: any) {
            console.error("Facebook Login Error:", error);
            setError("Facebook Login failed. Please try again.");
        }
    };
    const switchMode = (mode: AuthMode) => {
        setAuthMode(mode);
        setError(null);
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#FCFBF7] relative overflow-hidden">
            {/* Abstract Background Orbs */}
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-green-100/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[480px] z-10">
                {/* Header */}
                <div className="text-center mb-10 animate-fade-in-up">
                    <div className="inline-block p-1 bg-white rounded-3xl shadow-xl shadow-green-900/5 mb-6">
                        {logoComponent}
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        {existingUser ? 'Update Profile' : authMode === 'LOGIN' ? 'Welcome Back' : 'Join Mother Best'}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-3 px-10">
                        {existingUser
                            ? 'Enhance your delivery experience with updated details.'
                            : authMode === 'LOGIN'
                                ? 'Login to access your account and continue shopping.'
                                : 'Create your account and start your journey to pure home care.'}
                    </p>
                </div>

                <Card className="p-0 overflow-hidden border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] bg-white rounded-[2.5rem] animate-scale-in">
                    {/* Error Message */}
                    {error && (
                        <div className="mx-8 mt-8 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-shake flex items-center gap-3">
                            <XCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Auth Mode Switcher */}
                    {!existingUser && (
                        <div className="flex p-1 bg-slate-100/50 rounded-2xl mb-2 mx-8 mt-8 border border-slate-100">
                            <button
                                onClick={() => switchMode('LOGIN')}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'LOGIN'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Already a Member
                            </button>
                            <button
                                onClick={() => switchMode('REGISTER')}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'REGISTER'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Join the Family
                            </button>
                        </div>
                    )}

                    <div className="p-8 md:p-10 space-y-8">
                        {authMode === 'LOGIN' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                                    <button
                                        onClick={handleGoogleLogin}
                                        className="h-12 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Google</span>
                                    </button>

                                    <button
                                        onClick={handleFacebookLogin}
                                        className="h-12 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Facebook</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Profile Picture - Only for REGISTER or EDIT */}
                                {(authMode === 'REGISTER' || existingUser) && (
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white bg-slate-50 shadow-xl flex items-center justify-center relative ring-1 ring-slate-100">
                                                {profilePic ? (
                                                    <img
                                                        src={profilePic}
                                                        className="w-full h-full object-cover"
                                                        alt="Profile"
                                                    />
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
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleAutoCrop(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            {!profilePic && !isProcessingImg && (
                                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 text-white rounded-xl flex items-center justify-center border-4 border-white shadow-lg pointer-events-none">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4 leading-none">
                                            {authMode === 'REGISTER' ? 'Add Your Photo (Optional)' : 'Update Photo'}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Full Name - Only for REGISTER */}
                                    {authMode === 'REGISTER' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                Full Name *
                                            </label>
                                            <div className="relative group">
                                                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                <input
                                                    type="text"
                                                    className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                                                    placeholder="E.g. Rahul Kumar"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Phone Number */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            Phone Number *
                                        </label>
                                        <div className="relative group">
                                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${existingUser ? 'text-slate-400' : 'text-slate-300 group-focus-within:text-green-600'
                                                }`} />
                                            <input
                                                type="tel"
                                                disabled={!!existingUser}
                                                className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 outline-none text-sm font-bold transition-all placeholder:text-slate-200 ${existingUser
                                                    ? 'bg-slate-50 border-slate-50 text-slate-400 cursor-not-allowed'
                                                    : 'border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5'
                                                    }`}
                                                placeholder="E.g. 9876543210"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                maxLength={10}
                                            />
                                        </div>
                                    </div>

                                    {/* Email - Optional for REGISTER */}
                                    {authMode === 'REGISTER' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                Email (Optional)
                                            </label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                <input
                                                    type="email"
                                                    className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                                                    placeholder="E.g. your@email.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            Password *
                                        </label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full pl-11 pr-12 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                                                placeholder={existingUser ? "Current or New Password" : "Create Password (min 6 chars)"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-green-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password - Only for REGISTER */}
                                    {authMode === 'REGISTER' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                Confirm Password *
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className="w-full pl-11 pr-12 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                                                    placeholder="Re-enter Password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-green-600 transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Referral Code - Only for REGISTER */}
                                    {authMode === 'REGISTER' && (
                                        <div className="space-y-2" ref={referralRef}>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                Referral Code (Optional)
                                            </label>
                                            <div className="relative group">
                                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                                                <input
                                                    type="text"
                                                    className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200 uppercase"
                                                    placeholder="E.g. SALES123"
                                                    value={referralCode}
                                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                                    onFocus={() => setIsReferralOpen(true)}
                                                />
                                            </div>
                                            {isReferralOpen && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-medium">
                                                    <p className="font-black mb-1">💡 Got a referral code?</p>
                                                    <p>Enter the code shared by your sales representative to get special benefits!</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 space-y-4">
                                    <Button
                                        fullWidth
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="rounded-2xl h-16 shadow-2xl shadow-green-900/10 text-base font-black uppercase tracking-widest bg-slate-900 hover:bg-black border-none"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-3">
                                                <RotateCw className="w-5 h-5 animate-spin" />
                                                {existingUser ? 'Updating...' : 'Creating Account...'}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {existingUser ? 'Save Changes' : 'Create Account'}
                                                <ArrowRight className="w-5 h-5" />
                                            </div>
                                        )}
                                    </Button>

                                </div>
                            </div>
                        )}
                        <button
                            onClick={onBack}
                            className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                        >
                            Go Back
                        </button>
                    </div>
                </Card>

                <p className="text-center text-slate-300 text-[9px] mt-10 font-black uppercase tracking-[0.3em] font-serif">
                    Pure &bull; Professional &bull; Mother Best
                </p>
            </div >
        </div >
    );
};
