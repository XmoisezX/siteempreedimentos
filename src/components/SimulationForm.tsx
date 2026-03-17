import { Calculator, ChevronRight, ChevronLeft, Wallet, User, Calendar, CheckCircle2, Sparkles, Building2, Phone, UserCircle2, Baby, Download, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface SimulationFormProps {
  property?: Property;
  onSimulationComplete?: (formData: any) => void;
}

export default function SimulationForm({ property: initialProperty, onSimulationComplete }: SimulationFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(initialProperty);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    income: 5000,
    birthDate: '',
    hasSecondBuyer: false,
    dependents: 0,
  });

  const [result, setResult] = useState<null | {
    parcel: number;
    entry: number;
    financed: number;
    term: number;
    program: string;
    faixa: string;
    propertyValue: number;
    subsidyApplied: boolean;
    entryInstallments?: number;
    debugLog?: string;
  }>(null);

  useEffect(() => {
    if (!initialProperty) {
      fetchProperties();
    }
  }, [initialProperty]);

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('*').order('name');
    if (data) setProperties(data);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

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

  const downloadDebugLog = () => {
    if (!result?.debugLog) return;
    const blob = new Blob([result.debugLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao-debug-${selectedProperty?.name || 'imovel'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    
    setLoading(true);

    setTimeout(() => {
      const evaluationValue = selectedProperty.valor_avaliacao_caixa || 200000; // Fallback
      const income = formData.income;
      const age = calculateAge(formData.birthDate);
      
      // PRAZO MÁXIMO
      // Regra 1: 420 meses
      // Regra 2: idade + prazo <= 80 anos
      const maxTermByAge = (80 - age) * 12;
      const term = Math.min(420, maxTermByAge);

      // PROGRAMA HABITACIONAL
      let program = "Minha Casa Minha Vida";
      let faixa = "";
      if (income <= 2850) faixa = "Faixa 1";
      else if (income <= 4700) faixa = "Faixa 2";
      else if (income <= 8600) faixa = "Faixa 3";
      else if (income <= 12000) faixa = "Faixa 4";
      else {
        program = "SBPE";
        faixa = "Financiamento Tradicional";
      }

      // TAXA DE JUROS (8.47% a.a.)
      const iAnnual = 0.0847;
      const iMonthly = iAnnual / 12;

      // FINANCIAMENTO MÁXIMO (80%)
      let financedAmount = evaluationValue * 0.80;
      const maxInstallment = income * 0.30;

      // Cálculo PMT (Sistema PRICE)
      // PMT = PV * ( i * (1 + i)^n ) / ( (1 + i)^n - 1 )
      const calculatePMT = (pv: number, i: number, n: number) => {
        return pv * ( (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) );
      };

      let currentParcel = calculatePMT(financedAmount, iMonthly, term);

      // AJUSTE AUTOMÁTICO DA ENTRADA
      while (currentParcel > maxInstallment && financedAmount > 0) {
        financedAmount -= (evaluationValue * 0.01);
        currentParcel = calculatePMT(financedAmount, iMonthly, term);
      }

      const propertyValue = selectedProperty.valor_imovel_construtora || evaluationValue;
      const calculatedEntry = propertyValue - financedAmount;
      const minSalary = 1518;
      const incomeLimit = minSalary * 5;
      const propertyLimit = 320000;
      
      const meetsSubsidyConditions = income <= incomeLimit && evaluationValue <= propertyLimit;
      const isPortaDeEntrada = selectedProperty?.porta_de_entrada !== false;
      const subsidy = (meetsSubsidyConditions && isPortaDeEntrada) ? 20000 : 0;
      const finalEntry = Math.max(0, calculatedEntry - subsidy);

      // GERAR LOG DE DEBUG
      const debugLog = `
DEMONSTRATIVO DE CÁLCULO - SIMULADOR CAIXA
-------------------------------------------
Empreendimento: ${selectedProperty.name}
Valor de Avaliação (Caixa): ${formatCurrency(evaluationValue)}
Valor do Imovel (Construtora): ${formatCurrency(selectedProperty.valor_imovel_construtora || evaluationValue)}

PERFIL DO CLIENTE:
- Renda Familiar: ${formatCurrency(income)}
- Data Nasc: ${formData.birthDate} (Idade: ${age} anos)
- Possui dependentes: ${formData.dependents > 0 ? 'Sim' : 'Não'}

PARÂMETROS DE FINANCIAMENTO:
- Prazo Máximo Real: ${term} meses (Regra: min(420, (80 - ${age}) * 12))
- Comprometimento de Renda Máximo (30%): ${formatCurrency(maxInstallment)}
- Taxa de Juros (8.47% a.a.): ${(iMonthly * 100).toFixed(4)}% a.m.

CÁLCULO DO PLANO:
1. Valor do Imóvel (Base Construtora): ${formatCurrency(propertyValue)}
2. Financiamento Máximo (80% da Av. Caixa): ${formatCurrency(evaluationValue * 0.8)}
3. Financiamento Final: ${formatCurrency(financedAmount)} (Ajustado p/ renda)
4. Parcela Mensal (Sistema PRICE): ${formatCurrency(currentParcel)}
5. Diferença (Imóvel - Financiado): ${formatCurrency(calculatedEntry)}

SUBSÍDIO PORTA DE ENTRADA:
- Participa do Programa: ${isPortaDeEntrada ? 'SIM' : 'NÃO'}
- Atende Critérios (Renda <= 5SM e Imovel <= 320k): ${meetsSubsidyConditions ? 'SIM' : 'NÃO'}
- Valor do Subsídio: ${formatCurrency(subsidy)}

RESULTADO FINAL:
- Entrada antes do Subsídio: ${formatCurrency(calculatedEntry)}
- Entrada Final a pagar: ${formatCurrency(finalEntry)}
- Valor Financiado: ${formatCurrency(financedAmount)}
- Prazo: ${term} meses
- Programa: ${program} (${faixa})
-------------------------------------------
Gerado em: ${new Date().toLocaleString('pt-BR')}
`;

      setResult({
        parcel: currentParcel,
        entry: finalEntry,
        financed: financedAmount,
        term: term,
        program: program,
        faixa: faixa,
        propertyValue: selectedProperty.valor_imovel_construtora || evaluationValue,
        subsidyApplied: meetsSubsidyConditions,
        entryInstallments: selectedProperty.parcelas_entrada,
        debugLog: debugLog
      });

      // Salvar simulação e Lead no banco de dados
      supabase.from('simulations').insert([{
        property_id: selectedProperty.id,
        name: formData.name,
        phone: formData.phone,
        income: income,
        birth_date: formData.birthDate,
        dependents: formData.dependents,
        has_second_buyer: formData.hasSecondBuyer
      }]).then(({ error }) => {
        if (error) console.error("Erro ao salvar simulação:", error);
      });

      if (onSimulationComplete) {
        onSimulationComplete(formData);
      }

      setLoading(false);
    }, 2000);
  };

  const ctaMessage = encodeURIComponent(
    `Olá! Fiz uma simulação para o ${selectedProperty?.name}. 
    Renda: ${formatCurrency(formData.income)}
    Entrada: ${formatCurrency(result?.entry || 0)}
    Parcela: ${formatCurrency(result?.parcel || 0)}
    Gostaria de falar com um especialista.`
  );
  
  const whatsappLink = `https://wa.me/5553994445566?text=${ctaMessage}`;

  return (
    <div className="bg-white rounded-3xl relative h-auto flex flex-col p-2">
      {/* Header do Simulador */}
      {!result && !loading && (
        <div className="flex items-center space-x-4 mb-8 p-4">
          <div className="w-12 h-12 bg-imperio-blue-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Simulador CAIXA</h3>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regras atualizadas 2024</p>
            </div>
          </div>
        </div>
      )}

      {/* Steps Logic */}
      {!result && !loading && (
        <form onSubmit={handleSimulate} className="flex-1 flex flex-col px-4 pb-4">
          
          {/* Progress Bar */}
          <div className="flex space-x-2 mb-8 px-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-imperio-blue-900' : 'bg-slate-100'}`} />
            ))}
          </div>

          <div className="flex-1">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 text-imperio-blue-900 mb-2">
                  <UserCircle2 className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Seus Dados</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: João da Silva"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-imperio-blue-900/10 transition-all"
                      required
                    />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-imperio-blue-900/10 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 text-imperio-blue-900 mb-2">
                  <Building2 className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Empreendimento</span>
                </div>
                
                {!initialProperty ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Selecione o Imóvel</label>
                    <select 
                      value={selectedProperty?.id || ''} 
                      onChange={(e) => setSelectedProperty(properties.find(p => p.id === e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-imperio-blue-900/10 transition-all cursor-pointer"
                      required
                    >
                      <option value="">Escolha um empreendimento...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-imperio-blue-900 p-6 rounded-2xl shadow-xl">
                    <p className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-1">Simulando para</p>
                    <h4 className="text-xl font-black text-white italic truncate">{selectedProperty?.name}</h4>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-imperio-blue-900 mt-8 mb-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Renda Familiar</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-end mb-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Renda Familiar Bruta</label>
                    <span className="text-2xl font-black text-imperio-blue-900">{formatCurrency(formData.income)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1500" 
                    max="30000" 
                    step="100"
                    value={formData.income}
                    onChange={e => setFormData({ ...formData, income: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-imperio-blue-900" 
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 text-imperio-blue-900 mb-2">
                  <User className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Perfil do Proponente</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Data de Nascimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-imperio-blue-900/10 transition-all text-sm"
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Dependentes</label>
                      <div className="flex items-center space-x-3">
                        <Baby className="w-5 h-5 text-slate-400" />
                        <input 
                          type="number" 
                          min="0"
                          max="10"
                          value={formData.dependents}
                          onChange={e => setFormData({ ...formData, dependents: Number(e.target.value) })}
                          className="w-full bg-transparent font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center">
                       <label className="flex items-center space-x-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={formData.hasSecondBuyer}
                            onChange={e => setFormData({ ...formData, hasSecondBuyer: e.target.checked })}
                            className="w-5 h-5 rounded-lg border-slate-300 text-imperio-blue-900 focus:ring-imperio-blue-900/20"
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-700 uppercase leading-none">2º Comprador</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Soma de Renda</span>
                          </div>
                       </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-center py-10">
                   <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                         <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase italic">Tudo Pronto!</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                        Clique abaixo para gerar sua simulação personalizada baseada nas regras da Caixa.
                      </p>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="pt-8 flex items-center space-x-3">
            {step > 1 && (
              <button 
                type="button"
                onClick={handleBack}
                className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {step < 4 ? (
              <button 
                type="button"
                onClick={handleNext}
                disabled={(step === 1 && (!formData.name || !formData.phone)) || (step === 2 && !selectedProperty) || (step === 3 && !formData.birthDate)}
                className="flex-1 bg-imperio-blue-900 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-imperio-blue-900/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="submit"
                className="flex-1 bg-imperio-gold-500 text-white font-black uppercase text-sm tracking-widest py-4 rounded-2xl shadow-xl shadow-imperio-gold-500/20 flex items-center justify-center space-x-3 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Simular Agora</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* Loading VIP State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 p-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-imperio-gold-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-imperio-gold-500 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Calculando Financiamento...</p>
            <div className="flex flex-col space-y-1">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter animate-pulse">• Enquadrando programa habitacional</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter animate-pulse delay-150">• Calculando capacidade de pagamento</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter animate-pulse delay-300">• Ajustando entrada mínima</span>
            </div>
          </div>
        </div>
      )}

      {/* Premium Result Card */}
      {result && !loading && (
        <div className="flex flex-col p-6 animate-in zoom-in-95 fade-in duration-700">
          <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden mb-6 border border-white/10 shrink-0">
             <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-20 -mt-20"></div>
             
             <div className="relative z-10 flex flex-col items-center text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <h4 className="text-[9px] font-bold text-blue-200/40 uppercase tracking-[0.3em] mb-4">Simulação CAIXA Aprovada</h4>
                
                <div className="mb-6 w-full">
                  <div className="bg-white/5 rounded-2xl p-4 mb-4">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Parcela Mensal Estimada</p>
                     <p className="text-4xl font-black text-white italic tracking-tighter">{formatCurrency(result.parcel)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[8px] text-white/30 font-bold uppercase mb-1">Entrada Estimada</p>
                        <p className="text-sm font-black text-imperio-gold-500">{formatCurrency(result.entry)}</p>
                     </div>
                     <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[8px] text-white/30 font-bold uppercase mb-1">Financiado</p>
                        <p className="text-sm font-black text-white">{formatCurrency(result.financed)}</p>
                     </div>
                  </div>
                </div>
                
                <div className="w-full h-px bg-white/10 mb-4"></div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left">
                       <p className="text-[8px] text-white/30 font-bold uppercase mb-0.5">Programa</p>
                       <p className="text-[10px] font-black text-white uppercase italic">{result.program}</p>
                       <p className="text-[8px] text-blue-300/50 font-bold uppercase">{result.faixa}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] text-white/30 font-bold uppercase mb-0.5">Prazo</p>
                       <p className="text-[10px] font-black text-white italic">{result.term} Meses</p>
                       <p className="text-[8px] text-white/30 font-bold uppercase truncate">ID: {selectedProperty?.id.split('-')[0]}</p>
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor do Imóvel</span>
                <span className="text-sm font-black text-slate-800 italic">{formatCurrency(result.propertyValue)}</span>
             </div>
             {result.subsidyApplied && (
               <div className="flex justify-between items-center mb-1 text-emerald-600">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Porta de Entrada (Subsídio)</span>
                  <span className="text-sm font-black italic">- {formatCurrency(20000)}</span>
               </div>
             )}
             {result.entry > 0 && result.entryInstallments && (
               <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none">Entrada Parcelada</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Sem Juros Direto com a Construtora</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-700 italic">Até {result.entryInstallments}x</span>
                  </div>
               </div>
             )}
             <p className="text-[8px] text-slate-400 font-medium text-center uppercase mt-3">* Esta é uma simulação preliminar e não garante aprovação de crédito.</p>
             
             {result.debugLog && (
               <button 
                 onClick={downloadDebugLog}
                 className="w-full mt-4 flex items-center justify-center space-x-2 py-2 px-4 border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest"
               >
                 <Download className="w-3.5 h-3.5" />
                 <span>Baixar Demonstrativo de Cálculo (TXT)</span>
               </button>
             )}
          </div>

          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative block"
          >
            <div className="absolute -inset-1 bg-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all"></div>
            <div className="relative flex items-center justify-between w-full bg-[#25D366] hover:bg-[#20BE5A] text-white py-4 px-6 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1">
               <div className="flex items-center space-x-3">
                 <MessageCircle className="w-6 h-6 fill-white/10" />
                 <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-tighter italic leading-none">Aprovar este Plano</p>
                   <p className="text-[8px] font-bold text-white/80 uppercase mt-0.5">Chamar no WhatsApp</p>
                 </div>
               </div>
               <ChevronRight className="w-5 h-5 animate-bounce-x" />
            </div>
          </a>
          
          <button 
            onClick={() => {setResult(null); setStep(1);}}
            className="mt-4 py-2 text-[9px] font-black text-slate-300 hover:text-slate-600 uppercase tracking-widest transition-colors text-center"
          >
            Refazer Simulação
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
        
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 4px solid currentColor;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        input[type='range']:active::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 0 20px currentColor;
        }
      `}} />
    </div>
  );
}
