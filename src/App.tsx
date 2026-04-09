import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import { analytics } from './lib/analytics';

declare global {
  interface Window {
    fbq: any;
  }
}

function Tracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
    analytics.pageView(location.pathname);
  }, [location]);

  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Tracker />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/:propertyName/:id" element={<MainLayout />} />
      </Routes>
    </div>
  )
}

export default App
