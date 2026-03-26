

import type { Property } from '../data/mockData';
import { MapPin, Bed, Bath, Move, Building2 } from 'lucide-react';

interface PropertyListProps {
  category: 'apartments' | 'houses';
  properties: Property[];
  onHover: (id: string | null) => void;
  onSelect: (property: Property) => void;
}

export default function PropertyList({ category, properties, onHover, onSelect }: PropertyListProps) {
  const filteredProperties = properties.filter((p) => p.type === category);

  return (
    <div className="space-y-4">
      {filteredProperties.map((property) => (
        <div 
          key={property.id}
          onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(property.id)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
          onClick={() => onSelect(property)}
          className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 p-3 md:p-4 transition-all duration-300 cursor-pointer flex flex-row group"
        >
          {/* Imagem do Card */}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden mr-3 md:mr-4 shrink-0 relative">
            <img 
              src={property.image_url} 
              alt={property.name} 
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Dados do Empreendimento */}
          <div className="flex flex-col justify-between flex-1 min-w-0">
             <div>
                <div className="flex items-center text-[10px] md:text-xs font-semibold text-imperio-gold-500 mb-0.5 md:mb-1 uppercase tracking-wider max-md:truncate">
                  <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 shrink-0" /> <span className="max-md:truncate">{property.neighborhood}</span>
                </div>
                <h3 className="text-sm md:text-lg font-bold text-slate-800 leading-tight group-hover:text-imperio-blue-800 transition-colors max-md:truncate">
                  {property.name}
                </h3>
                <div className="flex items-center mt-1 space-x-2">
                  <div className={`px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-tighter max-md:truncate ${property.is_ready ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                    {property.is_ready ? 'Pronto para Morar' : `Entrega: ${property.delivery_date || 'A Definir'}`}
                  </div>
                </div>
                {property.company && (
                  <div className="max-md:hidden flex items-center text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    <Building2 className="w-3 h-3 mr-1" />
                    {property.company}
                  </div>
                )}
                <p className="max-md:hidden text-sm text-slate-500 mt-1 line-clamp-1">{property.description}</p>
             </div>

             <div className="flex max-md:items-end items-center justify-between mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-50">
               <div className="flex items-center space-x-2 md:space-x-3 text-[10px] md:text-xs text-slate-600 font-medium">
                 <span className="flex items-center"><Bed className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1"/> {property.bedrooms}</span>
                 <span className="flex items-center"><Bath className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1"/> {property.bathrooms}</span>
                 <span className="flex items-center"><Move className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1"/> {property.area}m²</span>
               </div>
               
               <div className="flex flex-col items-end shrink-0 ml-2">
                 <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">A partir de</span>
                 <span className="text-xs md:text-sm font-black text-imperio-blue-900 leading-none">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(property.valor_imovel_construtora || property.price)}
                 </span>
               </div>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
