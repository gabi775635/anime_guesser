import { Router, Route } from '@solidjs/router';
import { lazy } from 'solid-js';
import { ProtectedRoute, AdminRoute, ModRoute } from './components/ProtectedRoute';

// Lazy-load all pages for code splitting
const Auth         = lazy(() => import('./pages/Auth'));
const Home         = lazy(() => import('./pages/Home'));
const Game         = lazy(() => import('./pages/Game'));
const Leaderboard  = lazy(() => import('./pages/Leaderboard'));
const Profile      = lazy(() => import('./pages/Profile'));
const ModAnimes    = lazy(() => import('./pages/ModAnimes'));
const ModReports   = lazy(() => import('./pages/ModReports'));
const AdminUsers   = lazy(() => import('./pages/AdminUsers'));
const AdminServer  = lazy(() => import('./pages/AdminServer'));
const AdminStats   = lazy(() => import('./pages/AdminStats'));

function ProtectedHome()        { return <ProtectedRoute><Home /></ProtectedRoute>; }
function ProtectedGame()        { return <ProtectedRoute><Game /></ProtectedRoute>; }
function ProtectedLeaderboard() { return <ProtectedRoute><Leaderboard /></ProtectedRoute>; }
function ProtectedProfile()     { return <ProtectedRoute><Profile /></ProtectedRoute>; }
function ProtectedModAnimes()   { return <ModRoute><ModAnimes /></ModRoute>; }
function ProtectedModReports()  { return <ModRoute><ModReports /></ModRoute>; }
function ProtectedAdminUsers()  { return <AdminRoute><AdminUsers /></AdminRoute>; }
function ProtectedAdminServer() { return <AdminRoute><AdminServer /></AdminRoute>; }
function ProtectedAdminStats()  { return <AdminRoute><AdminStats /></AdminRoute>; }

export default function App() {
  return (
    <Router>
      <Route path="/auth"          component={Auth} />
      <Route path="/home"          component={ProtectedHome} />
      <Route path="/game"          component={ProtectedGame} />
      <Route path="/leaderboard"   component={ProtectedLeaderboard} />
      <Route path="/profile"       component={ProtectedProfile} />
      <Route path="/mod/animes"    component={ProtectedModAnimes} />
      <Route path="/mod/reports"   component={ProtectedModReports} />
      <Route path="/admin/users"   component={ProtectedAdminUsers} />
      <Route path="/admin/server"  component={ProtectedAdminServer} />
      <Route path="/admin/stats"   component={ProtectedAdminStats} />
      {/* Fallback redirect */}
      <Route path="/"              component={() => { window.location.replace('/home'); return null; }} />
      <Route path="*"              component={() => { window.location.replace('/home'); return null; }} />
    </Router>
  );
}
