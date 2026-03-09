import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { LogoIcon } from '../components/LogoIcon';
import {
    Bell,
    User as UserIcon,
    ShieldCheck,
    Briefcase,
    Truck,
    LogOut,
    Shield,
    Droplets,
    Heart,
    Star,
    Home,
    Store,
    ScrollText,
    ArrowRight
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

const LandingPage: React.FC = () => {
    const { view, setView, user, setUser, allAuthorities } = useAppContext();
    const navigate = useNavigate();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setView('LANDING');
        setIsProfileDropdownOpen(false);
    };

    return (
        <div className="bg-[#f6f8f6] font-sans text-slate-900 min-h-screen relative pb-24 selection:bg-green-100">
            {/* Top Bar */}
            <div className="flex items-center bg-[#f6f8f6] p-4 pb-2 justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-10 h-10" />
                    <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">Mother Best</h2>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setView('AUTH')} className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-white shadow-sm hover:bg-slate-50 transition">
                        <Bell className="w-5 h-5 text-slate-700" />
                    </button>
                    <div className="relative" ref={profileDropdownRef}>
                        <button onClick={() => { if (user) { setIsProfileDropdownOpen(!isProfileDropdownOpen); } else { setView('AUTH'); } }} className="flex w-10 h-10 shrink-0 items-center justify-center bg-[#13ec13]/20 rounded-full overflow-hidden border border-[#13ec13]/20 cursor-pointer shadow-sm">
                            {user?.profilePic ? (
                                <div className="bg-center bg-no-repeat bg-cover w-full h-full rounded-full" style={{ backgroundImage: `url("${user.profilePic}")` }}></div>
                            ) : (
                                <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-700 font-bold">{user ? user.name.charAt(0) : <UserIcon className="w-5 h-5 text-green-700" />}</div>
                            )}
                        </button>

                        {user && isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-[60] animate-fade-in-up origin-top-right">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Connected Household</p>
                                    <div>
                                        <p className="text-slate-900 font-bold text-sm truncate">{user.name}</p>
                                        <p className="text-slate-500 font-medium text-xs truncate mt-0.5">{user.email || 'pradhanparthasarthi3@gmail.com'}</p>
                                        <p className="text-slate-500 font-medium text-xs truncate mt-0.5">{user.phone}</p>
                                    </div>
                                </div>
                                <div className="p-2 flex flex-col gap-0.5">
                                    {(() => {
                                        const userAuths = allAuthorities.filter(a => a.userId === user.id && a.isActive);
                                        const roles = userAuths.map(a => a.role);
                                        const isAdmin = user.role === 'admin' || roles.includes('admin') || user.email === 'pradhanparthasarthi3@gmail.com';
                                        const isSales = user.role === 'sales' || roles.includes('sales') || isAdmin;
                                        const isDelivery = user.role === 'delivery' || roles.includes('delivery') || isAdmin;

                                        return (
                                            <>
                                                {(isAdmin || isSales || isDelivery) && (
                                                    <>
                                                        <p className="px-3 py-1.5 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Management</p>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => { setIsProfileDropdownOpen(false); window.location.href = '/admin'; }}
                                                                className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-colors flex items-center gap-3"
                                                            >
                                                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                                                Admin Panel
                                                            </button>
                                                        )}
                                                        {isSales && (
                                                            <button
                                                                onClick={() => { setIsProfileDropdownOpen(false); navigate('/sales'); }}
                                                                className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-colors flex items-center gap-3"
                                                            >
                                                                <Briefcase className="w-4 h-4 text-slate-400" />
                                                                Sales Dashboard
                                                            </button>
                                                        )}
                                                        {isDelivery && (
                                                            <button
                                                                onClick={() => { setIsProfileDropdownOpen(false); navigate('/delivery'); }}
                                                                className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-colors flex items-center gap-3"
                                                            >
                                                                <Truck className="w-4 h-4 text-slate-400" />
                                                                Delivery Dashboard
                                                            </button>
                                                        )}
                                                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}

                                    <button
                                        onClick={() => {
                                            setIsProfileDropdownOpen(false);
                                            setView('PROFILE');
                                        }}
                                        className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <UserIcon className="w-4 h-4 text-slate-400" />
                                        Edit Profile
                                    </button>
                                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <LogOut className="w-4 h-4 text-red-400" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex p-4">
                <div className="flex w-full flex-col gap-6 items-start bg-[#13ec13]/10 p-6 rounded-[1rem] relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 bg-[#13ec13]/20 w-40 h-40 rounded-full blur-3xl"></div>
                    <div className="flex gap-4 flex-col items-start z-10 w-full">
                        <div className="flex flex-col justify-center">
                            <p className="text-slate-900 text-2xl font-bold leading-tight tracking-tight">{user ? `Welcome Back, ${user.name.split(' ')[0]}` : 'Welcome to Mother Best'}</p>
                            <p className="text-slate-600 text-base font-normal mt-1">Your home is in good hands.</p>
                        </div>
                    </div>
                    <button onClick={() => { if (user) { setView('PRODUCT_HUB'); navigate('/products'); } else { setView('AUTH'); } }} className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-[#13ec13] text-slate-900 text-base font-bold leading-normal tracking-wide shadow-lg shadow-[#13ec13]/30 z-10">
                        <span className="truncate">Shop Now</span>
                    </button>
                </div>
            </div>

            {/* Value Propositions Grid */}
            <div className="px-4 pt-4">
                <h3 className="text-slate-900 text-xl font-bold mb-4">Our Promise</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { icon: Shield, title: "Toxic Free", subtitle: "Safe for family" },
                        { icon: Droplets, title: "Ultra Pure", subtitle: "Highest quality" },
                        { icon: Heart, title: "Local Craft", subtitle: "Handmade locally" },
                        { icon: Truck, title: "Trust COD", subtitle: "Pay on delivery" }
                    ].map((prop, i) => (
                        <div key={i} className="flex flex-col gap-3 rounded-xl border border-[#13ec13]/10 bg-white p-4">
                            <div className="text-[#13ec13] bg-[#13ec13]/10 w-10 h-10 flex items-center justify-center rounded-full">
                                <prop.icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h2 className="text-slate-900 text-base font-bold leading-tight">{prop.title}</h2>
                                <p className="text-slate-500 text-xs font-normal">{prop.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How it Works Section */}
            <div className="px-4 pt-8">
                <h3 className="text-slate-900 text-xl font-bold mb-4">How it Works</h3>
                <div className="flex flex-col gap-4 bg-white rounded-xl p-6 border border-[#13ec13]/5">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#13ec13] text-slate-900 rounded-full flex items-center justify-center font-bold">1</div>
                        <div className="flex flex-col">
                            <p className="font-bold text-slate-900">Select Product</p>
                            <p className="text-sm text-slate-500">Choose from our curated home care range.</p>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-[#13ec13]/30 ml-4"></div>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#13ec13]/30 text-slate-900 rounded-full flex items-center justify-center font-bold">2</div>
                        <div className="flex flex-col">
                            <p className="font-bold text-slate-900">Fast Delivery</p>
                            <p className="text-sm text-slate-500">Our local partners deliver to your door.</p>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-[#13ec13]/30 ml-4"></div>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#13ec13]/30 text-slate-900 rounded-full flex items-center justify-center font-bold">3</div>
                        <div className="flex flex-col">
                            <p className="font-bold text-slate-900">Pay & Smile</p>
                            <p className="text-sm text-slate-500">Simple payment on delivery with a smile.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Founder's Note */}
            <div className="px-4 pt-8">
                <div className="bg-[#102210] text-slate-100 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-24 h-24 rounded-full border-2 border-[#13ec13] overflow-hidden shrink-0">
                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuC2Gzt-0SPevWRjqdIv6_VMKOTuLIx3RkSWYar2C3lN9JpbDigPhdU1a1okeDNj4x6k5uKCg-WcvChnaq6uSu5dtUWo6vukS6Hwqp9CAUe9DlM7gMA4zmfD9YFOBQAxh8lzxgJ5835mbZJm7k1m2KXAgxoxt-ZgTcbMmr7pRd4UoXz-B7LKf1YIBZAYiwDAwvyK4gcFqZ3IpMpUXkoDiv8ZDH7bJvKHsf7pZf_6ZCR6XB01kkaPPmQNaVfKbFlb2K-NYN5Ry4GR-11f")` }}></div>
                        </div>
                        <div className="flex flex-col text-center md:text-left">
                            <span className="text-[#13ec13] text-4xl mb-2 mx-auto md:mx-0 font-serif">"</span>
                            <p className="text-slate-300 italic text-sm mb-4">"I started Mother Best with one simple goal: to ensure every home has access to products that are as pure as a mother's love."</p>
                            <p className="font-bold text-[#13ec13]">Mrs. Savita Devi</p>
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Founder, Mother Best</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Testimonial Carousel */}
            <div className="px-4 pt-8 pb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-900 text-xl font-bold">Voices of Trust</h3>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#13ec13]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#13ec13]/20"></div>
                        <div className="w-2 h-2 rounded-full bg-[#13ec13]/20"></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#13ec13]/10 shadow-sm">
                    <div className="flex items-center gap-1 mb-3 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-slate-700 text-sm italic mb-4">"The floor cleaner smells divine and it's so reassuring to know it won't harm my toddler who's always crawling around!"</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCH04quDFiWnBc-TR4zetY1dTBPQnDz-yaJTc8Wx4lM_mQiuEfR8EFBTaS2pFqX5MXlICAm5fJWV4Ds6B6zNaoBQhFBxcHSn0a0Pcm2LdVzO_vLZ_DOhXIHJ3-g5mByzUbqjsUqu8oPz5N1gv9ynlGz1B0fjBR30dquWA3Q3syxaTQq9GTRidVOJAjnEnqO4Y3-f8iO4Xbnzh7t7S9qaoya8A2o5JUD_uyVPcrIT2LfcgZ_CnOHcvTYMrKu9xZJXwP8q9axju25vFVf")` }}></div>
                        <div>
                            <p className="text-xs font-bold text-slate-900">Anjali Sharma</p>
                            <p className="text-[10px] text-slate-500 uppercase">Verified Buyer</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-[#13ec13]/10 bg-[#f6f8f6] px-4 pb-6 pt-2 z-50">
                <div className="flex gap-2 justify-around">
                    <button onClick={() => setView('LANDING')} className="flex flex-col items-center gap-1 text-[#13ec13]">
                        <div className="flex h-8 items-center justify-center">
                            <Home className="w-6 h-6 fill-current" />
                        </div>
                        <p className="text-[10px] font-bold leading-normal tracking-wide">Home</p>
                    </button>
                    <button onClick={() => { if (user) { setView('PRODUCT_HUB'); navigate('/products'); } else { setView('AUTH'); } }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#13ec13] transition">
                        <div className="flex h-8 items-center justify-center">
                            <Store className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-medium leading-normal tracking-wide">Shop</p>
                    </button>
                    <button onClick={() => { if (user) { setView('ORDER_HISTORY'); } else { setView('AUTH'); } }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#13ec13] transition">
                        <div className="flex h-8 items-center justify-center">
                            <ScrollText className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-medium leading-normal tracking-wide">Orders</p>
                    </button>
                    <button onClick={() => { if (user) { setView('PROFILE'); } else { setView('AUTH'); } }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#13ec13] transition">
                        <div className="flex h-8 items-center justify-center">
                            <UserIcon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-medium leading-normal tracking-wide">Profile</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
