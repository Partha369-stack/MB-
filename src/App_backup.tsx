
import React, { useState, useEffect, useRef } from 'react';
import {
  Header,
  Card,
  Button
} from './components/Layout';
import {
  User,
  Product,
  CartItem,
  Frequency,
  Subscription,
  Order,
  Authority
} from './types';
import { PRODUCTS, DELIVERY_DATES, STARTER_PACK } from './constants.tsx';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import {
  ShoppingBag,
  Calendar,
  ArrowRight,
  Plus,
  Minus,
  ChevronRight,
  ShieldCheck,
  Truck,
  Leaf,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ArrowLeft,
  History,
  Check,
  Award,
  Sparkles,
  Pause,
  Play,
  Droplets,
  Sprout,
  Star,
  Shield,
  Home,
  CheckCircle2,
  Package,
  Heart,
  UserCheck,
  ShieldPlus,
  XCircle,
  MapPin,
  RotateCw,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import SalesDashboard from './pages/SalesDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import { ImageCropper } from './components/ImageCropper';

// Brand Logo Component
const LogoIcon = ({ className = "w-14 h-14", onClick }: { className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`${className} bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-sm flex items-center justify-center shrink-0 transition-transform ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
  >
    <img
      src="/logo.jpg"
      alt="Mother Best Logo"
      width="64"
      height="64"
      loading="eager"
      className="w-full h-full object-cover scale-110"
    />
  </div>
);

type View = 'LANDING' | 'AUTH' | 'PRODUCT_HUB' | 'ONE_TIME_ORDER' | 'CHECKOUT' | 'AUTO_DELIVERY_FLOW' | 'MANAGE_SUBSCRIPTION' | 'ORDER_SUCCESS' | 'ORDER_HISTORY';
type AuthStep = 'UNIFIED';

const App: React.FC = () => {
  const [view, setView] = useState<View>('LANDING');
  const [user, setUser] = useState<User | null>(null);

  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authStep, setAuthStep] = useState<AuthStep>('UNIFIED');
  const [authInput, setAuthInput] = useState('');
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [regPhoneVerified, setRegPhoneVerified] = useState(false);
  const [regReferralCode, setRegReferralCode] = useState('');
  const [regProfilePic, setRegProfilePic] = useState<string | undefined>(undefined);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const referralRef = useRef<HTMLDivElement>(null);

  // Shop & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  // Subscription State
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [autoDeliveryStep, setAutoDeliveryStep] = useState(1);
  const [subDraftProducts, setSubDraftProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [subDraftFreq, setSubDraftFreq] = useState<Frequency>(Frequency.MONTHLY);
  const [subDraftDate, setSubDraftDate] = useState<number>(5);

  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return authService.isAdmin();
  });

  // Routing hooks
  const navigate = useNavigate();
  const location = useLocation();

  // AI Face Detection Model Loading
  useEffect(() => {
    const loadModels = async () => {
      try {
        // @ts-ignore
        const faceapi = window.faceapi;
        if (!faceapi) return;

        // Load tiny model for speed and low bandwidth
        const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log("AI Face models loaded");
      } catch (err) {
        console.error("AI Model load failed:", err);
      }
    };
    loadModels();
  }, []);

  // Authority State (for referrals/sales roles)
  const [authorities, setAuthorities] = useState<Authority[]>([]);

  useEffect(() => {
    const fetchAuthorities = async () => {
      const auths = await storageService.getAuthorities();
      setAuthorities(auths);
    };
    fetchAuthorities();
  }, []);

  const handleAutoCrop = (file: File) => {
    if (!file) return;
    setIsProcessingImg(true);
    setAuthError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setAuthError("Failed to read file.");
      setIsProcessingImg(false);
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        setAuthError("Failed to load image.");
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

              // Define a square area centered on the face with padding (2x the face size for context)
              const faceCenterX = x + width / 2;
              const faceCenterY = y + height / 2;
              const cropSize = Math.max(width, height) * 2.5; // Include hair and shoulders

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

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = async () => {
    await authService.logout();
    setIsAdminLoggedIn(false);
  };

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '100px',
      threshold: 0.05
    };

    const handleReveal = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target); // Once revealed, stop observing for better performance
        }
      });
    };

    const observer = new IntersectionObserver(handleReveal, observerOptions);
    const elements = document.querySelectorAll('.animate-reveal, .animate-reveal-horizontal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [view, location.pathname]); // Re-run when view or route changes

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (referralRef.current && !referralRef.current.contains(event.target as Node)) {
        setIsReferralOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    if (location.pathname === '/products' && (view === 'LANDING' || view === 'AUTH')) {
      setView('PRODUCT_HUB');
    }
  }, [location.pathname]); // Only trigger on path change

  useEffect(() => {
    if (location.pathname === '/' && !['LANDING', 'AUTH'].includes(view)) {
      setView('LANDING');
    }
  }, [location.pathname, view]);

  useEffect(() => {
    const init = async () => {
      const savedUser = storageService.getUser();
      if (savedUser) {
        setUser(savedUser);
        await refreshSubs(savedUser.id);
        await refreshOrders(savedUser.id);
      }
    };
    init();
  }, []);

  // Removed automatic redirect for sales users - they can now access both customer website and sales dashboard
  // Sales users will use navigation buttons to switch between views

  const refreshSubs = async (uid: string) => {
    const subs = await storageService.getSubscriptions(uid);
    if (subs.length > 0) setActiveSubscription(subs[0]);
    else setActiveSubscription(null);
  };

  const refreshOrders = async (uid: string) => {
    const orders = await storageService.getOrders(uid);
    setOrderHistory(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };


  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setView('LANDING');
    setAuthStep('UNIFIED');
    setAuthInput('');
    setRegName('');
    setRegAddress('');
    setRegPassword('');
    setRegPhoneVerified(false);
    setRegReferralCode('');
    setRegProfilePic(undefined);
  };

  const handleLogin = async () => {
    if (!authInput) {
      setAuthError("Please enter your phone number.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      // Pass details if available, authService handles the "new vs existing" logic
      const user = await authService.registerOrLogin(authInput, regPassword, regName, regAddress, regPhoneVerified, regReferralCode, regProfilePic);
      if (user) {
        const appUser = storageService.getUser()!;
        setUser(appUser);
        if (appUser.role === 'sales') {
          navigate('/sales');
        } else if (appUser.role === 'delivery') {
          navigate('/delivery');
        } else {
          setView('PRODUCT_HUB');
          await refreshSubs(appUser.id);
          await refreshOrders(appUser.id);
        }
      } else {
        setAuthError("Failed to login or register. Please try again.");
      }
    } catch (error: any) {
      console.error("Login component error:", error);
      // If authService throws "New user detected", we know we need more info
      if (error.message.includes("New user detected")) {
        setAuthError("No profile found. Please fill in details below to join.");
        setAuthMode('REGISTER');
      } else {
        setAuthError(error.message || "Authentication failed. Please check your connection.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) return prev.filter(i => i.product.id !== productId);
        return prev.map(item => item.product.id === productId ? { ...item, quantity: newQty } : item);
      }
      if (delta > 0) {
        const product = PRODUCTS.find(p => p.id === productId)!;
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const handleBack = () => {
    if (view === 'CHECKOUT') setView('ONE_TIME_ORDER');
    else if (view === 'ONE_TIME_ORDER' || view === 'ORDER_HISTORY' || view === 'AUTO_DELIVERY_FLOW' || view === 'MANAGE_SUBSCRIPTION') {
      setView('PRODUCT_HUB');
    }
    else if (view === 'PRODUCT_HUB') {
      setView('LANDING');
      navigate('/');
    }
    else if (view === 'AUTH') {
      if (user) setView('PRODUCT_HUB');
      else navigate('/');
    }
    else if (location.pathname === '/products') {
      setView('LANDING');
      navigate('/');
    }
  };

  const renderLanding = () => (
    <div className="flex flex-col bg-cream min-h-screen overflow-x-hidden">
      <Header
        user={user}
        onLogout={handleLogout}
        onGoHome={() => setView('LANDING')}
        onNavigate={(newView) => setView(newView)}
        onNavigateToSales={() => navigate('/sales')}
        onNavigateToDelivery={() => navigate('/delivery')}
        onEditProfile={() => {
          setAuthStep('UNIFIED');
          setView('AUTH');
          if (user) {
            setAuthInput(user.phone);
            setRegName(user.name);
            setRegAddress(user.address);
            setRegProfilePic(user.profilePic);
            // Find referral code if user was referred
            if (user.referredBy) {
              const referralAuth = authorities.find(a => a.userId === user.referredBy);
              if (referralAuth?.referralCode) {
                setRegReferralCode(referralAuth.referralCode);
              }
            } else {
              setRegReferralCode('');
            }
          }
        }}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:py-32 flex flex-col items-center justify-center px-6 text-center max-w-7xl mx-auto min-h-[70vh]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none -z-10">
          <div className="absolute top-10 left-1/2 w-64 md:w-80 h-64 md:h-80 bg-green-200 rounded-full blur-[60px] animate-float"></div>
          <div className="absolute bottom-10 right-10 w-[250px] md:w-[300px] h-[250px] md:h-[300px] bg-blue-100 rounded-full blur-[80px] animate-float delay-300"></div>
        </div>

        <div className="animate-fade-in-up inline-flex items-center gap-2 bg-green-100/70 text-green-800 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm backdrop-blur-md">
          <Award className="w-3.5 h-3.5" /> Trusted Local Household Champion
        </div>

        <h1 className="animate-fade-in-up delay-100 font-serif text-4xl md:text-7xl text-slate-900 font-black leading-[1.1] mb-6 tracking-tight">
          Care for home,<br />
          <span className="text-green-700 italic relative inline-block">
            pure & simple.
            <svg className="absolute -bottom-1 left-0 w-full h-2 text-green-100 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 10 Q 25 20 50 10 T 100 10" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
          </span>
        </h1>

        <p className="animate-fade-in-up delay-200 text-base md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium px-2">
          Trusted like family, professional cleaning. Valued by local families for pure, toxin-free home care. Made fresh, delivered to your doorstep.
        </p>

        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center px-4 w-full max-w-xs md:max-w-md mx-auto">
          {user ? (
            <Button onClick={() => { setView('PRODUCT_HUB'); navigate('/products'); }} className="h-14 md:h-16 text-base md:text-lg shadow-xl shadow-green-200/40 rounded-xl border-b-2 border-green-800">
              Shop Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => setView('AUTH')} className="h-14 md:h-16 text-base md:text-lg shadow-xl shadow-green-200/40 rounded-xl border-b-2 border-green-800">
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </section>

      {/* Brand Values - Infinite Marquee */}
      <section className="py-12 bg-white border-y border-slate-100 relative overflow-hidden">
        <div className="flex animate-marquee gap-12 items-center">
          {[...Array(2)].map((_, listIdx) => (
            <div key={listIdx} className="flex gap-12 items-center min-w-max">
              {[
                { title: "Toxic Free", desc: "Safe for kids & pets.", icon: Leaf, color: "text-green-700", bg: "bg-green-50" },
                { title: "Ultra Pure", desc: "Potent formulations.", icon: Droplets, color: "text-blue-700", bg: "bg-blue-50" },
                { title: "Local Craft", desc: "Made in our city.", icon: Sprout, color: "text-amber-700", bg: "bg-amber-50" },
                { title: "Trust COD", desc: "Pay on arrival.", icon: ShieldCheck, color: "text-slate-900", bg: "bg-slate-900" }
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-6 px-10 py-4 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-green-200 transition-all hover:scale-105 cursor-default">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${v.bg} ${v.color}`}>
                    <v.icon className={`w-6 h-6 ${v.bg === 'bg-slate-900' ? 'text-white' : ''}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-serif text-lg font-black text-slate-900 leading-none mb-1">{v.title}</h3>
                    <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-cream relative overflow-hidden animate-reveal min-h-[500px]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-serif text-4xl md:text-6xl font-black text-slate-900 leading-tight">Order From Your Home</h2>
            <div className="w-24 h-1.5 bg-green-600 mx-auto mt-6 rounded-full opacity-30"></div>
            <p className="text-slate-500 font-bold mt-4 uppercase text-[11px] tracking-[0.3em]">Purely simple 3-step process</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting Line for Desktop */}
            <div className="hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-green-200 -z-0"></div>

            {[
              { step: "1", title: "Select Product", desc: "Browse our local catalog and choose what fits your home.", icon: ShoppingBag, color: "bg-blue-600" },
              { step: "2", title: "Fast Delivery", desc: "Our local team delivers straight to your door in 24-48 hours.", icon: Truck, color: "bg-green-600" },
              { step: "3", title: "Pay & Smile", desc: "Check your products and pay cash only when fully satisfied.", icon: Star, color: "bg-amber-600" }
            ].map((s, i) => (
              <div key={i} className="group relative z-10 flex flex-col">
                <div className="bg-white p-10 pt-12 rounded-[3.5rem] shadow-2xl shadow-green-900/5 border border-slate-50 transition-all duration-500 hover:shadow-green-900/15 hover:-translate-y-2 w-full flex-grow text-center flex flex-col items-center">

                  {/* Step Number Badge INSIDE */}
                  <div className={`w-14 h-14 ${s.color} text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-${s.color.split('-')[1]}-200 mb-10 transform transition-transform group-hover:scale-110 group-hover:rotate-12 duration-500 border-4 border-white`}>
                    {s.step}
                  </div>

                  <div className={`w-16 h-16 bg-slate-50 ${s.color.replace('bg-', 'text-')} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                    <s.icon className="w-8 h-8" />
                  </div>

                  <h3 className="font-serif text-2xl font-black text-slate-900 mb-4">{s.title}</h3>
                  <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed px-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's Message - Trust Element */}
      <section className="py-24 bg-white relative overflow-hidden min-h-[600px]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 -skew-x-12 translate-x-1/2 -z-10"></div>
        <div className="max-w-6xl mx-auto px-6">
          <Card className="overflow-hidden border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] bg-white text-slate-900 flex flex-col md:flex-row items-stretch rounded-[3rem] animate-reveal">
            <div className="md:w-1/3 bg-slate-100 relative min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600"
                alt="Mother Best Founder"
                width="600"
                height="800"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 z-20">
                <p className="font-serif text-2xl font-black text-white drop-shadow-lg">Mrs. Savita Devi</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-white/90 drop-shadow-md">Owner & Founder</p>
              </div>
            </div>
            <div className="md:w-2/3 p-10 md:p-16 flex flex-col justify-center">
              <ShieldPlus className="w-12 h-12 text-green-600 mb-8" />
              <h2 className="font-serif text-3xl md:text-5xl font-black mb-8 leading-tight text-slate-900">"We create only what we trust for our own home."</h2>
              <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium mb-10">
                Local households deserve the same quality as big cities. My promise to you is pure ingredients, fair prices, and personal service. No chemicals that harm your family or your hands.
              </p>
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Handmade with Care</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Family Proven</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Why Choose Us - Professional */}
      <section className="py-24 md:py-32 bg-white border-y border-slate-50 animate-reveal">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-700 mb-4 px-4 py-1.5 bg-green-50 rounded-full inline-block">Values & Promise</span>
            <h2 className="font-serif text-3xl md:text-5xl font-black text-slate-900 leading-tight">Excellence You Can Trust</h2>
            <p className="text-slate-400 text-sm md:text-base font-medium mt-4 max-w-xl mx-auto">Providing pure, safe, and effective home care solutions with local trust.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-24">
            {[
              { title: "Pure Material", desc: "Pure concentrates, 2x more effective than market brands.", icon: Shield, color: "text-green-700", bg: "bg-green-50" },
              { title: "Family Safe", desc: "Toxic-free formulas safe for kids, pets, and skin.", icon: Heart, color: "text-blue-700", bg: "bg-blue-50" },
              { title: "Local Express", desc: "Direct doorstep delivery within 24-48 hours.", icon: Truck, color: "text-amber-700", bg: "bg-amber-50" },
              { title: "Direct Value", desc: "Premium quality at honest, factory-direct prices.", icon: ShoppingBag, color: "text-slate-900", bg: "bg-slate-100" }
            ].map((p, i) => (
              <div key={i} style={{ transitionDelay: `${i * 150}ms` }} className="animate-reveal group p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:border-green-200 transition-all duration-300">
                <div className={`w-12 h-12 ${p.bg} ${p.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-black text-slate-900 mb-2">{p.title}</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 pt-12 border-t border-slate-50">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-serif font-black text-slate-900">12,000+</span>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Happy Homes</span>
            </div>
            <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-serif font-black text-slate-900">5.0</span>
                <div className="flex mb-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Direct Trust</span>
            </div>
          </div>
        </div>
      </section>

      {/* Satisfaction Shield Section */}
      <section className="py-20 bg-green-700 text-white text-center animate-reveal">
        <div className="max-w-4xl mx-auto px-6">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/20 animate-pulse">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-black mb-6 italic leading-tight">Complete Trust, Total Safety</h2>
          <p className="text-green-100 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
            If you are not happy with the quality, just tell us. We will replace the product or give your money back. Your trust is our biggest prize.
          </p>
          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                if (user) { setView('PRODUCT_HUB'); navigate('/products'); }
                else setView('AUTH');
              }}
              className="bg-white text-green-800 hover:bg-white/90 px-12 py-5 rounded-3xl shadow-2xl shadow-green-900/40 font-black uppercase tracking-widest text-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-green-800/20"
            >
              Try It Today
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials - Infinite Marquee */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="flex items-center gap-3 mb-16 text-center justify-center animate-reveal">
          <div className="h-px w-8 md:w-12 bg-green-500"></div>
          <h2 className="font-serif text-2xl md:text-3xl font-black italic tracking-tight">Voices of Trust</h2>
          <div className="h-px w-8 md:w-12 bg-green-500"></div>
        </div>

        <div className="flex animate-marquee gap-8 items-stretch" style={{ animationDuration: '40s' }}>
          {[...Array(2)].map((_, listIdx) => (
            <div key={listIdx} className="flex gap-8 items-stretch min-w-max">
              {[
                { name: "Rahul V.", review: "The detergent powder is incredible. It actually works better than the big brands I used to buy." },
                { name: "Priya S.", review: "Auto delivery has changed my life. I haven't run out of handwash in 6 months!" },
                { name: "Meena K.", review: "Safe for my kids to be around, and the house smells like fresh pine after cleaning." },
                { name: "Arjun M.", review: "Honest pricing and local care. Finally a brand I can trust without overpaying." },
                { name: "Deepa R.", review: "The floor cleaner is amazing. The fragrance lasts all day and it's non-toxic." }
              ].map((t, i) => (
                <div key={i} className="w-[300px] md:w-[400px] bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-base md:text-lg font-medium leading-relaxed text-slate-300 mb-8 italic">"{t.review}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-700/20 border border-green-500/30 flex items-center justify-center text-[10px] font-black text-green-400">
                      {t.name.charAt(0)}
                    </div>
                    <p className="font-black text-green-400 uppercase text-[10px] tracking-widest">{t.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-slate-950 text-white pt-24 pb-12 px-6 relative overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-8">
              <div className="flex items-center gap-4">
                <LogoIcon className="w-16 h-16" />
                <div className="flex flex-col">
                  <span className="font-logo text-4xl font-bold tracking-tight text-white leading-none">Mother Best</span>
                  <span className="text-[10px] uppercase font-black tracking-[0.3em] text-green-500 mt-1 opacity-80">Pure & Simple</span>
                </div>
              </div>
              <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                We are on a mission to bring premium, safe, and chemical-free home care to every local household. Excellence is our only standard.
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Instagram, color: "hover:text-pink-500" },
                  { icon: Facebook, color: "hover:text-blue-500" }
                ].map((social, i) => (
                  <a key={i} href="#" className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 transition-all hover:bg-white/10 ${social.color} hover:scale-110 border border-white/5`}>
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-green-500">Quick Links</h4>
                <ul className="space-y-4">
                  {['Our Story', 'Safety Standards', 'Local Impact', 'Pricing'].map(link => (
                    <li key={link}>
                      <a href="#" className="text-slate-400 font-bold text-xs hover:text-white transition-colors uppercase tracking-wider block">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-green-500">Support</h4>
                <div className="space-y-4 text-xs font-black uppercase tracking-widest text-slate-400">
                  <p className="flex items-center gap-3 group cursor-pointer hover:text-white transition-colors">
                    <Phone className="w-4 h-4 text-green-500" />
                    +91 987 654 3210
                  </p>
                  <p className="flex items-center gap-3 group cursor-pointer hover:text-white transition-colors">
                    <Mail className="w-4 h-4 text-green-500" />
                    hello@motherbest.in
                  </p>
                </div>
              </div>

              <div className="space-y-6 col-span-2 sm:col-span-1">
                <h4 className="text-sm font-black uppercase tracking-widest text-green-500">Location</h4>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wider">
                  Serving trusted households across the region with pride.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <p>&copy; 2024 Mother Best Local Home Care.</p>
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
              <p>Handcrafted Quality</p>
            </div>
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <a href="/admin" className="hover:text-white transition-colors">Admin Portal</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderProductHub = () => (
    <div className="bg-cream min-h-screen pb-24 selection:bg-green-100">
      <Header
        user={user}
        onLogout={handleLogout}
        onGoHome={() => navigate('/')}
        onNavigate={(newView) => setView(newView)}
        onNavigateToSales={() => navigate('/sales')}
        onNavigateToDelivery={() => navigate('/delivery')}
        onEditProfile={() => {
          setAuthStep('UNIFIED');
          setView('AUTH');
          if (user) {
            setAuthInput(user.phone);
            setRegName(user.name);
            setRegPassword(user.password || '');
            setRegAddress(user.address);
            setRegProfilePic(user.profilePic);
            // Find referral code if user was referred
            if (user.referredBy) {
              const referralAuth = authorities.find(a => a.userId === user.referredBy);
              if (referralAuth?.referralCode) {
                setRegReferralCode(referralAuth.referralCode);
              }
            } else {
              setRegReferralCode('');
            }
          }
        }}
        onBack={handleBack}
      />

      <main className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-12 animate-fade-in-up">
          <p className="text-[10px] font-black uppercase text-green-700 tracking-[0.3em] mb-3">Customer Personal Dashboard</p>
          <h2 className="font-serif text-4xl md:text-5xl font-black text-slate-900 leading-tight">Welcome home, <br />{user?.name}!</h2>
          <div className="w-20 h-1 bg-green-600/20 mt-6 rounded-full"></div>
        </div>

        {/* Exclusive Starter Pack Section */}
        {!orderHistory.some(order => order.items.some(item => item.product.id === 'STARTER-PACK')) && (
          <div className="mb-12 animate-reveal">
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-[3rem] p-1 shadow-2xl shadow-green-900/20 overflow-hidden group">
              <div className="bg-white/5 backdrop-blur-xl p-8 md:p-10 rounded-[2.9rem] flex flex-col md:flex-row items-center gap-10">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2.5rem] overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-700">
                  <img src={STARTER_PACK.imageUrl} className="w-full h-full object-cover" alt="Starter Pack" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-green-400/20 text-green-300 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-green-400/20">
                    <Sparkles className="w-3.5 h-3.5" /> First Order Exclusive
                  </div>
                  <h3 className="text-3xl md:text-4xl font-serif font-black text-white mb-3">The Mother Best Starter Box</h3>
                  <p className="text-green-100/70 font-medium mb-8 max-w-lg leading-relaxed">{STARTER_PACK.description}</p>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-white">
                      <span className="text-[10px] font-black uppercase tracking-widest block opacity-60">Trial Price</span>
                      <span className="text-3xl font-black">Γé╣{STARTER_PACK.price}</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCart([{ product: STARTER_PACK, quantity: 1 }]);
                        setView('CHECKOUT');
                      }}
                      className="!bg-white !text-green-700 hover:!bg-green-50 border-none px-8 h-14 rounded-2xl shadow-xl shadow-green-900/40"
                    >
                      <span className="text-base font-black">Grab This Offer</span>
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Full Catalog Below</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card
            onClick={() => setView('ONE_TIME_ORDER')}
            className="animate-reveal group p-2 overflow-hidden border-none shadow-2xl shadow-blue-900/5 bg-white hover:shadow-blue-900/10 transition-all duration-500 rounded-[2.5rem] cursor-pointer"
          >
            <div className="p-8">
              <div className="bg-blue-600 w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-white mb-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-xl shadow-blue-200">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-serif font-black text-slate-800 mb-4 uppercase tracking-tight">Buy As Needed</h3>
              <p className="text-slate-400 font-medium text-base leading-relaxed mb-8">No strings attached. Buy exactly what you need, anytime you need it. Fresh batches ready.</p>
              <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] border-t border-slate-50 pt-6 group-hover:gap-4 transition-all">
                Shop Products <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>

          {activeSubscription ? (
            <Card
              onClick={() => setView('MANAGE_SUBSCRIPTION')}
              className="animate-reveal delay-100 group p-2 overflow-hidden border-none shadow-2xl shadow-green-900/5 bg-green-50/30 hover:shadow-green-900/10 transition-all duration-500 rounded-[2.5rem] cursor-pointer"
            >
              <div className="p-8">
                <div className="bg-green-700 w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-white mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 shadow-xl shadow-green-200">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-3xl font-serif font-black text-slate-800 uppercase tracking-tight">My Plan</h3>
                  <div className="bg-white px-3 py-1 rounded-full border border-green-100 text-[9px] font-black text-green-700 uppercase tracking-widest">{activeSubscription.status}</div>
                </div>
                <p className="text-slate-500 font-medium text-base mb-8 leading-relaxed">Your professional delivery schedule is active. Managing your routine care has never been easier.</p>
                <div className="flex items-center gap-2 text-green-700 font-black text-[10px] uppercase tracking-[0.2em] border-t border-white/50 pt-6 group-hover:gap-4 transition-all">
                  Manage Delivery <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ) : (
            <Card
              onClick={() => { setAutoDeliveryStep(1); setView('AUTO_DELIVERY_FLOW'); }}
              className="animate-reveal delay-100 group p-2 overflow-hidden border-none shadow-2xl shadow-amber-900/5 bg-amber-50/20 hover:shadow-amber-900/10 transition-all duration-500 rounded-[2.5rem] cursor-pointer border-2 border-dashed border-amber-200/50"
            >
              <div className="p-8">
                <div className="bg-amber-600 w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-white mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 shadow-xl shadow-amber-200">
                  <Package className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-serif font-black text-slate-800 mb-4 uppercase tracking-tight">Set Routine</h3>
                <p className="text-slate-400 font-medium text-base leading-relaxed mb-8">Never run out of pure care. Schedule recurring deliveries and enjoy special member benefits.</p>
                <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-[0.2em] border-t border-amber-100/50 pt-6 group-hover:gap-4 transition-all">
                  Start Membership <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="mt-12 animate-reveal delay-200">
          <button
            onClick={() => setView('ORDER_HISTORY')}
            className="w-full py-6 px-10 rounded-[2rem] bg-white border border-slate-100 flex items-center justify-between group hover:border-green-200 transition-all shadow-xl shadow-slate-200/20"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                <History className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-1">Previous Requests</span>
                <span className="text-lg font-serif font-black text-slate-800 group-hover:text-green-800">Order History</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </main>
    </div>
  );

  const renderAuth = () => (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#FCFBF7] relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-green-100/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[480px] z-10">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-block p-1 bg-white rounded-3xl shadow-xl shadow-green-900/5 mb-6">
            <LogoIcon
              className="w-20 h-20"
              onClick={() => setView('LANDING')}
            />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            {user ? 'Update Profile' : 'Member Access'}
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-3 px-10">
            {user ? 'Enhance your delivery experience with updated details.' : 'Simple, secure access to pure home care solutions.'}
          </p>
        </div>

        <Card className="p-0 overflow-hidden border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] bg-white rounded-[2.5rem] animate-scale-in">
          {authError && (
            <div className="mx-8 mt-8 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-shake flex items-center gap-3">
              <XCircle className="w-4 h-4 shrink-0" />
              {authError}
            </div>
          )}

          {/* Auth Mode Switcher */}
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

          <div className="p-8 md:p-10 space-y-8">
            {/* Profile Pic Section - Only for REGISTER or EDIT */}
            {(authMode === 'REGISTER' || user) && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white bg-slate-50 shadow-xl flex items-center justify-center relative ring-1 ring-slate-100">
                    {regProfilePic ? (
                      <img
                        src={regProfilePic}
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
                  {!regProfilePic && !isProcessingImg && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 text-white rounded-xl flex items-center justify-center border-4 border-white shadow-lg pointer-events-none">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4 leading-none">Identity Photo</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${user ? 'text-slate-400' : 'text-slate-300 group-focus-within:text-green-600'}`} />
                  <input
                    type="tel"
                    disabled={!!user}
                    className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 outline-none text-sm font-bold transition-all placeholder:text-slate-200 ${user ? 'bg-slate-50 border-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5'}`}
                    placeholder="E.g. 9876543210"
                    value={authInput}
                    onChange={(e) => setAuthInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Name Input - Only for REGISTER or EDIT */}
              {(authMode === 'REGISTER' || user) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Household Name</label>
                  <div className="relative group">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                      placeholder="Your Family or Name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-11 pr-12 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
                    placeholder={user ? "Current or New Password" : "Enter Password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
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

              {/* Address Input - Only for REGISTER or EDIT */}
              {(authMode === 'REGISTER' || user) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
                    <textarea
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold min-h-[100px] transition-all resize-none placeholder:text-slate-200"
                      placeholder="Building, Street, Area details..."
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Referral Section - Compact Dropdown - Only for REGISTER or EDIT */}
              {(authMode === 'REGISTER' || user) && (
                <div className="pt-2">
                  <div className="relative" ref={referralRef}>
                    <div
                      onClick={() => setIsReferralOpen(!isReferralOpen)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${isReferralOpen ? 'border-amber-500 bg-white shadow-lg shadow-amber-900/5' : 'border-slate-50 bg-slate-50/50 hover:border-amber-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className={`w-4 h-4 ${regReferralCode ? 'text-amber-500' : 'text-slate-300'}`} />
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${regReferralCode ? 'text-slate-900' : 'text-slate-300'}`}>
                            {regReferralCode || 'Referral Code (Optional)'}
                          </span>
                          {regReferralCode && (
                            <span className="text-[9px] font-black uppercase text-amber-600 tracking-tight">
                              Partner: {authorities.find(a => a.referralCode === regReferralCode)?.userName || 'Sales Staff'}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isReferralOpen ? 'rotate-90 text-amber-500' : ''}`} />
                    </div>

                    {isReferralOpen && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-slate-100 z-50 py-2 animate-fade-in-up max-h-[200px] overflow-y-auto overflow-x-hidden">
                        <div
                          onClick={() => { setRegReferralCode(''); setIsReferralOpen(false); }}
                          className="px-5 py-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                        >
                          <span className="text-xs font-bold text-slate-400">None / Clear</span>
                          <Check className={`w-4 h-4 text-slate-200 ${!regReferralCode ? 'text-green-600' : 'opacity-0'}`} />
                        </div>

                        {authorities
                          .filter(a => a.role === 'sales' && a.referralCode && a.isActive)
                          .map((a) => (
                            <div
                              key={a.id}
                              onClick={() => { setRegReferralCode(a.referralCode!); setIsReferralOpen(false); }}
                              className={`px-5 py-3.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between group transition-colors border-t border-slate-50/50 ${regReferralCode === a.referralCode ? 'bg-amber-50/50' : ''}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{a.referralCode}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 mt-0.5">{a.userName}</span>
                              </div>
                              {regReferralCode === a.referralCode && <Check className="w-4 h-4 text-amber-600" />}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-4">
              <Button
                fullWidth
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="rounded-2xl h-16 shadow-2xl shadow-green-900/10 text-base font-black uppercase tracking-widest bg-slate-900 hover:bg-black border-none"
              >
                {isLoggingIn ? (
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-5 h-5 animate-spin" /> {user ? 'Updating...' : 'Accessing...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {user ? 'Save Changes' : (authMode === 'LOGIN' ? 'Member Login' : 'Create Account')} <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>

              <button
                onClick={handleBack}
                className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                Go Back
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-slate-300 text-[9px] mt-10 font-black uppercase tracking-[0.3em] font-serif">
          Pure &bull; Professional &bull; Mother Best
        </p>
      </div >
    </div >
  );

  const renderOneTimeOrder = () => {
    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
      <div className="bg-cream min-h-screen pb-44 selection:bg-green-100">
        <Header
          user={user}
          onLogout={handleLogout}
          onGoHome={() => navigate('/')}
          onNavigate={(newView) => setView(newView)}
          onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }}
          onBack={handleBack}
        />

        <main className="max-w-5xl mx-auto px-6 pt-12">
          {/* Page Hero */}
          <div className="mb-16 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" /> Fresh Batch Available
            </div>
            <h2 className="font-serif text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-4">The Collection</h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl">Pure, safe, and powerful home care solutions. Handcrafted locally for your family's health.</p>
          </div>

          {/* Compact 2-Column Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-8 pt-4">
            {PRODUCTS.map((product, idx) => {
              const cartItem = cart.find(i => i.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className="animate-reveal group"
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <Card className="p-0 overflow-hidden border-none shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-500 rounded-[1.5rem] md:rounded-[2.5rem] bg-white h-full flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-2 left-2 md:top-4 md:left-4">
                        <span className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm border border-white/20">
                          {product.unit}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 md:p-6 flex-grow flex flex-col">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 mb-2 md:mb-4">
                        <h3 className="font-serif text-sm md:text-xl font-black text-slate-900 leading-tight uppercase tracking-tight group-hover:text-green-800 transition-colors truncate">{product.name}</h3>
                        <p className="text-sm md:text-xl font-black text-green-700">Γé╣{product.price}</p>
                      </div>

                      <p className="hidden md:block text-slate-400 text-[11px] font-medium leading-relaxed mb-4 flex-grow">
                        Handcrafted for safety and high performance.
                      </p>

                      <div className="mt-auto">
                        {cartItem ? (
                          <div className="flex items-center justify-between bg-slate-50 p-1 md:p-2 rounded-xl md:rounded-2xl border border-slate-100">
                            <button
                              onClick={() => updateCartQuantity(product.id, -1)}
                              className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100"
                            >
                              <Minus className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <span className="font-black text-xs md:text-lg text-slate-900">{cartItem.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(product.id, 1)}
                              className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 text-green-700 hover:bg-green-50 transition-all border border-slate-100"
                            >
                              <Plus className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            fullWidth
                            className="h-9 md:h-12 rounded-xl shadow-md md:shadow-lg shadow-green-100/50 group/btn font-black uppercase tracking-widest text-[8px] md:text-[10px]"
                            onClick={() => updateCartQuantity(product.id, 1)}
                          >
                            Add <Plus className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </main>

        {/* Professional Checkout Bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50 animate-fade-in-up">
            <div className="bg-slate-900 text-white p-4 pr-4 pl-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 flex items-center justify-between border border-white/10 backdrop-blur-xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{cartCount} items in basket</span>
                <span className="text-2xl font-black text-green-400">Γé╣{total}</span>
              </div>
              <Button
                variant="primary"
                className="h-14 px-8 rounded-full bg-green-600 hover:bg-green-500 text-sm md:text-base border-none shadow-none"
                onClick={() => setView('CHECKOUT')}
              >
                Checkout <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCheckout = () => {
    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    return (
      <div className="bg-cream min-h-screen pb-40">
        <Header
          user={user}
          onLogout={handleLogout}
          onGoHome={() => navigate('/')}
          onNavigate={(newView) => setView(newView)}
          onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }}
          onBack={handleBack}
        />
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="font-serif text-3xl font-black text-slate-900">Confirm Order</h2>
          </div>
          <Card className="p-6 md:p-8 animate-fade-in-up">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Summary</p>
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center text-sm md:text-base">
                  <div className="flex items-center gap-3">
                    <img src={item.product.imageUrl} className="w-8 h-8 rounded object-cover" />
                    <span className="font-bold">{item.product.name} x{item.quantity}</span>
                  </div>
                  <span className="font-black">Γé╣{item.product.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-slate-50 pt-4 flex justify-between items-center">
                <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Final Amount</span>
                <span className="font-black text-2xl text-green-700">Γé╣{total}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-50 bg-blue-50/20 mt-6">
            <div className="flex items-start gap-4">
              <Truck className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-sm text-blue-900">Delivery Address</h4>
                <p className="text-sm text-blue-700 font-medium mt-1">{user?.address}</p>
              </div>
            </div>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t safe-bottom z-50">
            <Button fullWidth variant="secondary" className="h-14 md:h-16 text-base md:text-lg rounded-xl" onClick={async () => {
              const order: Omit<Order, 'id' | 'createdAt'> = {
                userId: user!.id,
                items: cart,
                total: total,
                deliveryDate: 'Scheduled',
                status: 'pending',
                paymentMethod: 'COD'
              };
              await storageService.saveOrder(order);

              // Fetch the newly created order to get the OTP
              const allOrders = await storageService.getAllOrders();
              const createdOrder = allOrders.find(o => o.userId === user!.id && o.total === total);
              if (createdOrder) {
                setLastCreatedOrder(createdOrder);
              }

              await refreshOrders(user!.id);
              setCart([]);
              setView('ORDER_SUCCESS');
            }}>Place COD Order</Button>
          </div>
        </main>
      </div>
    );
  };

  const renderOrderHistory = () => (
    <div className="bg-cream min-h-screen pb-24">
      <Header
        user={user}
        onLogout={handleLogout}
        onGoHome={() => navigate('/')}
        onNavigate={(newView) => setView(newView)}
        onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }}
        onBack={handleBack}
      />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="font-serif text-3xl font-black text-slate-900">My Past Orders</h2>
        </div>
        {orderHistory.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 animate-fade-in">
            <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No orders yet.</p>
            <Button variant="outline" className="mt-6 mx-auto rounded-xl h-12" onClick={() => setView('ONE_TIME_ORDER')}>Explore Catalog</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orderHistory.map((order, idx) => (
              <Card key={order.id} className="p-6 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID: {order.id}</p>
                    <p className="font-bold text-slate-800 text-sm md:text-base">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest shadow-sm ${order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>{order.status}</div>
                </div>

                {/* Show OTP for pending orders */}
                {order.status === 'pending' && order.deliveryOTP && (
                  <div className="mb-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-4 border-2 border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-blue-700">Delivery OTP</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 mb-2">
                      <div className="text-4xl font-black text-slate-900 tracking-[0.3em] text-center">
                        {order.deliveryOTP}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2">
                      <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-800 font-bold">
                        Share this code with delivery person when your order arrives
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                  <span className="text-xs text-slate-500 font-medium">{order.items.length} Products</span>
                  <span className="font-black text-green-700 text-lg">Γé╣{order.total}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderOrderSuccess = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-screen bg-cream">
      <div className="bg-white w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl flex items-center justify-center mb-10 animate-fade-in-up">
        <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-green-600" />
      </div>
      <h2 className="font-serif text-4xl md:text-5xl font-black text-slate-900 mb-4">Confirmed!</h2>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto text-lg md:text-xl font-bold leading-relaxed">
        Your request has been received. We'll call you shortly to confirm the details.
      </p>

      {lastCreatedOrder?.deliveryOTP && (
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 max-w-md w-full border-2 border-green-100">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-black uppercase tracking-widest text-green-700">Delivery OTP</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Share this code with delivery person to confirm delivery
          </p>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 mb-4">
            <div className="text-6xl font-black text-slate-900 tracking-[0.3em] text-center">
              {lastCreatedOrder.deliveryOTP}
            </div>
          </div>
          <div className="flex items-start gap-2 text-left bg-amber-50 rounded-xl p-4">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-bold">
              Keep this OTP safe. Only share it when you receive your order.
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-xs">
        <Button fullWidth className="h-14 md:h-16 rounded-xl shadow-xl shadow-green-100" onClick={() => setView('PRODUCT_HUB')}>Return to Dashboard</Button>
      </div>
    </div>
  );

  const renderAutoDeliveryFlow = () => {
    if (autoDeliveryStep === 1) {
      return (
        <div className="bg-cream min-h-screen pb-44">
          <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }} onBack={handleBack} />
          <main className="max-w-2xl mx-auto px-6 py-12">
            <div className="mb-10 animate-fade-in-up">
              <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">Choose Plan Items</h2>
              <p className="text-slate-500 font-medium mt-2">Select items for your regular monthly shipment.</p>
            </div>
            <div className="space-y-4">
              {PRODUCTS.map((product, idx) => {
                const draft = subDraftProducts.find(p => p.productId === product.id);
                const qty = draft ? draft.quantity : 0;
                return (
                  <Card key={product.id} className="p-5 animate-fade-in-up" style={{ animationDelay: `${idx * 70}ms` }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <img src={product.imageUrl} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                        <div>
                          <h3 className="font-black text-slate-800 text-sm md:text-base">{product.name}</h3>
                          <p className="text-green-700 font-black text-sm">Γé╣{product.price} / {product.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty === 0 ? (
                          <button
                            onClick={() => {
                              setSubDraftProducts(prev => [...prev, { productId: product.id, quantity: 1 }]);
                            }}
                            className="px-6 py-2 bg-green-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-green-800 shadow-lg shadow-green-100 transition-all flex items-center gap-2 active:scale-95"
                          >
                            Add <Plus className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => {
                              setSubDraftProducts(prev => {
                                const existing = prev.find(p => p.productId === product.id);
                                if (existing) {
                                  if (existing.quantity === 1) return prev.filter(p => p.productId !== product.id);
                                  return prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity - 1 } : p);
                                }
                                return prev;
                              });
                            }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-black text-base w-5 text-center">{qty}</span>
                            <button onClick={() => {
                              setSubDraftProducts(prev => {
                                const existing = prev.find(p => p.productId === product.id);
                                if (existing) return prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p);
                                return [...prev, { productId: product.id, quantity: 1 }];
                              });
                            }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 text-green-700"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </main>
          {subDraftProducts.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t z-50 animate-fade-in-up">
              <Button fullWidth onClick={() => setAutoDeliveryStep(2)}>Next: Schedule Delivery <ArrowRight className="w-5 h-5 ml-2" /></Button>
            </div>
          )}
        </div>
      );
    }
    if (autoDeliveryStep === 2) {
      return (
        <div className="bg-cream min-h-screen pb-44">
          <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }} onBack={() => setAutoDeliveryStep(1)} />
          <main className="max-w-2xl mx-auto px-6 py-12">
            <div className="mb-10 animate-fade-in-up">
              <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">Delivery Schedule</h2>
              <p className="text-slate-500 font-medium mt-2">When should we bring your fresh batch?</p>
            </div>
            <Card className="p-7 space-y-8 animate-fade-in-up">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Frequency</p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(Frequency).map(f => (
                    <button
                      key={f}
                      onClick={() => setSubDraftFreq(f)}
                      className={`py-5 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all shadow-sm ${subDraftFreq === f ? 'border-green-700 bg-green-50 text-green-700 shadow-green-100' : 'border-slate-50 text-slate-400 bg-white'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Which day of the month?</p>
                <div className="grid grid-cols-3 gap-4">
                  {DELIVERY_DATES.map(d => (
                    <button
                      key={d}
                      onClick={() => setSubDraftDate(d)}
                      className={`py-5 rounded-2xl border-2 font-black text-lg transition-all shadow-sm ${subDraftDate === d ? 'border-green-700 bg-green-50 text-green-700 shadow-green-100' : 'border-slate-50 text-slate-400 bg-white'}`}
                    >
                      {d}th
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <div className="mt-10 animate-fade-in-up delay-100">
              <Button fullWidth variant="primary" className="h-16 rounded-xl" onClick={async () => {
                const sub: Omit<Subscription, 'id' | 'createdAt'> = {
                  userId: user!.id,
                  products: subDraftProducts,
                  frequency: subDraftFreq,
                  deliveryDate: subDraftDate,
                  status: 'active'
                };
                await storageService.saveSubscription(sub);
                await refreshSubs(user!.id);
                setView('ORDER_SUCCESS');
              }}>Confirm Membership</Button>
              <p className="text-center text-[10px] font-black text-slate-300 uppercase mt-4 tracking-widest">No advance payment needed. COD on every delivery.</p>
            </div>
          </main>
        </div>
      );
    }
    return null;
  };

  const renderManageSubscription = () => {
    if (!activeSubscription) return null;
    return (
      <div className="bg-cream min-h-screen pb-24">
        <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => { setAuthStep('UNIFIED'); setView('AUTH'); if (user) { setAuthInput(user.phone); setRegName(user.name); setRegPassword(user.password || ''); setRegAddress(user.address); } }} onBack={handleBack} />
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="mb-10 animate-fade-in-up">
            <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">My Membership</h2>
          </div>
          <Card className="p-7 md:p-9 animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</span>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit shadow-sm ${activeSubscription.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                  {activeSubscription.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule</span>
                <p className="text-sm font-black text-slate-700 uppercase">{activeSubscription.frequency} ({activeSubscription.deliveryDate}th)</p>
              </div>
            </div>
            <div className="space-y-4 mb-10 border-t border-slate-50 pt-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Included Items</p>
              {activeSubscription.products.map(p => {
                const product = PRODUCTS.find(prod => prod.id === p.productId);
                return (
                  <div key={p.productId} className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-base">{product?.name}</span>
                    <span className="font-black text-slate-400">x{p.quantity}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-4">
              <Button fullWidth variant="outline" className="h-14 rounded-2xl border-slate-200 hover:border-green-600 hover:text-green-700" onClick={async () => {
                const newStatus = activeSubscription.status === 'active' ? 'paused' as const : 'active' as const;
                await storageService.updateSubscription({ id: activeSubscription.id, status: newStatus });
                setActiveSubscription({ ...activeSubscription, status: newStatus });
              }}>
                {activeSubscription.status === 'active' ? 'Pause Membership' : 'Resume Membership'}
              </Button>
              <Button fullWidth variant="danger" onClick={async () => {
                if (window.confirm('Are you sure you want to cancel your membership?')) {
                  await storageService.deleteSubscription(activeSubscription.id);
                  setActiveSubscription(null);
                  setView('PRODUCT_HUB');
                }
              }}
              >
                Cancel Membership
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  };

  useEffect(() => {
    setIsAdminLoggedIn(authService.isAdmin());
  }, [user]);

  const handleSalesLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/');
  };

  const handleDeliveryLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cream selection:bg-green-100">
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminDashboard onLogout={handleAdminLogout} />
        } />

        <Route path="/sales" element={
          user?.role === 'sales' ? (
            <SalesDashboard onLogout={handleSalesLogout} />
          ) : <Navigate to="/" />
        } />

        <Route path="/delivery" element={
          user?.role === 'delivery' ? (
            <DeliveryDashboard onLogout={handleDeliveryLogout} />
          ) : <Navigate to="/" />
        } />


        {/* Customer Routes */}
        <Route path="/products" element={
          user ? (
            <main>
              {view === 'AUTH' && renderAuth()}
              {view === 'PRODUCT_HUB' && renderProductHub()}
              {view === 'ONE_TIME_ORDER' && renderOneTimeOrder()}
              {view === 'CHECKOUT' && renderCheckout()}
              {view === 'ORDER_SUCCESS' && renderOrderSuccess()}
              {view === 'ORDER_HISTORY' && renderOrderHistory()}
              {view === 'AUTO_DELIVERY_FLOW' && renderAutoDeliveryFlow()}
              {view === 'MANAGE_SUBSCRIPTION' && renderManageSubscription()}
              {view === 'LANDING' ? <div className="h-screen bg-cream animate-pulse" /> : null}
            </main>
          ) : <Navigate to="/" />
        } />

        <Route path="/" element={
          <main>
            {view === 'LANDING' && renderLanding()}
            {view === 'AUTH' && renderAuth()}
            {/* Redirect only if user is logged in but NOT on landing/auth and somehow on the root path without an explicit "LANDING" view state */}
            {user && !['LANDING', 'AUTH'].includes(view) && <Navigate to="/products" replace />}
          </main>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
