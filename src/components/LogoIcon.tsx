import React from 'react';

export const LogoIcon = ({ className = "w-14 h-14", onClick }: { className?: string; onClick?: () => void }) => (
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
