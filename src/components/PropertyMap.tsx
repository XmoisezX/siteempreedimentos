import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../data/mockData';
import L from 'leaflet';
import { Bed, Maximize, Bath } from 'lucide-react';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PropertyMapProps {
  hoveredPropertyId: string | null;
  category: 'apartments' | 'houses';
  properties: Property[];
  onSelect: (property: Property) => void;
}

// Component to focus on selected PIN
function MapFlyTo({ hoveredPropertyId, filteredProperties }: { hoveredPropertyId: string | null, filteredProperties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (hoveredPropertyId) {
      const property = filteredProperties.find(p => p.id === hoveredPropertyId);
      if (property) {
        // Aumentado a duration de 1.5 para 3.0 para deixar o movimento da câmera mais lento e suave
        map.flyTo([property.lat, property.lng], 14, { duration: 3.0, easeLinearity: 0.25 });
      }
    }
  }, [hoveredPropertyId, map, filteredProperties]);

  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (container) {
      observer.observe(container);
    }
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function PropertyMap({ hoveredPropertyId, category, properties, onSelect }: PropertyMapProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredProperties = useMemo(() => properties.filter((p) => p.type === category), [category, properties]);

  const activeHoverId = hoveredPropertyId;

  // Custom Marker HTML showing Name - Re-designed to be more eye-catching
  const createCustomIcon = (property: Property, isListHovered: boolean) => {
    const mainBg = isListHovered ? 'bg-imperio-gold-500' : 'bg-imperio-blue-900';
    const scaleClass = isListHovered ? 'scale-125 z-[1000]' : (isMobile ? 'scale-100 z-10' : 'group-hover:scale-125 group-hover:z-[1000] scale-100 z-10');
    const opacityClass = isMobile ? '0' : '0 group-hover:opacity-30';
    const hoverBgClass = isMobile ? 'bg-imperio-blue-900' : 'bg-imperio-blue-900 group-hover:bg-imperio-gold-500';

    const priceValue = property.valor_imovel_construtora || property.price;
    const priceStr = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(priceValue);
    
    return L.divIcon({
      className: 'custom-leaflet-marker group',
      html: `
        <div class="relative flex flex-col items-center transition-all duration-300 ${scaleClass}">
          <!-- Pulse Animation -->
          <div class="absolute -inset-1 ${isListHovered ? mainBg : 'bg-imperio-gold-500'} opacity-${isListHovered ? '30' : opacityClass} rounded-full animate-pulse blur-sm transition-opacity"></div>
          
          <!-- Pin Body -->
          <div class="${isListHovered ? mainBg : hoverBgClass} text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] mb-1 border-2 border-white/30 uppercase tracking-tight flex flex-col items-center justify-center backdrop-blur-sm min-w-[90px] max-w-[130px] md:min-w-[100px] md:max-w-none transition-colors text-center whitespace-normal">
            <span class="w-full font-sans text-[8px] md:text-[9px] opacity-80 leading-tight mb-0.5 md:mb-1 truncate line-clamp-2" style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;">${property.name}</span>
            <span class="font-extrabold text-white tracking-normal text-[10px] md:text-[12px] leading-none whitespace-nowrap">${priceStr}</span>
          </div>
          
          <!-- Pin Pointer -->
          <div class="w-3.5 h-3.5 rotate-45 -mt-3 ${isListHovered ? mainBg : hoverBgClass} border-b-2 border-r-2 border-white/30 shadow-2xl transition-colors"></div>
        </div>
      `,
      iconSize: [140, 75],
      iconAnchor: [70, 65],
    });
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[-31.7654, -52.3376]} 
        zoom={13} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapResizer />
        <MapFlyTo hoveredPropertyId={hoveredPropertyId} filteredProperties={filteredProperties} />

        {filteredProperties.map((property) => {
          const isHovered = activeHoverId === property.id;
          const priceValue = property.valor_imovel_construtora || property.price;
          const priceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(priceValue);
          
          return (
            <Marker
              key={property.id}
              position={[property.lat, property.lng]}
              icon={createCustomIcon(property, isHovered)}
              eventHandlers={{
                click: () => onSelect(property),
              }}
            >
              {!isMobile && (
                <Tooltip 
                  permanent={false} 
                  direction="top" 
                  offset={[0, -45]} 
                  opacity={1}
                  className="custom-property-tooltip p-0 border-none bg-transparent shadow-none hidden md:block pointer-events-none"
                >
                  <div className="bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden w-64 transform transition-all duration-300 scale-in-center">
                  <div className="relative h-32">
                    <img src={property.image_url} className="w-full h-full object-cover" alt={property.name} loading="lazy" decoding="async" />
                    <div className="absolute top-2 right-2 bg-imperio-blue-900 text-white px-2 py-1 rounded-md text-[10px] font-bold shadow-lg">
                      {priceStr}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{property.name}</h4>
                    <p className="text-[10px] text-slate-500 mb-2">{property.neighborhood}</p>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${property.is_ready ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {property.is_ready ? 'Pronto para Morar' : `Entrega: ${property.delivery_date || 'A Definir'}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Bed className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold">{property.bedrooms}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Bath className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold">{property.bathrooms}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Maximize className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold">{property.area}m²</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-tooltip-pane { z-index: 1000 !important; }
        .custom-property-tooltip { 
          background: transparent !important; 
          border: none !important; 
          box-shadow: none !important;
        }
        .leaflet-tooltip-top:before { border-top-color: transparent !important; }
      `}} />
    </div>
  );
}
