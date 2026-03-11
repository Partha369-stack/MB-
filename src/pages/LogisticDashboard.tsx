import React from 'react';
import { User } from '../types';
import AdminDashboard from './AdminDashboard';

interface LogisticDashboardProps {
    user: User;
    onLogout: () => void;
}

const LogisticDashboard: React.FC<LogisticDashboardProps> = ({ user, onLogout }) => {
    return <AdminDashboard user={user} onLogout={onLogout} isStandaloneLogistic={true} />;
};

export default LogisticDashboard;
