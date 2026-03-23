import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Property } from '../../data/mockData';
import { X, Upload, CheckCircle2, Loader2, FileUp, Plus, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import imageCompression from 'browser-image-compression';

const formatCurrency = (value: string | number) => {
  if (value === '' || value === null || value === undefined) return '';
  const numericValue = String(value).replace(/\D/g, '');
  if (!numericValue) return '';
  const number = Number(numericValue) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(number);
};

const parseCurrency = (value: string | number) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(value.replace(/\D/g, '')) / 100;
};

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PropertyFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingProperty?: Property;
}

// Subcomponent to update map center when coordinates change
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
}

// Subcomponent to handle map clicks and marker drag
function LocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PropertyForm({ onClose, onSuccess, editingProperty }: PropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const [formData, setFormData] = useState({
    name: editingProperty?.name || '',
    type: editingProperty?.type || 'apartments',
    neighborhood: editingProperty?.neighborhood || '',
    address: editingProperty?.address || '',
    zip_code: editingProperty?.zip_code || '',
    price: editingProperty?.price ? formatCurrency(editingProperty.price.toFixed(2).replace('.', '')) : '',
    lat: editingProperty?.lat || -31.7654,
    lng: editingProperty?.lng || -52.3376,
    description: editingProperty?.description || '',
    bedrooms: editingProperty?.bedrooms || '',
    bathrooms: editingProperty?.bathrooms || '',
    area: editingProperty?.area || '',
    company: editingProperty?.company || '',
    valor_avaliacao_caixa: editingProperty?.valor_avaliacao_caixa ? formatCurrency(editingProperty.valor_avaliacao_caixa.toFixed(2).replace('.', '')) : '',
    valor_imovel_construtora: editingProperty?.valor_imovel_construtora ? formatCurrency(editingProperty.valor_imovel_construtora.toFixed(2).replace('.', '')) : '',
    parcelas_entrada: editingProperty?.parcelas_entrada || '',
    delivery_date: editingProperty?.delivery_date || '',
    is_ready: editingProperty?.is_ready || false,
    porta_de_entrada: editingProperty?.porta_de_entrada !== false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    const { data } = await supabase.from('companies').select('*').order('name');
    if (data) setCompanies(data);
  }

  async function handleCepBlur() {
    const cep = formData.zip_code.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        const newAddress = data.logradouro;
        const newNeighborhood = data.bairro;
        
        setFormData(prev => ({
          ...prev,
          address: newAddress,
          neighborhood: newNeighborhood,
        }));
        
        // Auto-search coordinates
        handleSearchAddress(newAddress, newNeighborhood, cep);
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
    } finally {
      setFetchingCep(false);
    }
  }

  async function handleSearchAddress(customAddress?: string, customNeighborhood?: string, customCep?: string) {
    const address = customAddress || formData.address;
    const neighborhood = customNeighborhood || formData.neighborhood;
    const cep = customCep || formData.zip_code;

    if (!address && !cep) return;
    
    setSearchingAddress(true);
    try {
      const queryParts = [];
      if (address) queryParts.push(address);
      if (neighborhood) queryParts.push(neighborhood);
      if (cep) queryParts.push(cep);
      queryParts.push('Pelotas, RS, Brazil');
      
      const query = queryParts.join(', ');
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }));
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    } finally {
      setSearchingAddress(false);
    }
  }

  async function uploadFile(file: File, bucket: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('O bucket "property-assets" não foi encontrado no Supabase. Por favor, crie-o no painel do Supabase -> Storage.');
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async function handleAddCompany() {
    if (!newCompanyName.trim()) return;
    setAddingCompany(true);
    const { data, error } = await supabase.from('companies').insert([{ name: newCompanyName.trim() }]).select();
    if (error) alert('Erro ao cadastrar construtora: ' + error.message);
    else {
      setCompanies(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, company: data[0].name }));
      setNewCompanyName('');
      setShowNewCompany(false);
    }
    setAddingCompany(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let image_url = editingProperty?.image_url;
      let pdf_url = editingProperty?.pdf_url;

      if (imageFile) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8
        };
        try {
          const compressedImage = await imageCompression(imageFile, options);
          image_url = await uploadFile(compressedImage, 'property-assets');
        } catch (error) {
          console.error("Erro na compressão de imagem", error);
          image_url = await uploadFile(imageFile, 'property-assets'); // fallback
        }
      }

      if (pdfFile) pdf_url = await uploadFile(pdfFile, 'property-assets');

      const propertyData = {
        ...formData,
        price: parseCurrency(formData.price),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area: Number(formData.area),
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        valor_avaliacao_caixa: parseCurrency(formData.valor_avaliacao_caixa),
        valor_imovel_construtora: parseCurrency(formData.valor_imovel_construtora),
        parcelas_entrada: Number(formData.parcelas_entrada),
        delivery_date: formData.is_ready ? null : formData.delivery_date,
        is_ready: Boolean(formData.is_ready),
        porta_de_entrada: Boolean(formData.porta_de_entrada),
        image_url,
        pdf_url,
      };

      if (editingProperty) {
        const { error } = await supabase.from('properties').update(propertyData).eq('id', editingProperty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert([propertyData]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col scale-in-center">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingProperty ? 'Editar Empreendimento' : 'Novo Empreendimento'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Lado Esquerdo: Dados */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informações Básicas</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nome do Empreendimento</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Tipo</label>
                      <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer">
                        <option value="apartments">Apartamento</option>
                        <option value="houses">Casa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Área (m²)</label>
                      <input type="number" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Quartos</label>
                      <input type="number" value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Banheiros</label>
                      <input type="number" value={formData.bathrooms} onChange={e => setFormData({ ...formData, bathrooms: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Valor de Avaliação (Caixa)</label>
                      <input type="text" value={formData.valor_avaliacao_caixa} onChange={e => setFormData({ ...formData, valor_avaliacao_caixa: formatCurrency(e.target.value) })} className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-900" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Valor do Empreendimento</label>
                      <input type="text" value={formData.valor_imovel_construtora} onChange={e => setFormData({ ...formData, valor_imovel_construtora: formatCurrency(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Parcelamento da Entrada (Sem Juros)</label>
                      <input type="number" value={formData.parcelas_entrada} onChange={e => setFormData({ ...formData, parcelas_entrada: e.target.value })} placeholder="Ex: 24, 36, 60..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-emerald-700" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight flex items-center justify-between">
                         <span>Prazo de Entrega</span>
                         <label className="flex items-center space-x-1 cursor-pointer">
                            <input type="checkbox" checked={formData.is_ready} onChange={e => setFormData({ ...formData, is_ready: e.target.checked })} className="w-3 h-3 text-blue-600 rounded bg-slate-100 border-slate-300 focus:ring-blue-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Pronto</span>
                         </label>
                      </label>
                      {!formData.is_ready ? (
                        <input type="text" value={formData.delivery_date} onChange={e => setFormData({ ...formData, delivery_date: e.target.value })} placeholder="Ex: Dez / 2025" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-slate-700" required />
                      ) : (
                        <div className="w-full px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-sm font-bold flex items-center justify-center">Imóvel Pronto</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-900 uppercase">Programa Porta de Entrada</span>
                        <span className="text-[10px] font-medium text-slate-500">Aplica desconto de R$20.000,00 na simulação</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formData.porta_de_entrada} onChange={e => setFormData({ ...formData, porta_de_entrada: e.target.checked })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                     </label>
                  </div>

                  <div className="border-t border-slate-50 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Construtora</label>
                      {!showNewCompany && (
                        <button type="button" onClick={() => setShowNewCompany(true)} className="flex items-center space-x-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <Plus className="w-3 h-3" />
                          <span>Nova</span>
                        </button>
                      )}
                    </div>
                    {!showNewCompany ? (
                      <select value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:ring-2 focus:ring-blue-500/20 shadow-inner" required>
                        <option value="">Selecione...</option>
                        {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <input type="text" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Nome..." className="flex-1 px-4 py-2 bg-white border-2 border-blue-500 rounded-lg outline-none" autoFocus />
                        <button type="button" onClick={handleAddCompany} disabled={addingCompany} className="bg-blue-600 text-white p-2.5 rounded-lg active:scale-95 transition-transform"><CheckCircle2 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setShowNewCompany(false)} className="text-slate-400 p-2"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Conteúdo</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Descrição do Empreendimento</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none h-24 text-sm" placeholder="Fale sobre o projeto, diferenciais..." required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Foto Destaque</label>
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors h-24">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-medium text-slate-500 text-center truncate w-full px-2">{imageFile ? imageFile.name : 'Subir Foto'}</span>
                      <input type="file" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                    </label>
                  </div>
                  <div className="relative flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Book PDF</label>
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors h-24">
                      <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-medium text-slate-500 text-center truncate w-full px-2">{pdfFile ? pdfFile.name : 'Subir PDF'}</span>
                      <input type="file" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="hidden" accept="application/pdf" />
                    </label>
                    <div className="mt-2 text-[9px] text-slate-500 leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-100 font-medium">
                      <strong className="text-amber-700 block mb-0.5">⚠️ Importante:</strong> 
                      Comprima o PDF no <a href="https://www.ilovepdf.com/pt/comprimir_pdf" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 underline font-bold hover:text-blue-800 transition-colors">ILovePDF</a> antes de subir (Ideal: &lt; 5MB).
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Mapa e Localização */}
            <div className="space-y-6 flex flex-col">
              <div className="space-y-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Localização No Mapa</h3>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase flex items-center">
                        CEP
                        {fetchingCep && <Loader2 className="w-3 h-3 ml-2 animate-spin text-blue-500" />}
                      </label>
                      <input type="text" value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} onBlur={handleCepBlur} placeholder="96000-000" className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none text-sm font-bold text-blue-900 shadow-sm" required />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Bairro Automático</label>
                       <input type="text" value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Rua e Número</label>
                    <div className="flex space-x-2">
                      <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Av. Dom Joaquim, 123" className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" required />
                      <button type="button" onClick={() => handleSearchAddress()} disabled={searchingAddress || !formData.address} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                        {searchingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="h-64 rounded-xl overflow-hidden border-2 border-white shadow-xl relative z-0">
                    <MapContainer center={[formData.lat, formData.lng]} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapController center={[formData.lat, formData.lng]} />
                      <LocationPicker onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))} />
                      <Marker position={[formData.lat, formData.lng]} draggable={true} eventHandlers={{ dragend: (e) => { const marker = e.target; const pos = marker.getLatLng(); setFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng })); } }} />
                    </MapContainer>
                    <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-bold text-slate-500 shadow-sm pointer-events-none">
                       CLIQUE NO MAPA PARA AJUSTAR O PINO
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-400">
                    <div>LAT: {formData.lat.toFixed(6)}</div>
                    <div className="text-right">LNG: {formData.lng.toFixed(6)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 pt-4 flex items-center space-x-4">
               <button type="submit" disabled={loading} className="flex-1 bg-imperio-blue-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center space-x-3 disabled:opacity-50">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  <span className="text-lg uppercase tracking-wider">{editingProperty ? 'Salvar Alterações' : 'Finalizar e Publicar'}</span>
               </button>
               <button type="button" onClick={onClose} className="px-8 py-4 border border-slate-200 text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors uppercase text-sm tracking-widest">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
