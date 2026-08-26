import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import BeneficiaryList from './pages/beneficiaries/BeneficiaryList.jsx';
import BeneficiaryDetail from './pages/beneficiaries/BeneficiaryDetail.jsx';
import SchemeList from './pages/schemes/SchemeList.jsx';
import RiskExplorer from './pages/ai/RiskExplorer.jsx';
import NetworkGraphView from './pages/ai/NetworkGraphView.jsx';
import DistrictHeatmap from './pages/geomap/DistrictHeatmap.jsx';
import Reports from './pages/analytics/Reports.jsx';
import ComplaintPortal from './pages/complaints/ComplaintPortal.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminLogin from './pages/auth/AdminLogin.jsx';
import Applications from './pages/applications/Applications.jsx';
import ApplicationDetail from './pages/applications/ApplicationDetail.jsx';
import MyApplications from './pages/applications/MyApplications.jsx';
import ApplicantDashboard from './pages/applicant/ApplicantDashboard.jsx';
import SchemeDirectory from './pages/applicant/SchemeDirectory.jsx';
import ApplyScheme from './pages/applicant/ApplyScheme.jsx';
import ApplicationVerificationView from './pages/applicant/ApplicationVerificationView.jsx';
import DocumentVerificationLab from './pages/ai/DocumentVerificationLab.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    // Citizens go to their own portal, all other roles to the admin dashboard
    const destination = user.role === 'citizen' ? '/applicant-dashboard' : '/dashboard';
    return <Navigate to={destination} replace />;
  }
  return children;
}


function AppRoutes() {
  const { user, logout } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/admin/login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Authenticated Routes */}
      <Route
        path="/"
        element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />} />
        <Route path="dashboard" element={user?.role === 'admin' ? <AdminDashboard /> : <Dashboard />} />
        <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'district_officer', 'verifying_officer']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="beneficiaries" element={<BeneficiaryList />} />
        <Route path="beneficiaries/:id" element={<BeneficiaryDetail />} />
        <Route path="schemes" element={<SchemeList />} />
        <Route path="applications" element={<Applications />} />
        <Route path="my-applications" element={<MyApplications />} />
        <Route path="applications/:applicationId" element={<ApplicationDetail />} />
        <Route path="applications/:applicationId/verification" element={<ApplicationVerificationView />} />
        <Route path="ai/risk-explorer" element={<RiskExplorer />} />
        <Route path="ai/network-graph" element={<NetworkGraphView />} />
        <Route path="ai/document-verifier" element={<DocumentVerificationLab />} />
        <Route path="ai/document-testing" element={<DocumentVerificationLab />} />
        <Route path="geomap" element={<DistrictHeatmap />} />
        <Route path="analytics" element={<Reports />} />
        <Route path="complaints" element={<ComplaintPortal />} />
        <Route path="admin" element={<ProtectedRoute allowedRoles={['admin', 'district_officer', 'verifying_officer']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/controls" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
        {/* Applicant Portal Routes */}
        <Route path="applicant-dashboard" element={<ApplicantDashboard />} />
        <Route path="scheme-directory" element={<SchemeDirectory />} />
        <Route path="apply/:schemeId" element={<ApplyScheme />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Analytics />
      </BrowserRouter>
    </AuthProvider>
  );
}

