
import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Card, Button } from '../components/Layout';
import { authService } from '../services/authService';

interface AdminLoginProps {
    onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier || !password) {
            setError('Please enter both identifier and passkey.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const success = await authService.adminLogin(identifier, password);
            if (success) {
                onLogin();
            } else {
                setError('Invalid admin credentials.');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="w-40 h-40 mx-auto mb-8 bg-white rounded-full overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center">
                        <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
                    </div>
                    <h2 className="font-serif text-3xl font-black text-slate-900 uppercase tracking-tight">System Admin</h2>
                    <p className="text-slate-400 text-sm font-medium mt-2">Access professional dashboard & management.</p>
                </div>

                <Card className="p-8 md:p-10 border-slate-100 shadow-2xl bg-white/80 backdrop-blur-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Admin ID (Phone/Email)</label>
                            <input
                                type="text"
                                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-slate-900 outline-none text-base font-bold transition-all"
                                placeholder="Enter Username"
                                value={identifier}
                                onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Administrator Passkey</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-5 pr-14 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-slate-900 outline-none text-base font-bold transition-all"
                                    placeholder="Enter Passkey"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                                {error}
                            </p>
                        )}

                        <Button fullWidth type="submit" className="rounded-2xl h-16 bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-200 border-b-4 border-black active:translate-y-1 active:border-b-0 transition-all">
                            Initialize Portal <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </form>
                </Card>

                <p className="text-center mt-10 text-slate-300 text-[9px] font-black uppercase tracking-[0.3em]">
                    Restricted Access Area • Mother Best v2.0
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
