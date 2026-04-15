import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Trash2, Calendar, Phone, User, DollarSign, Building2, Download, X as CloseIcon, Calculator, ChevronDown, ChevronRight } from 'lucide-react';

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
  status?: string;
  properties: any;
}

export default function SimulationsList() {
  const [simulations, setSimulations] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [viewingSim, setViewingSim] = useState<SimulationData | null>(null);
  const [brokers, setBrokers] = useState<{name: string}[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchSimulations();
    supabase.from('brokers').select('name').order('name').then(({data}) => setBrokers(data || []));
  }, []);

  async function fetchSimulations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('simulations')
      .select(`
        *,
        properties (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching simulations:', error);
    } else {
      setSimulations(data || []);
      setSelectedLeads([]);
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedLeads(filteredSimulations.map(s => s.id));
    else setSelectedLeads([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedLeads(prev => [...prev, id]);
    else setSelectedLeads(prev => prev.filter(l => l !== id));
  };

  const exportCSV = () => {
    const data = filteredSimulations.filter(s => selectedLeads.includes(s.id));
    let csv = "Cliente,Telefone,Data Nascimento,Dependentes,Composicao Renda,Renda,Corretor,Empreendimento,Data Solicitacao\n";
    data.forEach(s => {
      // Find the grouped lead logic to extract correct broker
      const phoneClean = s.phone.replace(/\D/g, '');
      const nameClean = s.name.trim().toLowerCase();
      const groupKey = `${phoneClean}-${nameClean}`;
      const group = groupedSimulations.find(g => g.groupKey === groupKey);
      const realBrokerName = group ? (group.simulations[group.simulations.length - 1].broker_name || 'Ag. Geral') : 'Ag. Geral';

      const bdate = new Date(s.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      csv += `"${s.name}","${s.phone}",${bdate},${s.dependents},${s.has_second_buyer?'Sim':'Nao'},${s.income},"${realBrokerName}","${s.properties?.name||'N/D'}",${formatDate(s.created_at)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `imperio_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Excluir DEFINITIVAMENTE ${selectedLeads.length} leads selecionados?`)) return;
    const { error } = await supabase.from('simulations').delete().in('id', selectedLeads);
    if (!error) {
      fetchSimulations();
    } else alert('Erro: ' + error.message);
  };

  const bulkChangeBroker = async (brokerName: string) => {
    if (!window.confirm(`Atribuir ${selectedLeads.length} leads para ${brokerName}?`)) return;
    const { error } = await supabase.from('simulations').update({ broker_name: brokerName }).in('id', selectedLeads);
    if (!error) {
      fetchSimulations();
    } else alert('Erro: ' + error.message);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setSimulations(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    const { error } = await supabase.from('simulations').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };


  const generateSimLog = (sim: SimulationData) => {
    const property = sim.properties;
    if (!property) return "Imóvel não encontrado ou excluído do sistema.";
    
    const evaluationValue = property.valor_avaliacao_caixa || 200000;
    const income = sim.income;
    const age = calculateAge(sim.birth_date) as number;
    const term = Math.min(420, (80 - age) * 12);

    let program = "Minha Casa Minha Vida";
    let faixa = "";
    if (income <= 2850) faixa = "Faixa 1";
    else if (income <= 4700) faixa = "Faixa 2";
    else if (income <= 8600) faixa = "Faixa 3";
    else if (income <= 12000) faixa = "Faixa 4";
    else { program = "SBPE"; faixa = "Financiamento Tradicional"; }

    let iNominal = 0.0816;
    if (faixa === "Faixa 1") iNominal = 0.0475;
    else if (faixa === "Faixa 2") iNominal = income <= 3200 ? 0.0550 : income <= 3800 ? 0.0650 : 0.0700;
    else if (faixa === "Faixa 3") iNominal = 0.0816;
    else if (faixa === "Faixa 4") iNominal = 0.0999;
    else iNominal = 0.1099;
    
    const iMonthly = iNominal / 12;
    const iAnnual = Math.pow(1 + iMonthly, 12) - 1;

    let projFederalSubsidy = 0;
    if (program === "Minha Casa Minha Vida") {
        if (sim.has_second_buyer) {
            if (income <= 1800) projFederalSubsidy = 55000;
            else if (income <= 1900) projFederalSubsidy = 50159;
            else if (income <= 2000) projFederalSubsidy = 44477;
            else if (income <= 2100) projFederalSubsidy = 39201;
            else if (income <= 2200) projFederalSubsidy = 34594;
            else if (income <= 2300) projFederalSubsidy = 30077;
            else if (income <= 2400) projFederalSubsidy = 25933;
            else if (income <= 2500) projFederalSubsidy = 22155;
            else if (income <= 2600) projFederalSubsidy = 18733;
            else if (income <= 2700) projFederalSubsidy = 15657;
            else if (income <= 2800) projFederalSubsidy = 12916;
            else if (income <= 2900) projFederalSubsidy = 10724;
            else if (income <= 3000) projFederalSubsidy = 8592;
            else if (income <= 3100) projFederalSubsidy = 4500;
            else if (income <= 3200) projFederalSubsidy = 1575;
        } else {
            if (income <= 1800) projFederalSubsidy = 16500;
            else if (income <= 1900) projFederalSubsidy = 15047;
            else if (income <= 2000) projFederalSubsidy = 13343;
            else if (income <= 2100) projFederalSubsidy = 11760;
            else if (income <= 2200) projFederalSubsidy = 10378;
            else if (income <= 2300) projFederalSubsidy = 9023;
            else if (income <= 2400) projFederalSubsidy = 7780;
            else if (income <= 2500) projFederalSubsidy = 6400;
            else if (income <= 2600) projFederalSubsidy = 5100;
            else if (income <= 2700) projFederalSubsidy = 4095;
            else if (income <= 2800) projFederalSubsidy = 3250;
            else if (income <= 2900) projFederalSubsidy = 2800;
            else if (income <= 3000) projFederalSubsidy = 2577;
            else if (income <= 3100) projFederalSubsidy = 1500;
        }
    }

    const subsidizedEvaluation = evaluationValue - projFederalSubsidy;
    let financedAmount = subsidizedEvaluation * 0.80;
    const maxInstallment = income * 0.30;
    
    const calcFees = (f: number, ev: number) => 25 + (ev * 0.00013) + (f * 0.00008);
    const calcPMT = (pv: number, i: number, n: number) => pv * ((i * Math.pow(1+i,n))/(Math.pow(1+i,n)-1));
    
    let purePMT = calcPMT(financedAmount, iMonthly, term);
    let currentParcel = purePMT + calcFees(financedAmount, subsidizedEvaluation);

    while (currentParcel > maxInstallment && financedAmount > 0) {
      financedAmount -= 50;
      purePMT = calcPMT(financedAmount, iMonthly, term);
      currentParcel = purePMT + calcFees(financedAmount, subsidizedEvaluation);
    }

    const propertyValue = property.valor_imovel_construtora || evaluationValue;
    const calculatedEntry = (propertyValue - projFederalSubsidy) - financedAmount;
    const subsidy = (income <= 1518 * 5 && evaluationValue <= 320000 && property.porta_de_entrada !== false) ? 20000 : 0;
    const finalEntry = Math.max(0, calculatedEntry - subsidy);

    return `DEMONSTRATIVO DE CÁLCULO - SIMULADOR CAIXA
-------------------------------------------
Empreendimento: ${property.name}
Valor de Avaliação (Caixa): ${formatCurrency(evaluationValue)}
Valor do Imovel (Construtora): ${formatCurrency(propertyValue)}

PERFIL DO CLIENTE:
- Cliente: ${sim.name}
- Telefone: ${sim.phone}
- Renda Familiar: ${formatCurrency(income)}
- Data Nasc: ${new Date(sim.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} (Idade: ${age} anos)
- Dependente/2º Comprador: ${sim.has_second_buyer ? 'Sim' : 'Não'}

PARÂMETROS DE FINANCIAMENTO:
- Prazo Máximo Real: ${term} meses (Regra: min(420, (80 - ${age}) * 12))
- Comprometimento Máx. (30%): ${formatCurrency(maxInstallment)}
- Taxa de Juros (${(iAnnual * 100).toFixed(2)}% a.a. ef.): ${(iMonthly * 100).toFixed(4)}% a.m.

CÁLCULO DO PLANO:
1. Valor do Imóvel (Construtora): ${formatCurrency(propertyValue)}
2. Subsídio Federal (MCMV): ${projFederalSubsidy > 0 ? formatCurrency(projFederalSubsidy) : 'R$ 0,00'}
2. Avaliação Liquida (Caixa - Subsídio): ${formatCurrency(subsidizedEvaluation)}
3. Financiamento Máximo Perm. (80% da Av.): ${formatCurrency(subsidizedEvaluation * 0.8)}
4. Financiamento Final Aprovado: ${formatCurrency(financedAmount)}
5. Parcela Mensal (Sistema PRICE c/ Taxas): ${formatCurrency(currentParcel)}
6. Diferença Pré-Porta de Entrada: ${formatCurrency(calculatedEntry)}

SUBSÍDIO GOVERNO DO ESTADO (PORTA DE ENTRADA):
- Elegível ao Subsídio: ${subsidy > 0 ? 'SIM' : 'NÃO'}
- Valor do Subsídio Estadual: ${formatCurrency(subsidy)}

RESULTADO FINAL:
- Entrada Final a pagar: ${formatCurrency(finalEntry)}
- Valor Financiado: ${formatCurrency(financedAmount)}
- Parcela Mensal: ${formatCurrency(currentParcel)}
-------------------------------------------
Gerado em tempo real pelo Admin.
`;
  };

  const filteredSimulations = simulations.filter(sim => {
    const term = searchTerm.toLowerCase();
    return (
      sim.name.toLowerCase().includes(term) ||
      sim.phone.includes(term) ||
      (sim.properties?.name || '').toLowerCase().includes(term) ||
      (sim.broker_name || '').toLowerCase().includes(term)
    );
  });

  interface GroupedLead {
    groupKey: string;
    phone: string;
    name: string;
    simulations: SimulationData[];
  }

  const groupedSimulations = useMemo(() => {
    const groups: Record<string, GroupedLead> = {};
    
    filteredSimulations.forEach(sim => {
      const phoneClean = sim.phone.replace(/\D/g, '');
      const nameClean = sim.name.trim().toLowerCase();
      const groupKey = `${phoneClean}-${nameClean}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          phone: sim.phone,
          name: sim.name,
          simulations: []
        };
      }
      groups[groupKey].simulations.push(sim);
    });
    
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.simulations[0].created_at).getTime();
      const dateB = new Date(b.simulations[0].created_at).getTime();
      return dateB - dateA;
    });
  }, [filteredSimulations]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const handleSelectGroup = (group: GroupedLead, checked: boolean) => {
    const groupIds = group.simulations.map(s => s.id);
    if (checked) {
      setSelectedLeads(prev => Array.from(new Set([...prev, ...groupIds])));
    } else {
      setSelectedLeads(prev => prev.filter(id => !groupIds.includes(id)));
    }
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
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Leads & Simulações</h2>
          <p className="text-sm text-slate-500 font-medium">Contatos captados através do simulador de financiamento.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <input 
             type="text" 
             placeholder="Buscar lead, imóvel, corretor..." 
             className="px-4 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-imperio-blue-900/20 transition-all font-medium text-slate-700 placeholder-slate-400"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="bg-imperio-blue-900/10 text-imperio-blue-900 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap hidden sm:block">
            {groupedSimulations.length} {groupedSimulations.length === 1 ? 'Lead Único' : 'Leads Únicos'}
          </div>
        </div>
      </div>

      {viewingSim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-imperio-blue-900 rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase">Demonstrativo da Simulação</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead: {viewingSim.name}</p>
                </div>
              </div>
              <button onClick={() => setViewingSim(null)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-900 overflow-y-auto">
              <pre className="text-[10px] sm:text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {generateSimLog(viewingSim)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {selectedLeads.length > 0 && (
        <div className="bg-imperio-blue-900 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between shadow-2xl fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-auto md:min-w-[700px] z-40 rounded-2xl border border-white/10 animate-in slide-in-from-bottom-8">
           <span className="text-white font-black text-xs uppercase tracking-widest mb-3 sm:mb-0 bg-white/10 px-4 py-2 rounded-xl">
             {selectedLeads.length} selecionado(s)
           </span>
           <div className="flex flex-wrap gap-2 items-center">
              <button onClick={exportCSV} className="text-[10px] uppercase tracking-widest font-black text-slate-900 bg-white hover:bg-slate-100 px-4 py-2.5 rounded-xl flex items-center transition-all"><Download className="w-3.5 h-3.5 mr-2"/> CSV</button>
              
              <div className="relative">
                <select 
                  onChange={(e) => { if (e.target.value) bulkChangeBroker(e.target.value) }} 
                  className="text-[10px] uppercase tracking-widest font-black text-slate-600 bg-white hover:bg-slate-100 pl-4 pr-10 py-2.5 rounded-xl cursor-pointer outline-none appearance-none transition-all"
                  value=""
                >
                  <option value="" disabled>ATRIBUIR CORRETOR...</option>
                  {brokers.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                  <option value="Ag. Geral">AGÊNCIA GERAL</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <button onClick={bulkDelete} className="text-[10px] uppercase tracking-widest font-black text-white bg-red-500 hover:bg-red-600 px-4 py-2.5 rounded-xl flex items-center sm:ml-4 shadow-lg shadow-red-500/20 transition-all"><Trash2 className="w-3.5 h-3.5 mr-2"/> Excluir</button>
           </div>
        </div>
      )}

      {filteredSimulations.length === 0 ? (
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
                <th className="p-4 pl-6 w-10">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedLeads.length > 0 && selectedLeads.length === filteredSimulations.length} 
                    className="rounded border-slate-300 text-imperio-blue-900 focus:ring-imperio-blue-900 w-4 h-4 cursor-pointer" 
                  />
                </th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Nascimento</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Empreendimento</th>
                <th className="p-4 font-medium">Corretor(a)</th>
                <th className="p-4 font-medium">Renda Familiar</th>
                <th className="p-4 font-medium">Data Simulação</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 pr-6 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {groupedSimulations.map((group) => {
                const isExpanded = expandedGroups.includes(group.groupKey);
                const isMultiple = group.simulations.length > 1;
                const primarySim = group.simulations[0];
                const oldestSim = group.simulations[group.simulations.length - 1]; // First simulation ever done decides the broker
                const realBrokerName = oldestSim.broker_name || 'Ag. Geral';
                
                const groupIds = group.simulations.map(s => s.id);
                const allSelected = groupIds.every(id => selectedLeads.includes(id));
                const someSelected = groupIds.some(id => selectedLeads.includes(id)) && !allSelected;

                return (
                  <React.Fragment key={group.groupKey}>
                    <tr className={`hover:bg-slate-50/50 transition-colors group/row ${allSelected ? 'bg-imperio-blue-900/5' : ''}`}>
                      <td className="p-4 pl-6">
                        <input 
                          type="checkbox" 
                          checked={allSelected} 
                          ref={el => { if (el) el.indeterminate = someSelected }}
                          onChange={(e) => handleSelectGroup(group, e.target.checked)} 
                          className="rounded border-slate-300 text-imperio-blue-900 focus:ring-imperio-blue-900 w-4 h-4 cursor-pointer" 
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-imperio-gold-500/10 flex items-center justify-center shrink-0">
                            <span className="text-imperio-gold-600 font-black text-xs">
                              {primarySim.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 line-clamp-1">{primarySim.name}</span>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                               <span title="Dependentes">Dep: {primarySim.dependents}</span>
                               <span>•</span>
                               <span title="Segundo Comprador">{primarySim.has_second_buyer ? 'Casal/Compos.' : 'Individual'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-bold whitespace-nowrap text-[11px]">
                            {primarySim.birth_date ? new Date(primarySim.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/D'}
                          </span>
                          {primarySim.birth_date && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              {calculateAge(primarySim.birth_date)} anos
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2 text-slate-600 font-medium whitespace-nowrap">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`https://wa.me/55${primarySim.phone.replace(/\D/g, '')}`} target="_blank" className="hover:text-emerald-500 transition-colors">
                            {primarySim.phone}
                          </a>
                        </div>
                      </td>
                      <td className="p-4">
                         {isMultiple ? (
                           <span className="bg-imperio-gold-500/20 text-imperio-gold-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center w-max">
                             {group.simulations.length} Sim. do Lead
                           </span>
                         ) : (
                           <div className="flex items-center space-x-2">
                              <Building2 className="w-3.5 h-3.5 text-imperio-blue-900/50 shrink-0" />
                              <span className="font-bold text-imperio-blue-900 text-xs truncate max-w-[150px]" title={primarySim.properties?.name || 'Imóvel Excluído'}>
                                {primarySim.properties?.name || 'Imóvel Excluído'}
                              </span>
                           </div>
                         )}
                      </td>
                      <td className="p-4">
                        <span className="text-slate-600 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider bg-slate-100/80 px-2.5 py-1.5 rounded-md border border-slate-200/50">
                          {realBrokerName}
                        </span>
                      </td>
                      <td className="p-4">
                        {isMultiple && new Set(group.simulations.map(s => s.income)).size > 1 ? (
                          <span className="text-slate-400 italic text-[11px] font-bold">Rendas Variáveis</span>
                        ) : (
                          <div className="flex items-center space-x-1.5 font-black text-slate-700">
                            <DollarSign className="w-3.5 h-3.5 text-green-500" />
                            <span>{formatCurrency(primarySim.income)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(primarySim.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                         <select 
                            value={primarySim.status || 'Aguardando Contato'}
                            onChange={(e) => handleUpdateStatus(primarySim.id, e.target.value)}
                            className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 rounded-md border outline-none cursor-pointer transition-colors max-w-[140px] appearance-none text-center ${
                              (primarySim.status || 'Aguardando Contato') === 'Atendido' 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}
                         >
                            <option value="Aguardando Contato">AGUARDANDO Fila</option>
                            <option value="Atendido">ATENDIDO</option>
                         </select>
                      </td>
                      <td className="p-4 pr-6 text-right flex items-center justify-end space-x-1">
                        {isMultiple ? (
                          <button onClick={() => toggleGroup(group.groupKey)} className="p-2 text-slate-400 hover:text-imperio-blue-900 hover:bg-slate-100 rounded-lg transition-all" title="Ver todas as simulações deste cliente">
                             <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-imperio-blue-900' : ''}`} />
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setViewingSim(primarySim)}
                              className="p-2 text-slate-400 hover:text-imperio-blue-900 hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover/row:opacity-100"
                              title="Ver Demonstrativo da Simulação"
                            >
                              <Calculator className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(primarySim.id)}
                              disabled={deleting === primarySim.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/row:opacity-100 disabled:opacity-50"
                              title="Excluir Lead"
                            >
                              {deleting === primarySim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>

                    {/* Simulações Filhas Expandidas */}
                    {isExpanded && isMultiple && group.simulations.map((sim, index) => (
                      <tr key={sim.id} className={`bg-slate-50 border-l-4 border-slate-200 hover:border-imperio-blue-900 transition-all ${selectedLeads.includes(sim.id) ? 'bg-imperio-blue-900/5 border-imperio-blue-900' : ''}`}>
                        <td className="p-3 pl-6">
                           <input 
                             type="checkbox" 
                             checked={selectedLeads.includes(sim.id)} 
                             onChange={(e) => handleSelectOne(sim.id, e.target.checked)} 
                             className="rounded border-slate-300 text-imperio-blue-900 focus:ring-imperio-blue-900 w-4 h-4" 
                           />
                        </td>
                        <td className="p-3" colSpan={3}>
                           <div className="flex items-center text-slate-400 text-[11px] uppercase tracking-widest pl-4">
                             <ChevronRight className="w-4 h-4 mr-1 opacity-50" />
                             <span className="font-bold">Simulação {group.simulations.length - index}</span>
                           </div>
                        </td>
                        <td className="p-3">
                           <div className="flex items-center space-x-2">
                              <Building2 className="w-3.5 h-3.5 text-imperio-blue-900/50 shrink-0" />
                              <span className="font-bold text-imperio-blue-900 text-xs truncate max-w-[150px]" title={sim.properties?.name || 'Imóvel Excluído'}>
                                {sim.properties?.name || 'Imóvel Excluído'}
                              </span>
                           </div>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                            {realBrokerName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-slate-700 text-xs">{formatCurrency(sim.income)}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-500 text-[11px] font-medium whitespace-nowrap">{formatDate(sim.created_at)}</span>
                        </td>
                        <td className="p-3 text-center">
                           <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-md ${
                              (sim.status || 'Aguardando Contato') === 'Atendido' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                            }`}>
                              {sim.status || 'Aguardando Contato'}
                           </span>
                        </td>
                        <td className="p-3 pr-6 text-right flex items-center justify-end space-x-1">
                          <button 
                            onClick={() => setViewingSim(sim)}
                            className="p-2 text-slate-400 hover:text-imperio-blue-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Ver Demonstrativo"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(sim.id)}
                            disabled={deleting === sim.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Excluir"
                          >
                            {deleting === sim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
