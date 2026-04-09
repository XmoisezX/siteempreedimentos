import { getRotatedBroker } from '../lib/brokers';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { analytics } from '../lib/analytics';

export default function WhatsAppButton() {
  const [loading, setLoading] = useState(false);
  const message = encodeURIComponent('Olá! Gostaria de falar com um especialista sobre os empreendimentos.');

  async function handleWhatsAppClick() {
    analytics.whatsAppFloatingClick();
    setLoading(true);
    try {
      const broker = await getRotatedBroker();
      const whatsappLink = `https://wa.me/${broker.phone}?text=${message}`;
      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error in WhatsApp rotation:', error);
      // Fallback
      window.open(`https://wa.me/5553994445566?text=${message}`, '_blank', 'noopener,noreferrer');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleWhatsAppClick}
      disabled={loading}
      className="hidden md:block fixed bottom-6 right-6 z-[9999] group disabled:opacity-80"
      aria-label="Falar com especialista no WhatsApp"
    >
      {/* Pulse Effect */}
      <div className="absolute inset-0 bg-[#25D366] rounded-full blur-md opacity-40 animate-pulse group-hover:opacity-60 transition-opacity"></div>
      
      {/* Main Button */}
      <div className="relative bg-[#25D366] hover:bg-[#20BE5A] text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-110 flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <svg 
            viewBox="0 0 24 24" 
            className="w-8 h-8 fill-current"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.815 11.815 0 001.594 5.961L0 24l6.117-1.605a11.815 11.815 0 005.925 1.583h.005c6.637 0 12.05-5.414 12.053-12.053a11.82 11.82 0 00-3.58-8.502z"/>
          </svg>
        )}
        
        {/* Tooltip-like Label (Hidden by default, shows on hover) */}
        <div className="absolute right-full mr-4 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-100">
          Falar com Especialista
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border-t border-r border-slate-100 rotate-45"></div>
        </div>
      </div>
    </button>
  );
}
