

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
          onMouseEnter={() => onHover(property.id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(property)}
          className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 p-4 transition-all duration-300 cursor-pointer flex flex-col md:flex-row group"
        >
          {/* Imagem do Card */}
          <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden mb-4 md:mb-0 md:mr-4 shrink-0 relative">
            <img 
              src={property.image_url} 
              alt={property.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>


          {/* Dados do Empreendimento */}
          <div className="flex flex-col justify-between flex-1">
             <div>
                <div className="flex items-center text-xs font-semibold text-imperio-gold-500 mb-1 uppercase tracking-wider">
                  <MapPin className="w-3 h-3 mr-1" /> {property.neighborhood}
                </div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-imperio-blue-800 transition-colors">
                  {property.name}
                </h3>
                {property.company && (
                  <div className="flex items-center text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    <Building2 className="w-3 h-3 mr-1" />
                    {property.company}
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{property.description}</p>
             </div>

             <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
               <div className="flex items-center space-x-3 text-xs text-slate-600 font-medium">
                 <span className="flex items-center"><Bed className="w-3.5 h-3.5 mr-1"/> {property.bedrooms}</span>
                 <span className="flex items-center"><Bath className="w-3.5 h-3.5 mr-1"/> {property.bathrooms}</span>
                 <span className="flex items-center"><Move className="w-3.5 h-3.5 mr-1"/> {property.area}m²</span>
               </div>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
