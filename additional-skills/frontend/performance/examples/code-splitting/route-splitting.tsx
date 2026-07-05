import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';

// --- Route-based code splitting ---
// Each route loads its own chunk. Users only download what they visit.
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));

// Heavy feature — loaded on interaction, not on route
const ChartEditor = lazy(() => import('./features/ChartEditor'));

// --- Loading Fallback ---
function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <div className="skeleton skeleton--header" />
      <div className="skeleton skeleton--content" />
      <div className="skeleton skeleton--content" />
    </div>
  );
}

// --- Layout (always in main bundle) ---
function Layout() {
  return (
    <div className="app-layout">
      <nav aria-label="Main navigation">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/profile">Profile</Link>
      </nav>
      <main>
        {/* Suspense wraps all lazy routes */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

// --- Router ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// --- Example: Prefetch on hover (performance optimization) ---
function NavLink({ to, label, importFn }: {
  to: string;
  label: string;
  importFn: () => Promise<unknown>;
}) {
  return (
    <Link
      to={to}
      onMouseEnter={() => importFn()} // prefetch chunk on hover
      onFocus={() => importFn()}       // prefetch on keyboard focus too
    >
      {label}
    </Link>
  );
}

// Usage:
// <NavLink to="/dashboard" label="Dashboard" importFn={() => import('./pages/Dashboard')} />
