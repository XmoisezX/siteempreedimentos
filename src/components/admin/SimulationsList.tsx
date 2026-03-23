import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Trash2, Calendar, Phone, User, DollarSign, Building2 } from 'lucide-react';

interface SimulationData {
  id: string;
  name: string;
  phone: string;
  income: number;
  birth_date: string;
  dependents: number;
  has_second_buyer: boolean;
  created_at: string;
  property_id: string;
  broker_name?: string;
  properties: {
    name: string;
  };
}

export default function SimulationsList() {
  const [simulations, setSimulations] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchSimulations();
  }, []);

  async function fetchSimulations() {
    setLoading(true);
    // Join com properties para pegar o nome do imóvel
    const { data, error } = await supabase
      .from('simulations')
      .select(`
        *,
        properties (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching simulations:', error);
    } else {
      setSimulations(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Certeza que deseja excluir este Lead?")) return;
    
    setDeleting(id);
    const { error } = await supabase
      .from('simulations')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchSimulations();
    }
    setDeleting(null);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '?';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Carregando leads...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Leads & Simulações</h2>
          <p className="text-sm text-slate-500 font-medium">Contatos captados através do simulador de financiamento.</p>
        </div>
        <div className="bg-imperio-blue-900/10 text-imperio-blue-900 px-4 py-2 rounded-xl font-bold text-sm">
          {simulations.length} {simulations.length === 1 ? 'Lead' : 'Leads'}
        </div>
      </div>

      {simulations.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nenhum lead encontrado</h3>
          <p className="text-slate-500 text-sm mt-1">As simulações feitas pelos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <th className="p-4 pl-6 font-medium">Cliente</th>
                <th className="p-4 font-medium">Nascimento</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Empreendimento</th>
                <th className="p-4 font-medium">Corretor(a)</th>
                <th className="p-4 font-medium">Renda Familiar</th>
                <th className="p-4 font-medium">Data Simulação</th>
                <th className="p-4 pr-6 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {simulations.map((sim) => (
                <tr key={sim.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-imperio-gold-500/10 flex items-center justify-center shrink-0">
                        <span className="text-imperio-gold-600 font-black text-xs">
                          {sim.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 line-clamp-1">{sim.name}</span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                           <span title="Dependentes">Dep: {sim.dependents}</span>
                           <span>•</span>
                           <span title="Segundo Comprador">{sim.has_second_buyer ? 'Casal/Compos. Renda' : 'Individual'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-slate-700 font-bold whitespace-nowrap text-[11px]">
                        {sim.birth_date ? new Date(sim.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/D'}
                      </span>
                      {sim.birth_date && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {calculateAge(sim.birth_date)} anos
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 text-slate-600 font-medium whitespace-nowrap">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`https://wa.me/55${sim.phone.replace(/\D/g, '')}`} target="_blank" className="hover:text-emerald-500 transition-colors">
                        {sim.phone}
                      </a>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center space-x-2">
                        <Building2 className="w-3.5 h-3.5 text-imperio-blue-900/50 shrink-0" />
                        <span className="font-bold text-imperio-blue-900 text-xs truncate max-w-[150px]" title={sim.properties?.name || 'Imóvel Excluído'}>
                          {sim.properties?.name || 'Imóvel Excluído'}
                        </span>
                     </div>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-600 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md">
                      {sim.broker_name || 'Ag. Geral'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1.5 font-black text-slate-700">
                      <DollarSign className="w-3.5 h-3.5 text-green-500" />
                      <span>{formatCurrency(sim.income)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(sim.created_at)}</span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={() => handleDelete(sim.id)}
                      disabled={deleting === sim.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Excluir Lead"
                    >
                      {deleting === sim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
