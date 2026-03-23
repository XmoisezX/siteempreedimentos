import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
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
  
  useMemo(() => {
    if (hoveredPropertyId) {
      const property = filteredProperties.find(p => p.id === hoveredPropertyId);
      if (property) {
        map.flyTo([property.lat, property.lng], 14, { duration: 1.5 });
      }
    }
  }, [hoveredPropertyId, map, filteredProperties]);

  return null;
}

export default function PropertyMap({ hoveredPropertyId, category, properties, onSelect }: PropertyMapProps) {
  const filteredProperties = useMemo(() => properties.filter((p) => p.type === category), [category, properties]);

  const activeHoverId = hoveredPropertyId;

  // Custom Marker HTML showing Name - Re-designed to be more eye-catching
  const createCustomIcon = (property: Property, isListHovered: boolean) => {
    const mainBg = isListHovered ? 'bg-imperio-gold-500' : 'bg-imperio-blue-900';
    const scale = isListHovered ? 'scale-125 z-[1000]' : 'scale-100 z-10';
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
        <div class="relative flex flex-col items-center transition-all duration-300 ${isListHovered ? scale : 'group-hover:scale-125 group-hover:z-[1000] scale-100 z-10'}">
          <!-- Pulse Animation -->
          <div class="absolute -inset-1 ${isListHovered ? mainBg : 'bg-imperio-gold-500'} opacity-${isListHovered ? '30' : '0 group-hover:opacity-30'} rounded-full animate-pulse blur-sm transition-opacity"></div>
          
          <!-- Pin Body -->
          <div class="${isListHovered ? mainBg : 'bg-imperio-blue-900 group-hover:bg-imperio-gold-500'} text-white px-4 py-2 rounded-xl font-black shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] mb-1 whitespace-nowrap border-2 border-white/30 uppercase tracking-tight flex flex-col items-center justify-center backdrop-blur-sm min-w-[100px] transition-colors">
            <span class="max-w-[130px] truncate font-sans text-[9px] opacity-80 leading-none mb-1">${property.name}</span>
            <span class="font-extrabold text-white tracking-normal text-[12px] leading-none">${priceStr}</span>
          </div>
          
          <!-- Pin Pointer -->
          <div class="w-3.5 h-3.5 rotate-45 -mt-3 ${isListHovered ? mainBg : 'bg-imperio-blue-900 group-hover:bg-imperio-gold-500'} border-b-2 border-r-2 border-white/30 shadow-2xl transition-colors"></div>
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

              <Popup className="rounded-xl overflow-hidden hidden">
                <div className="p-1 min-w-[150px]">
                   <img src={property.image_url} className="w-full h-24 object-cover rounded-lg mb-2" alt="" loading="lazy" decoding="async" />
                   <h4 className="font-bold text-slate-800 leading-tight mb-1">{property.name}</h4>
                   <p className="text-xs text-slate-500">{property.neighborhood}</p>
                </div>
              </Popup>
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
