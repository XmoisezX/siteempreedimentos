import { useState, useEffect } from 'react';
import PropertyList from './PropertyList';
import PropertyMap from './PropertyMap';
import SimulationForm from './SimulationForm';
import AdminDashboard from './admin/AdminDashboard';
import WhatsAppButton from './WhatsAppButton';
import type { Property } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { Settings, FileText, LayoutPanelLeft, Loader2, MapPin, Download, Maximize2, ExternalLink, X as CloseIcon, Calculator, ChevronLeft, Sparkles, ChevronRight, Map as MapIcon, List as ListIcon } from 'lucide-react';

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<'apartments' | 'houses'>('apartments');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  
  // PDF Viewer State
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  // Recommendations State
  const [simulationData, setSimulationData] = useState<any>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      setShowSimulator(false);
      setSimulationData(null); // Reset when changing properties
    }
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

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const generateRecommendations = () => {
    if (!simulationData || !selectedProperty) return [];
    
    let others = properties.filter(p => p.id !== selectedProperty.id && p.type === selectedProperty.type);
    if (others.length < 3) {
      const more = properties.filter(p => p.id !== selectedProperty.id && p.type !== selectedProperty.type);
      others = [...others, ...more];
    }
    others = others.slice(0, 3);

    const { income, birthDate, dependents = 0 } = simulationData;
    if (!income || !birthDate) return [];

    const age = calculateAge(birthDate);
    const maxTermByAge = (80 - age) * 12;
    const term = Math.min(420, maxTermByAge);
    
    // TAXA DE JUROS EFETIVOS A.A
    let iAnnual = 0.0847; // Default Faixa 3
    if (income <= 2850) iAnnual = 0.0485;
    else if (income <= 4700) iAnnual = 0.0564;
    else if (income <= 8600) iAnnual = 0.0847;
    else if (income <= 12000) iAnnual = 0.1047;
    else iAnnual = 0.1149; // SBPE Tradicional
    
    const iMonthly = iAnnual / 12;
    const maxInstallment = income * 0.30;
    const minSalary = 1518;
    const incomeLimit = minSalary * 5;
    const propertyLimit = 320000;

    const calculatePMT = (pv: number, i: number, n: number) => {
      return pv * ( (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) );
    };

    return others.map(prop => {
      const evaluationValue = prop.valor_avaliacao_caixa || 200000;
      
      let projFederalSubsidy = 0;
      if (income <= 12000) { // MCMV
        if (income >= 1800 && income <= 2000) {
          projFederalSubsidy = dependents === 0 ? 20000 : 50000;
        } else if (income >= 2001 && income <= 2500) {
          projFederalSubsidy = dependents === 0 ? 7500 : 22500;
        }
      }

      const subsidizedEvaluation = evaluationValue - projFederalSubsidy;
      let financedAmount = subsidizedEvaluation * 0.80;
      let currentParcel = calculatePMT(financedAmount, iMonthly, term);

      while (currentParcel > maxInstallment && financedAmount > 0) {
        financedAmount -= (evaluationValue * 0.01);
        currentParcel = calculatePMT(financedAmount, iMonthly, term);
      }

      const propertyValue = prop.valor_imovel_construtora || evaluationValue;
      const calculatedEntry = (propertyValue - projFederalSubsidy) - financedAmount;
      const meetsSubsidyConditions = income <= incomeLimit && evaluationValue <= propertyLimit;
      const isPortaDeEntrada = prop.porta_de_entrada !== false;
      const subsidy = (meetsSubsidyConditions && isPortaDeEntrada) ? 20000 : 0;
      const finalEntry = Math.max(0, calculatedEntry - subsidy);

      return {
        property: prop,
        parcel: currentParcel,
        entry: finalEntry,
        term: term
      };
    });
  };

  const recommendations = generateRecommendations();

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
        <div className={`w-full md:w-[450px] lg:w-[500px] flex flex-col bg-white border-r border-slate-100 z-10 shadow-2xl relative ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}`}>
          
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
        <div className={`flex-1 relative bg-slate-200 ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
           <PropertyMap 
             hoveredPropertyId={hoveredPropertyId} 
             category={activeTab}
             properties={properties}
             onSelect={setSelectedProperty}
           />
           
           {/* Overlay Decorativo Gradiente */}
           <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-10" />
        </div>

        {/* Floating Toggle Button for Mobile */}
        <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center w-full px-4 pointer-events-none">
          <button
            onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
            className="pointer-events-auto bg-imperio-blue-900 text-white px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(15,38,92,0.3)] flex items-center space-x-3 font-black uppercase tracking-[0.2em] text-[10px] border border-white/10 backdrop-blur-md active:scale-95 transition-all animate-in slide-in-from-bottom-4 duration-500"
          >
            {mobileView === 'list' ? (
              <>
                <MapIcon className="w-4 h-4 text-imperio-gold-500" />
                <span>Ver no Mapa</span>
              </>
            ) : (
              <>
                <ListIcon className="w-4 h-4 text-imperio-gold-500" />
                <span>Ver Lista</span>
              </>
            )}
          </button>
        </div>

        {/* Modal de Detalhes (Slide-in) */}
        {selectedProperty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="bg-white w-[95vw] md:w-[80vw] lg:w-[850px] lg:h-[850px] max-h-[92vh] rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-500">
              
              {/* Imagem em Destaque e Recomendações */}
              <div className={`w-full md:w-1/2 h-[250px] md:h-auto min-h-[250px] md:min-h-0 relative flex-col justify-center items-center shrink-0 overflow-hidden ${simulationData ? 'hidden md:flex' : 'flex'}`}>
                <img src={selectedProperty.image_url} alt={selectedProperty.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${simulationData ? 'bg-black/85 backdrop-blur-md' : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'}`} />
                
                {/* Recomendações Overlay */}
                {simulationData && recommendations.length > 0 && (
                  <div className="hidden md:flex relative z-10 w-full max-w-sm p-6 animate-in slide-in-from-bottom-8 fade-in duration-700 flex-col">
                     <div className="flex items-center space-x-2 mb-6">
                        <Sparkles className="w-6 h-6 text-imperio-gold-500" />
                        <h4 className="text-white font-black uppercase tracking-widest text-sm">Outras Opções para Você</h4>
                     </div>
                     <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
                        {recommendations.map((rec, idx) => (
                          <div 
                            key={rec.property.id} 
                            onClick={() => setSelectedProperty(rec.property)}
                            className="bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 p-5 rounded-[24px] cursor-pointer transition-all duration-300 backdrop-blur-xl flex items-center space-x-5 group hover:scale-[1.03] hover:shadow-2xl hover:shadow-imperio-gold-500/10 hover:border-white/20"
                            style={{ animationDelay: `${idx * 100}ms` }}
                          >
                             <img src={rec.property.image_url} className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:shadow-imperio-gold-500/20 transition-all" alt="Thumb" loading="lazy" decoding="async" />
                             <div className="flex-1">
                                <h5 className="text-white text-sm font-black uppercase tracking-tight line-clamp-2 group-hover:text-imperio-gold-500 transition-colors leading-tight mb-1">{rec.property.name}</h5>
                                {rec.property.neighborhood && (
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1 text-imperio-gold-500" />
                                    {rec.property.neighborhood}
                                  </p>
                                )}
                                <div className="flex flex-col space-y-1">
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">
                                     <span>Parcelas:</span> 
                                     <strong className="text-white font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.parcel)}</strong>
                                   </p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">
                                     <span>Entrada:</span> 
                                     <strong className="text-imperio-gold-500 font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.entry)}</strong>
                                   </p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors ml-2" />
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedProperty(undefined)}
                  className="absolute top-4 left-4 bg-red-600 text-white p-2.5 rounded-full shadow-[0_4px_15px_rgba(220,38,38,0.5)] border-2 border-white hover:bg-red-700 active:scale-95 transition-all md:hidden z-[100] flex items-center justify-center"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Informações e Formulário */}
              <div className="w-full md:w-1/2 flex flex-col bg-white relative overflow-y-auto flex-1 min-h-0 scrollbar-hide">
                <button 
                  onClick={() => setSelectedProperty(undefined)}
                  className="absolute top-4 right-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-full transition-all hidden md:flex items-center justify-center z-50 group"
                  title="Fechar"
                >
                  <CloseIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div className="p-8 pb-4">
                  {showSimulator ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                       <button 
                         onClick={() => {
                           setShowSimulator(false);
                           setSimulationData(null);
                         }}
                         className="mb-6 flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-[10px] uppercase tracking-[0.2em]"
                       >
                         <ChevronLeft className="w-4 h-4" />
                         <span>Voltar aos Detalhes</span>
                       </button>
                       <SimulationForm property={selectedProperty} onSimulationComplete={setSimulationData} />
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
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(selectedProperty.valor_imovel_construtora || selectedProperty.price || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center mt-2 space-x-2">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedProperty.is_ready ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                             {selectedProperty.is_ready ? 'Pronto para Morar' : `Prazo de Entrega: ${selectedProperty.delivery_date || 'A Definir'}`}
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
                              onClick={() => {
                                setIsLoadingPdf(true);
                                setShowPdfViewer(true);
                              }}
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
                        {selectedProperty.description && (
                          <div className="mt-6 pt-6 border-t border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sobre o Empreendimento</h3>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedProperty.description}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Recomendações Mobile (Abaixo do simulador) */}
                {simulationData && recommendations.length > 0 && (
                  <div className="flex md:hidden w-full bg-slate-900 p-6 sm:p-8 animate-in slide-in-from-bottom-8 fade-in duration-700 flex-col shrink-0 pb-12 mt-4 rounded-t-3xl border-t border-white/10">
                    <div className="flex items-center space-x-2 mb-6">
                      <Sparkles className="w-6 h-6 text-imperio-gold-500" />
                      <h4 className="text-white font-black uppercase tracking-widest text-sm">Outras Opções para Você</h4>
                    </div>
                    <div className="space-y-4">
                       {recommendations.map((rec) => (
                         <div 
                           key={rec.property.id} 
                           onClick={() => setSelectedProperty(rec.property)}
                           className="bg-slate-800/60 hover:bg-slate-800/80 border border-white/10 p-5 rounded-[24px] cursor-pointer transition-all duration-300 backdrop-blur-xl flex items-center space-x-5 group"
                         >
                            <img src={rec.property.image_url} className="w-16 h-16 rounded-2xl object-cover shadow-lg" alt="Thumb" loading="lazy" decoding="async" />
                            <div className="flex-1">
                               <h5 className="text-white text-[11px] font-black uppercase tracking-tight line-clamp-2 leading-tight mb-1">{rec.property.name}</h5>
                               {rec.property.neighborhood && (
                                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center">
                                   <MapPin className="w-2.5 h-2.5 mr-1 text-imperio-gold-500" />
                                   {rec.property.neighborhood}
                                 </p>
                               )}
                               <div className="flex flex-col flex-wrap">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">
                                    <span>Parcelas: </span> 
                                    <strong className="text-white font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.parcel)}</strong>
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">
                                    <span>Entrada: </span> 
                                    <strong className="text-imperio-gold-500 font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.entry)}</strong>
                                  </p>
                               </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20" />
                         </div>
                       ))}
                    </div>
                  </div>
                )}
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
               {isLoadingPdf && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                   <Loader2 className="w-10 h-10 animate-spin text-imperio-blue-900 mb-4" />
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-6">
                     Carregando Book...<br />
                     <span className="text-[9px] font-medium text-slate-400 mt-2 block normal-case">Isso pode levar alguns segundos na primeira exibição devido ao processo de otimização.</span>
                   </span>
                 </div>
               )}
               <iframe 
                 src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(selectedProperty.pdf_url)}`} 
                 className={`w-full h-full border-none transition-opacity duration-500 ${isLoadingPdf ? 'opacity-0' : 'opacity-100'}`}
                 title="Property Book"
                 onLoad={() => setIsLoadingPdf(false)}
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
