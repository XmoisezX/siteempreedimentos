import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2, Phone, User, Loader2, CheckCircle2, X } from 'lucide-react';

interface Broker {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  last_assigned_at: string | null;
}

export default function BrokersList() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching brokers:', error);
      // If table doesn't exist, we might get an error here
    } else {
      setBrokers(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // Format phone: remove non-digits
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
      // Add country code if missing
      // (Simplified logic, assuming BR)
    }

    const { error } = await supabase
      .from('brokers')
      .insert([{ 
        name: formData.name, 
        phone: cleanPhone, 
        is_active: formData.is_active 
      }]);

    if (error) {
      alert('Erro ao salvar corretor: ' + error.message);
    } else {
      setFormData({ name: '', phone: '', is_active: true });
      setShowForm(false);
      fetchBrokers();
    }
    setSaving(false);
  }

  async function toggleActive(broker: Broker) {
    const { error } = await supabase
      .from('brokers')
      .update({ is_active: !broker.is_active })
      .eq('id', broker.id);
    
    if (error) alert('Erro ao atualizar status: ' + error.message);
    else fetchBrokers();
  }

  async function deleteBroker(id: string) {
    if (!confirm('Deseja excluir este corretor?')) return;
    
    const { error } = await supabase
      .from('brokers')
      .delete()
      .eq('id', id);
    
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchBrokers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Roleta de Corretores</h2>
          <p className="text-xs text-slate-400 font-medium">Gerencie quem recebe os leads do WhatsApp em ordem circular.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-imperio-blue-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Corretor</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl mb-8 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Nome do Corretor</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Moisez"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-imperio-blue-900/10 text-sm font-bold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">WhatsApp (com DDD)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="53999999999"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-imperio-blue-900/10 text-sm font-bold"
                  required
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                type="submit" 
                disabled={saving}
                className="flex-1 bg-imperio-blue-900 text-white font-bold py-2 rounded-lg hover:bg-black transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Salvar</span>
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="p-2 border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-imperio-blue-900/20" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Carregando corretores...</p>
        </div>
      ) : brokers.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-bold text-slate-800">Nenhum corretor cadastrado</h3>
          <p className="text-sm text-slate-400 mt-1">Adicione corretores para iniciar a roleta de leads.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Corretor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status na Roleta</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {brokers.map((broker) => (
                <tr key={broker.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-imperio-blue-900/10 text-imperio-blue-900 flex items-center justify-center text-xs font-black uppercase">
                        {broker.name.substring(0, 2)}
                      </div>
                      <span className="font-bold text-slate-700">{broker.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    {broker.phone}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => toggleActive(broker)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${broker.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        {broker.is_active ? 'Ativo' : 'Pausado'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteBroker(broker.id)}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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

import { Users } from 'lucide-react';
