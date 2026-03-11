
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ArrowLeft, ChevronDown, History, Settings, BarChart3, Mail, Phone, Home, LayoutGrid, ShoppingBag, User as UserIcon, Truck, Briefcase, ShieldCheck, Gauge } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { User, Authority } from '../types';
import { storageService } from '../services/storageService';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onGoHome: () => void;
  onNavigate: (view: any) => void;
  onBack?: () => void;
  onEditProfile: () => void;
  onNavigateToSales?: () => void;
  onNavigateToDelivery?: () => void;
  authorities: Authority[];
  hideProfile?: boolean;
}

const LogoIcon = ({ className = "w-12 h-12" }) => (
  <div className={`${className} bg-white rounded-full overflow-hidden border-4 border-green-50 shadow-md flex items-center justify-center shrink-0`}>
    <img
      src="/logo.jpg"
      alt="Logo"
      className="w-full h-full object-cover scale-110"
    />
  </div>
);

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onGoHome, onNavigate, onBack, onEditProfile, onNavigateToSales, onNavigateToDelivery, authorities, hideProfile = false }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const BrandLogo = ({ size = 'normal' }: { size?: 'small' | 'normal' }) => (
    <div
      className="flex items-center gap-3 md:gap-4 cursor-pointer group"
      onClick={onGoHome}
    >
      <div className="shrink-0 transform transition-transform group-hover:scale-105 duration-500">
        <LogoIcon className={size === 'small' ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16 md:w-24 md:h-24"} />
      </div>
      <div className="flex flex-col">
        <h1 className={`font-logo font-bold tracking-tight text-slate-900 leading-none ${size === 'small' ? 'text-xl md:text-2xl' : 'text-3xl md:text-5xl'}`}>Mother Best</h1>
        <p className={`font-black uppercase tracking-[0.3em] text-green-700 mt-0.5 opacity-70 ${size === 'small' ? 'text-[7px] md:text-[8px]' : 'text-[10px] md:text-xs'}`}>Pure & Simple</p>
      </div>
    </div>
  );

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-6 py-4 md:py-5 flex items-center justify-between">
        {user ? (
          <>
            <div className="flex items-center gap-4 md:gap-6">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2.5 text-slate-500 hover:text-green-600 transition-all bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <BrandLogo size="small" />
            </div>

            {!hideProfile && (
              <>
                {/* Notification Bell */}
                <div className="flex items-center gap-2 ml-auto mr-3">
                  <NotificationBell />
                </div>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-green-50/50 px-3 py-1.5 rounded-full border border-green-100 hover:bg-green-100/50 transition-colors"
                  >
                    <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center text-xs text-white font-black overflow-hidden border-2 border-white/50 shadow-md">
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
                    <span className="text-[10px] font-black text-green-800 tracking-tight hidden xs:block">{user.name}</span>
                    <ChevronDown className={`w-3 h-3 text-green-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <ProfileDropdown
                      user={user}
                      onLogout={onLogout}
                      onNavigate={onNavigate}
                      onEditProfile={onEditProfile}
                      onNavigateToSales={onNavigateToSales}
                      onNavigateToDelivery={onNavigateToDelivery}
                      authorities={authorities}
                      onClose={() => setIsDropdownOpen(false)}
                    />
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <BrandLogo />
        )}
      </div>
    </header>
  );
};

interface ProfileDropdownProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: any) => void;
  onEditProfile: () => void;
  onNavigateToSales?: () => void;
  onNavigateToDelivery?: () => void;
  authorities: Authority[];
  onClose: () => void;
  align?: 'left' | 'right';
  showStandardLinks?: boolean;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  onLogout,
  onNavigate,
  onEditProfile,
  onNavigateToSales,
  onNavigateToDelivery,
  authorities,
  onClose,
  align = 'right',
  showStandardLinks = true
}) => {
  return (
    <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-50 overflow-hidden animate-fade-in-up z-[100]`}>
      <div className="p-5 border-b border-slate-50 bg-slate-50/30">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1.5">Connected Household</p>
        <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
        <div className="mt-2.5 space-y-1.5">
          {user.email && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
              <Phone className="w-3 h-3 shrink-0" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      </div>
      <div className="p-2.5">
        {(() => {
          const userAuthorities = (authorities || []).filter(a => a.userId === user.id && a.isActive);
          const roles = userAuthorities.map(a => a.role);
          const isAdmin = user.role === 'admin' || roles.includes('admin') || user.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;
          const isSales = roles.includes('sales') || user.role === 'admin';
          const isDelivery = roles.includes('delivery') || user.role === 'admin';
          const isLogistic = roles.includes('logistic') || user.role === 'admin';

          return (
            <>
              {/* Dashboards Section */}
              {(isAdmin || isSales || isDelivery || isLogistic) && (
                <div className="mb-2">
                  <p className="px-4 py-1.5 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Management</p>
                  {isAdmin && (
                    <DropdownItem
                      icon={<ShieldCheck className="w-4 h-4" />}
                      label="Admin Panel"
                      onClick={() => { window.location.href = '/admin'; onClose(); }}
                    />
                  )}
                  {isSales && onNavigateToSales && (
                    <DropdownItem
                      icon={<Briefcase className="w-4 h-4" />}
                      label="Sales Dashboard"
                      onClick={() => { onNavigateToSales(); onClose(); }}
                    />
                  )}
                  {isDelivery && onNavigateToDelivery && (
                    <DropdownItem
                      icon={<Truck className="w-4 h-4" />}
                      label="Delivery Dashboard"
                      onClick={() => { onNavigateToDelivery(); onClose(); }}
                    />
                  )}
                  {isLogistic && (
                    <DropdownItem
                      icon={<Gauge className="w-4 h-4" />}
                      label="Logistic Dashboard"
                      onClick={() => { window.location.href = '/admin/Logistic'; onClose(); }}
                    />
                  )}
                  <div className="h-px bg-slate-50 my-1.5 mx-3" />
                </div>
              )}

              {showStandardLinks && (
                <DropdownItem icon={<Settings className="w-4 h-4" />} label="Edit Profile" onClick={() => { onEditProfile(); onClose(); }} />
              )}
            </>
          );
        })()}

        <div className="h-px bg-slate-50 my-1.5 mx-3" />
        <DropdownItem icon={<LogOut className="w-4 h-4" />} label="Logout" onClick={() => { onLogout(); onClose(); }} variant="danger" />
      </div>
    </div>
  );
};

const DropdownItem = ({ icon, label, onClick, variant = 'default' }: { icon: React.ReactNode, label: string, onClick: () => void, variant?: 'default' | 'danger' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-green-50 hover:text-green-700'}`}
  >
    <div className={`shrink-0 transition-transform group-hover:scale-110 ${variant === 'danger' ? 'text-red-400' : 'text-slate-400 group-hover:text-green-600'}`}>
      {icon}
    </div>
    <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

// Added style prop to allow animation delays for mapped components
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }> = ({ children, className = '', onClick, style }) => (
  <div
    onClick={onClick}
    style={style}
    className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}> = ({ children, variant = 'primary', onClick, disabled, fullWidth, className = '' }) => {
  const base = "px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-green-700 text-white hover:bg-green-800 active:bg-green-900 shadow-lg shadow-green-100",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 active:bg-black",
    outline: "border-2 border-slate-200 text-slate-800 hover:bg-slate-50 active:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const MobileNav: React.FC<{
  activeView: string;
  onNavigate: (view: any) => void;
  user: User | null;
}> = ({ activeView, onNavigate, user }) => {
  const navItems = [
    { id: 'LANDING', label: 'Home', icon: 'home' },
    { id: 'CHOOSE_PLAN_ITEMS', label: 'Plans', icon: 'check_box' },
    { id: 'ORDER_HISTORY', label: 'Orders', icon: 'receipt_long' },
    { id: user ? 'PROFILE' : 'AUTH', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 pb-6 pt-2 z-[60] md:hidden flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        const isActive = activeView === item.id ||
          (item.id === 'AUTH' && activeView === 'PROFILE_SETUP') ||
          (item.id === 'ORDER_HISTORY' && activeView === 'MANAGE_SUBSCRIPTION');

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 relative group outline-none transition-all ${isActive ? 'text-primary scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
          >
            <div className="flex h-8 items-center justify-center">
              <span className={`material-symbols-outlined text-2xl ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
            </div>
            <span className={`text-[10px] uppercase tracking-wide transition-all ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
