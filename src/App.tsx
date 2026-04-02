import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout'

declare global {
  interface Window {
    fbq: any;
  }
}

function PixelTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PixelTracker />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/imovel/:id" element={<MainLayout />} />
      </Routes>
    </div>
  )
}

export default App
