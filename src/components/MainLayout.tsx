import { useState, useEffect } from 'react';
import PropertyList from './PropertyList';
import PropertyMap from './PropertyMap';
import SimulationForm from './SimulationForm';
import AdminDashboard from './admin/AdminDashboard';
import WhatsAppButton from './WhatsAppButton';
import type { Property } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { Settings, FileText, LayoutPanelLeft, Loader2, MapPin, Download, Maximize2, ExternalLink, X as CloseIcon, Calculator, ChevronLeft } from 'lucide-react';

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<'apartments' | 'houses'>('apartments');
  const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  
  // PDF Viewer State
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) setShowSimulator(false);
  }, [selectedProperty]);

  async function fetchProperties() {
    setLoading(true);
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching properties:', error);
    else setProperties(data || []);
    setLoading(false);
  }

  if (isAdmin) {
    return <AdminDashboard onExit={() => { setIsAdmin(false); fetchProperties(); }} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Header Premium */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center">
          <img 
            src="/LOGO LARANJA.png" 
            alt="Imperial Paris" 
            className="h-12 w-auto object-contain"
          />
        </div>
        
        <div className="flex items-center space-x-4">
           <button 
             onClick={() => setIsAdmin(true)}
             className="p-2.5 text-slate-400 hover:text-imperio-blue-900 hover:bg-slate-50 rounded-xl transition-all duration-300"
             title="Área Administrativa"
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Lado Esquerdo: Listagem (40%) */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col bg-white border-r border-slate-100 z-10 shadow-2xl relative">
          
          {/* Tabs Elevadas */}
          <div className="p-6 pb-2">
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 shadow-inner">
               <button 
                 onClick={() => setActiveTab('apartments')}
                 className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'apartments' ? 'bg-white text-imperio-blue-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <LayoutPanelLeft className="w-4 h-4" />
                 <span>Apartamentos</span>
               </button>
               <button 
                 onClick={() => setActiveTab('houses')}
                 className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'houses' ? 'bg-white text-imperio-blue-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <FileText className="w-4 h-4" />
                 <span>Casas</span>
               </button>
            </div>
            
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Empreendimentos</h2>
                  <p className="text-xs text-slate-400 font-medium">Exibindo imóveis na planta em Pelotas, RS</p>
               </div>
            </div>
          </div>

          {/* Lista Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-imperio-blue-900/20" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Carregando catálogo...</span>
              </div>
            ) : (
              <PropertyList 
                category={activeTab} 
                properties={properties}
                onHover={setHoveredPropertyId}
                onSelect={setSelectedProperty}
              />
            )}
          </div>
        </div>

        {/* Lado Direito: Mapa (Ocupa o resto) */}
        <div className="flex-1 hidden md:block relative bg-slate-200">
           <PropertyMap 
             hoveredPropertyId={hoveredPropertyId} 
             category={activeTab}
             properties={properties}
             onSelect={setSelectedProperty}
           />
           
           {/* Overlay Decorativo Gradiente */}
           <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-10" />
        </div>

        {/* Modal de Detalhes (Slide-in) */}
        {selectedProperty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="bg-white w-[95vw] md:w-[80vw] lg:w-[850px] lg:h-[850px] max-h-[92vh] rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-500">
              
              {/* Imagem em Destaque */}
              <div className="w-full md:w-1/2 min-h-[300px] md:min-h-0 relative">
                <img src={selectedProperty.image_url} alt={selectedProperty.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button 
                  onClick={() => setSelectedProperty(undefined)}
                  className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 transition-colors md:hidden"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Informações e Formulário */}
              <div className="w-full md:w-1/2 flex flex-col bg-white relative overflow-y-auto h-full scrollbar-hide">
                <button 
                  onClick={() => setSelectedProperty(undefined)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-slate-900 transition-colors hidden md:block"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>

                <div className="p-8 pb-4">
                  {showSimulator ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                       <button 
                         onClick={() => setShowSimulator(false)}
                         className="mb-6 flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-[10px] uppercase tracking-[0.2em]"
                       >
                         <ChevronLeft className="w-4 h-4" />
                         <span>Voltar aos Detalhes</span>
                       </button>
                       <SimulationForm property={selectedProperty} />
                    </div>
                  ) : (
                    <>
                      <span className="inline-block px-3 py-1 bg-imperio-gold-500/10 text-imperio-gold-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                        Pronto para Simular
                      </span>
                      
                      <div className="flex flex-col mb-6">
                        <div className="flex justify-between items-start">
                          <h2 className="text-3xl font-black text-slate-900 leading-none tracking-tighter uppercase italic">{selectedProperty.name}</h2>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A partir de</p>
                            <p className="text-2xl font-black text-imperio-blue-900 italic">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(selectedProperty.valor_imovel_construtora || 0)}
                            </p>
                          </div>
                        </div>
                        {selectedProperty.address && (
                          <div className="flex flex-col mt-2">
                             <p className="text-xs text-slate-500 font-bold flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1.5 text-imperio-blue-900" />
                              {selectedProperty.address}
                            </p>
                            {selectedProperty.zip_code && (
                              <span className="text-[10px] text-slate-400 font-bold ml-5 uppercase">CEP: {selectedProperty.zip_code}</span>
                            )}
                            {selectedProperty.company && (
                              <span className="text-[10px] text-imperio-gold-500 font-black ml-5 uppercase tracking-widest mt-0.5">Construtora {selectedProperty.company}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Ação Principal: Ver Book */}
                        {selectedProperty.pdf_url && (
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-imperio-gold-500 to-amber-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                            <button 
                              onClick={() => setShowPdfViewer(true)}
                              className="relative w-full py-4 bg-gradient-to-r from-imperio-gold-500 to-amber-500 hover:from-imperio-gold-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-imperio-gold-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                            >
                              <FileText className="w-5 h-5" />
                              <span>Ver Book Completo</span>
                            </button>
                          </div>
                        )}

                        {/* Ação: Simular Financiamento */}
                        <div className="relative group">
                          <div className="absolute -inset-1 bg-gradient-to-r from-imperio-blue-900 to-slate-800 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                          <button 
                            onClick={() => setShowSimulator(true)}
                            className="relative w-full py-4 bg-imperio-blue-900 hover:bg-black text-white font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                          >
                            <Calculator className="w-5 h-5" />
                            <span>Simular Financiamento</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {showPdfViewer && selectedProperty?.pdf_url && (
          <div className={`fixed inset-0 z-[200] flex flex-col bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300 ${isPdfFullscreen ? 'p-0' : 'p-4 md:p-10'}`}>
            {/* Header do Viewer */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center space-x-3">
                <div className="bg-imperio-blue-900 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider">{selectedProperty.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Book de Apresentação</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a 
                  href={selectedProperty.pdf_url} 
                  download 
                  target="_blank"
                  className="p-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all"
                  title="Baixar PDF"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="p-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all"
                  title="Tela Cheia"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <a 
                  href={selectedProperty.pdf_url} 
                  target="_blank"
                  className="p-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setShowPdfViewer(false)}
                  className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all ml-4"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Iframe Content */}
            <div className={`flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl relative ${isPdfFullscreen ? 'rounded-none border-none' : 'border-4 border-white/10'}`}>
               <iframe 
                 src={`${selectedProperty.pdf_url}#toolbar=0&zoom=70`} 
                 className="w-full h-full border-none"
                 title="Property Book"
               />
               
               {/* Overlay para forçar interações via botões próprios se desejado */}
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full flex items-center space-x-6 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl pointer-events-none">
                  Imperial Paris • Visualizador de Book
               </div>
            </div>
          </div>
        )}
      </main>
      {/* Botão Flutuante WhatsApp */}
      <WhatsAppButton />
    </div>
  );
}
