
import React from 'react';
import { User, Authority } from '../types';
import { ProfileDropdown } from '../components/Layout';

interface LandingPageMobileProps {
    user: User | null;
    onNavigate: (view: any) => void;
    onLogout: () => void;
    authorities: Authority[];
    onNavigateToSales?: () => void;
    onNavigateToDelivery?: () => void;
}

const LandingPageMobile: React.FC<LandingPageMobileProps> = ({ user, onNavigate, onLogout, authorities, onNavigateToSales, onNavigateToDelivery }) => {
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 pb-24 md:hidden">
            <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.filled {
          font-variation-settings: 'FILL' 1;
        }
      `}</style>

            {/* Top Bar */}
            <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-sm flex items-center justify-center shrink-0">
                        <img
                            src="/logo.jpg"
                            alt="Mother Best"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">Mother Best</h2>
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-green-700 opacity-70">Pure & Simple</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center relative" ref={dropdownRef}>
                    <button className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-white dark:bg-slate-800 shadow-sm">
                        <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 font-variation-settings-fill-0">notifications</span>
                    </button>
                    <button
                        onClick={() => {
                            if (user) {
                                setIsProfileOpen(!isProfileOpen);
                            } else {
                                onNavigate('AUTH');
                            }
                        }}
                        className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-white dark:bg-slate-800 shadow-sm overflow-hidden border border-slate-100"
                    >
                        {user ? (
                            <div className="w-full h-full bg-green-700 flex items-center justify-center text-xs text-white font-black">
                                {user.profilePic ? (
                                    <img
                                        src={user.profilePic}
                                        className="w-full h-full object-cover"
                                        alt="Profile"
                                    />
                                ) : (
                                    (user.name || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                        ) : (
                            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">person</span>
                        )}
                    </button>

                    {user && isProfileOpen && (
                        <div className="absolute top-full right-0 mt-2">
                            <ProfileDropdown
                                user={user}
                                authorities={authorities}
                                onLogout={onLogout}
                                onNavigate={onNavigate}
                                onEditProfile={() => onNavigate('PROFILE')}
                                onNavigateToSales={onNavigateToSales}
                                onNavigateToDelivery={onNavigateToDelivery}
                                onClose={() => setIsProfileOpen(false)}
                                showStandardLinks={true}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex p-4">
                <div className="flex w-full flex-col gap-6 items-start bg-primary/10 dark:bg-primary/5 p-6 rounded-lg relative overflow-hidden text-left">
                    <div className="absolute -right-10 -top-10 bg-primary/20 size-40 rounded-full blur-3xl"></div>
                    <div className="flex gap-4 flex-col items-start z-10">
                        <div className="flex flex-col justify-center">
                            <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight tracking-tight">
                                {user ? `Welcome Back, ${user.name.split(' ')[0]}` : 'Welcome Back, Devi'}
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-base font-normal mt-1">Your home is in good hands.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate('PRODUCT_HUB')}
                        className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-primary text-slate-900 text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/30 z-10"
                    >
                        <span className="truncate">Shop Now</span>
                    </button>
                </div>
            </div>

            {/* Value Propositions Grid */}
            <div className="px-4 pt-4">
                <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4 text-left">Our Promise</h3>
                <div className="grid grid-cols-2 gap-3 text-left">
                    <ValueCard icon="shield" title="Toxic Free" desc="Safe for family" />
                    <ValueCard icon="eco" title="Ultra Pure" desc="Highest quality" />
                    <ValueCard icon="volunteer_activism" title="Local Craft" desc="Handmade locally" />
                    <ValueCard icon="local_shipping" title="Trust COD" desc="Pay on delivery" />
                </div>
            </div>

            {/* How it Works Section */}
            <div className="px-4 pt-8">
                <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4 text-left">How it Works</h3>
                <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 rounded-lg p-6 border border-primary/5 text-left">
                    <WorkStep number="1" title="Select Product" desc="Choose from our curated home care range." isLast={false} isMain={true} />
                    <WorkStep number="2" title="Fast Delivery" desc="Our local partners deliver to your door." isLast={false} isMain={false} />
                    <WorkStep number="3" title="Pay & Smile" desc="Simple payment on delivery with a smile." isLast={true} isMain={false} />
                </div>
            </div>

            {/* Founder's Note */}
            <div className="px-4 pt-8">
                <div className="bg-background-dark text-slate-100 rounded-lg p-6 relative overflow-hidden">
                    <div className="flex flex-col gap-6 items-center">
                        <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden shrink-0">
                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200")' }}></div>
                        </div>
                        <div className="flex flex-col text-center">
                            <span className="material-symbols-outlined text-primary text-4xl mb-2 mx-auto">format_quote</span>
                            <p className="text-slate-300 italic text-sm mb-4">"I started Mother Best with one simple goal: to ensure every home has access to products that are as pure as a mother's love."</p>
                            <p className="font-bold text-primary">Mrs. Savita Devi</p>
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Founder, Mother Best</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Testimonial Section */}
            <div className="px-4 pt-8 pb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Voices of Trust</h3>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                        <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-primary/10 shadow-sm text-left">
                    <div className="flex items-center gap-1 mb-3 text-yellow-500">
                        <span className="material-symbols-outlined text-sm filled">star</span>
                        <span className="material-symbols-outlined text-sm filled">star</span>
                        <span className="material-symbols-outlined text-sm filled">star</span>
                        <span className="material-symbols-outlined text-sm filled">star</span>
                        <span className="material-symbols-outlined text-sm filled">star</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm italic mb-4">"The floor cleaner smells divine and it's so reassuring to know it won't harm my toddler who's always crawling around!"</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100")', backgroundSize: 'cover' }}></div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Anjali Sharma</p>
                            <p className="text-[10px] text-slate-500 uppercase">Verified Buyer</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

const ValueCard: React.FC<{ icon: string, title: string, desc: string }> = ({ icon, title, desc }) => (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/10 bg-white dark:bg-slate-800 p-4">
        <div className="text-primary bg-primary/10 w-10 h-10 flex items-center justify-center rounded-full">
            <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex flex-col gap-1">
            <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">{desc}</p>
        </div>
    </div>
);

const WorkStep: React.FC<{ number: string, title: string, desc: string, isLast: boolean, isMain: boolean }> = ({ number, title, desc, isLast, isMain }) => (
    <React.Fragment>
        <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${isMain ? 'bg-primary text-slate-900' : 'bg-primary/30 text-slate-900 dark:text-slate-100'}`}>{number}</div>
            <div className="flex flex-col">
                <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
        </div>
        {!isLast && <div className="w-px h-6 bg-primary/30 ml-4"></div>}
    </React.Fragment>
);

export default LandingPageMobile;
