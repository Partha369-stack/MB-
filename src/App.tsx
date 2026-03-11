import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './contexts/AppContext';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ProductHub from './pages/ProductHub';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import AutoDeliveryPage from './pages/AutoDeliveryPage';
import ManageSubscriptionPage from './pages/ManageSubscriptionPage';
import AdminDashboard from './pages/AdminDashboard';
import SalesDashboard from './pages/SalesDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import LogisticDashboard from './pages/LogisticDashboard';
import ProfileMobile from './components/ProfileMobile';
import ChoosePlanItems from './pages/ChoosePlanItems';
import PaymentMethodPage from './pages/PaymentMethodPage';

// Services
import { authService } from './services/authService';

const AppRoutes: React.FC = () => {
  const { view, setView, user, setUser, allAuthorities, isInitializing } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync View state with URL
  useEffect(() => {
    if (location.pathname === '/products' && (view === 'LANDING' || view === 'AUTH')) {
      setView('PRODUCT_HUB');
    } else if (location.pathname === '/' && !['LANDING', 'AUTH'].includes(view)) {
      setView('LANDING');
    }
  }, [location.pathname]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-md flex items-center justify-center shrink-0">
                <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
            </div>
            <p className="text-green-800 font-bold tracking-widest text-sm uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/';
  };

  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminDashboard user={user} onLogout={handleLogout} />
      } />

      <Route path="/sales" element={
        (() => {
          const hasSalesAuth = allAuthorities.some(a => a.userId === user?.id && a.role === 'sales' && a.isActive);
          return (user?.role === 'sales' || user?.role === 'admin' || hasSalesAuth) ? (
            <SalesDashboard user={user!} onLogout={handleLogout} />
          ) : <Navigate to="/" />
        })()
      } />

      <Route path="/delivery" element={
        (() => {
          const hasDeliveryAuth = allAuthorities.some(a => a.userId === user?.id && a.role === 'delivery' && a.isActive);
          return (user?.role === 'delivery' || user?.role === 'admin' || hasDeliveryAuth) ? (
            <DeliveryDashboard user={user!} onLogout={handleLogout} />
          ) : <Navigate to="/" />
        })()
      } />

      {/* Logistic Routes */}
      <Route path="/admin/Logistic" element={
        (() => {
          const hasLogisticAuth = allAuthorities.some(a => a.userId === user?.id && a.role === 'logistic' && a.isActive);
          return (user?.role === 'logistic' || user?.role === 'admin' || hasLogisticAuth) ? (
            <LogisticDashboard user={user!} onLogout={handleLogout} />
          ) : <Navigate to="/" />
        })()
      } />

      {/* Customer Routes */}
      <Route path="/products" element={
        user ? (
          <main>
            {view === 'AUTH' && <AuthPage />}
            {view === 'PRODUCT_HUB' && <ProductHub />}
            {view === 'CHECKOUT' && <CheckoutPage />}
            {view === 'ORDER_SUCCESS' && <OrderSuccessPage />}
            {view === 'ORDER_HISTORY' && <OrderHistoryPage />}
            {view === 'AUTO_DELIVERY_FLOW' && <AutoDeliveryPage />}
            {view === 'MANAGE_SUBSCRIPTION' && <ManageSubscriptionPage />}
            {view === 'PROFILE' && <ProfileMobile user={user} setUser={setUser} onLogout={handleLogout} />}
            {view === 'CHOOSE_PLAN_ITEMS' && <ChoosePlanItems />}
            {view === 'PAYMENT_METHOD' && <PaymentMethodPage />}
            {view === 'LANDING' && <Navigate to="/" replace />}
          </main>
        ) : <Navigate to="/" />
      } />

      <Route path="/" element={
        <main>
          {view === 'LANDING' && <LandingPage />}
          {view === 'AUTH' && <AuthPage />}
          {user && !['LANDING', 'AUTH'].includes(view) && <Navigate to="/products" replace />}
        </main>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-cream selection:bg-green-100">
        <AppRoutes />
      </div>
    </AppProvider>
  );
};

export default App;
