import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Property } from '../../data/mockData';
import PropertyForm from './PropertyForm';
import LoginForm from './LoginForm';
import SimulationsList from './SimulationsList';
import BrokersList from './BrokersList';
import { Plus, Trash2, Edit3, LogOut, Loader2, FileText, User, Building2, Users, MessageCircle } from 'lucide-react';
import { getOptimizedImageUrl } from '../../lib/imageOptimization';

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'simulations' | 'brokers'>('properties');
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchProperties();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProperties();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProperties() {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      setConfirmDeleteId(null);
      fetchProperties();
    }
    setDeleting(null);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-imperio-blue-900" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm onLogin={() => {}} onExit={onExit} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
             <img 
               src="/LOGO LARANJA.png" 
               alt="Logo" 
               className="h-8 w-auto object-contain"
             />
             <h1 className="text-xl font-bold text-slate-900 border-l border-slate-200 pl-3">Admin</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-slate-400 text-xs font-medium border-l border-slate-100 pl-6">
             <User className="w-4 h-4" />
             <span>{session.user.email}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'properties' ? 'bg-white text-imperio-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Imóveis</span>
            </button>
            <button
              onClick={() => setActiveTab('simulations')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'simulations' ? 'bg-white text-imperio-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Leads</span>
            </button>
            <button
              onClick={() => setActiveTab('brokers')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'brokers' ? 'bg-white text-imperio-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Corretores</span>
            </button>
          </div>

          <button 
            onClick={() => { setEditingProperty(undefined); setShowForm(true); }}
            className={`flex items-center space-x-2 bg-imperio-blue-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95 ${activeTab !== 'properties' ? 'hidden' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span>Novo Imóvel</span>
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
            title="Sair do Dashboard"
          >
            <LogOut className="w-5 h-5" />
          </button>
          
          <button 
            onClick={onExit}
            className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest ml-4"
          >
            Voltar ao Site
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'simulations' ? (
            <SimulationsList />
          ) : activeTab === 'brokers' ? (
            <BrokersList />
          ) : (
            <>
              {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Carregando empreendimentos...</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="bg-slate-50 p-6 rounded-full mb-6">
                    <Plus className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Nenhum empreendimento cadastrado</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2 leading-relaxed">
                    Comece adicionando seu primeiro imóvel na planta para que ele apareça no portal Imperial Paris.
                  </p>
                  <button 
                    onClick={() => setShowForm(true)}
                    className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                  >
                    Cadastrar Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {properties.map((prop: Property) => (
                    <div key={prop.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                      <div className="h-44 bg-slate-200 relative overflow-hidden">
                        <img src={getOptimizedImageUrl(prop.image_url, 400)} alt={prop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="absolute top-3 right-3 flex space-x-1 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                          {confirmDeleteId === prop.id ? (
                            <div className="bg-white rounded-lg shadow-xl p-1 flex items-center space-x-1 animate-in zoom-in-50 duration-200">
                              <button 
                                onClick={() => handleDelete(prop.id)}
                                disabled={deleting === prop.id}
                                className="px-2 py-1 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-tighter hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {deleting === prop.id ? '...' : 'Excluir'}
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deleting === prop.id}
                                className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-tighter hover:bg-slate-200 transition-colors disabled:opacity-50"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setEditingProperty(prop); setShowForm(true); }}
                                className="p-2 bg-white rounded-lg shadow-lg text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(prop.id)}
                                className="p-2 bg-white rounded-lg shadow-lg text-slate-600 hover:text-red-600 transition-colors"
                                title="Excluir empreendimento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                           {prop.type === 'apartments' ? 'Apartamento' : 'Casa'}
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <h4 className="font-bold text-slate-900 truncate mb-1">{prop.name}</h4>
                        <p className="text-xs text-slate-500 mb-4 flex items-center">
                           <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                           {prop.neighborhood}
                           {prop.company && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600 uppercase italic">({prop.company})</span>}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Valor Venda</span>
                            <span className="text-sm font-black text-slate-900">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(prop.valor_imovel_construtora || prop.price)}
                            </span>
                            {prop.valor_avaliacao_caixa && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter mt-1">Av: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(prop.valor_avaliacao_caixa)}</span>
                            )}
                          </div>
                          {prop.pdf_url ? (
                              <span title="Possui Book PDF" className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-600 rounded-md text-[10px] font-bold">
                                 <FileText className="w-3 h-3" />
                                 <span>PDF</span>
                              </span>
                          ) : (
                              <span className="text-[10px] text-slate-300 font-medium italic">Sem PDF</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <PropertyForm 
          onClose={() => { setShowForm(false); setEditingProperty(undefined); }} 
          onSuccess={() => { setShowForm(false); setEditingProperty(undefined); fetchProperties(); }}
          editingProperty={editingProperty}
        />
      )}
    </div>
  );
}
