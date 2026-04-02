import { useState, useEffect } from 'react';
import { Calculator, ChevronRight, ChevronLeft, Wallet, User, Calendar, CheckCircle2, Sparkles, Building2, Phone, UserCircle2, Download, Share2 } from 'lucide-react';
import type { Property } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { getRotatedBroker } from '../lib/brokers';

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
    hasDependentOrSecondBuyer: false,
    has3YearsFGTS: false,
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
    federalSubsidyActive: boolean;
    federalSubsidyProjected: number;
    federalSubsidyDisplayRange: string;
    entryInstallments?: number;
    debugLog?: string;
  }>(null);
  const [assignedBroker, setAssignedBroker] = useState<{ phone: string, name: string }>({ phone: '5553994445566', name: 'Atendimento Central' });

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

  const calculateAge = (birthDateStr: string) => {
    let birth = new Date(birthDateStr);
    if (birthDateStr.includes('/') && birthDateStr.length === 10) {
      const [day, month, year] = birthDateStr.split('/');
      birth = new Date(Number(year), Number(month) - 1, Number(day));
    }
    
    if (isNaN(birth.getTime())) return 0; // Invalid date

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateAgeInMonths = (birthDateStr: string) => {
    let birth = new Date(birthDateStr);
    if (birthDateStr.includes('/') && birthDateStr.length === 10) {
      const [day, month, year] = birthDateStr.split('/');
      birth = new Date(Number(year), Number(month) - 1, Number(day));
    }
    if (isNaN(birth.getTime())) return 0; // Invalid date

    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    return years * 12 + months;
  };

  const getMipRateByAge = (applicantAge: number) => {
    if (applicantAge <= 25) return 0.00011;
    if (applicantAge <= 30) return 0.00012;
    if (applicantAge <= 35) return 0.00014;
    if (applicantAge <= 40) return 0.00018;
    if (applicantAge <= 45) return 0.00025;
    if (applicantAge <= 50) return 0.00036;
    if (applicantAge <= 55) return 0.00055;
    if (applicantAge <= 60) return 0.00085;
    if (applicantAge <= 65) return 0.00130;
    if (applicantAge <= 70) return 0.00220;
    if (applicantAge <= 75) return 0.00350;
    return 0.00550;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8); 
    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setFormData({ ...formData, birthDate: value });
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

    setTimeout(async () => {
      const evaluationValue = selectedProperty.valor_avaliacao_caixa || 200000; // Fallback
      const income = formData.income;
      const age = calculateAge(formData.birthDate);
      const ageInMonths = calculateAgeInMonths(formData.birthDate);
      
      // PRAZO MÁXIMO
      // Regra 1: 420 meses
      // Regra 2: idade + prazo <= 80 anos e 6 meses (966 meses)
      const maxTermByAge = 966 - ageInMonths;
      const term = Math.min(420, Math.max(0, maxTermByAge));

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

      // TAXA DE JUROS NOMINAIS A.A (Caixa usa a taxa nominal para cálculo do PMT)
      let iNominal = 0.0816; // Default Faixa 3 (aprox 8.47% efetivo)
      if (faixa === "Faixa 1") {
        iNominal = 0.0475; // a.a nominal (aprox 4.85% efetivo)
      } else if (faixa === "Faixa 2") {
        if (income <= 3200) iNominal = 0.0550; // a.a nominal (aprox 5.64% efetivo)
        else if (income <= 3800) iNominal = 0.0650; // a.a nominal (aprox 6.70% efetivo)
        else iNominal = 0.0700; // a.a nominal (aprox 7.23% efetivo) para 3.801 até 4.700
      } else if (faixa === "Faixa 3") {
        iNominal = 0.0816; // a.a nominal
      } else if (faixa === "Faixa 4") {
        iNominal = 0.0999;
      } else {
        iNominal = 0.1099; // SBPE Tradicional
      }
      
      if (formData.has3YearsFGTS) {
        iNominal = iNominal - 0.005; // -0.5% reduction
      }

      const iMonthly = iNominal / 12;
      const iAnnual = Math.pow(1 + iMonthly, 12) - 1; // Para o log exibir a taxa efetiva real

      // SUBSIDIO FEDERAL MCMV
      let projFederalSubsidy = 0;
      let displayFederalSubsidyRange = "";
      
      if (program === "Minha Casa Minha Vida") {
        if (formData.hasDependentOrSecondBuyer) {
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
            else projFederalSubsidy = 0; // Acima de 3200 o subsídio base zera (simplificação)
            
            displayFederalSubsidyRange = "R$ " + projFederalSubsidy.toLocaleString('pt-BR');
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
            else projFederalSubsidy = 0;
            
            displayFederalSubsidyRange = "R$ " + projFederalSubsidy.toLocaleString('pt-BR');
        }
      }

      // NOVO VALOR BASE DE AVALIAÇÃO (Descontado o Subsídio Federal)
      const subsidizedEvaluation = evaluationValue - projFederalSubsidy;

      // FINANCIAMENTO MÁXIMO (Cota e Renda)
      let financedAmount = subsidizedEvaluation * 0.80; // Cota de 80% máxima
      const maxInstallment = income * 0.30;

      const isMCMV = program === "Minha Casa Minha Vida";
      const mipRate = getMipRateByAge(age);
      const dfiRate = (isMCMV && income <= 4700) ? 0.0001207 : 0.000138; // Trava exata da simulação Habitacional Mais
      const adminFee = (isMCMV && income <= 4700) ? 0 : 25; // Isento p/ Faixa 1 e 2

      // Estimativa Exata de Seguros (MIP/DFI) e Taxas Administrativas Caixa
      const calculateInsuranceAndFees = (financed: number, evalValue: number) => {
        return adminFee + (evalValue * dfiRate) + (financed * mipRate); 
      };

      // Cálculo PMT (Sistema PRICE)
      const calculatePMT = (pv: number, i: number, n: number) => {
        return pv * ( (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) );
      };

      // CÁLCULO ALGÉBRICO EXATO DA CAPACIDADE DE FINANCIAMENTO PELA RENDA
      const pmtFactor = (iMonthly * Math.pow(1 + iMonthly, term)) / (Math.pow(1 + iMonthly, term) - 1);
      const denominator = pmtFactor + mipRate;
      // DFI é calculado sempre sobre a avaliação original da Caixa (evaluationValue), não subsidiada
      const maxFinancedByIncome = (maxInstallment - adminFee - (evaluationValue * dfiRate)) / denominator;

      // Se a renda não permitir financiar 80%, desce para a capacidade máxima real
      if (maxFinancedByIncome < financedAmount) {
         financedAmount = Math.max(0, maxFinancedByIncome);
      }

      let purePMT = calculatePMT(financedAmount, iMonthly, term);
      let currentParcel = purePMT + calculateInsuranceAndFees(financedAmount, subsidizedEvaluation);

      const propertyValue = selectedProperty.valor_imovel_construtora || evaluationValue;
      // Entrada é o Valor do Imóvel (Construtora) - Subsídio Federal - O que for financiado.
      const calculatedEntry = (propertyValue - projFederalSubsidy) - financedAmount;
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
- Dependente/2º Comprador: ${formData.hasDependentOrSecondBuyer ? 'Sim' : 'Não'}
- 3 Anos de FGTS: ${formData.has3YearsFGTS ? 'Sim (-0.5% a.a.)' : 'Não'}

PARÂMETROS DE FINANCIAMENTO:
- Prazo Máximo Real: ${term} meses (Regra: min(420, 966 meses - Idade(${ageInMonths} m)))
- Comprometimento de Renda Máximo (30%): ${formatCurrency(maxInstallment)}
- Taxa de Juros (${(iAnnual * 100).toFixed(2)}% a.a. ef.): ${(iMonthly * 100).toFixed(4)}% a.m.

CÁLCULO DO PLANO:
1. Valor do Imóvel (Base Construtora): ${formatCurrency(propertyValue)}
2. Subsídio Federal (MCMV): ${projFederalSubsidy > 0 ? formatCurrency(projFederalSubsidy) + ' (Projetado: ' + displayFederalSubsidyRange + ')' : 'R$ 0,00'}
2. Avaliação Liquida (Caixa - Subsídio): ${formatCurrency(subsidizedEvaluation)}
3. Financiamento Máximo Perm. (80% da Av. Líquida): ${formatCurrency(subsidizedEvaluation * 0.8)}
4. Financiamento Final Aprovado: ${formatCurrency(financedAmount)} (Ajustado p/ renda)
5. Parcela Mensal (Sistema PRICE c/ Taxas): ${formatCurrency(currentParcel)}
6. Diferença Pré-Porta de Entrada: ${formatCurrency(calculatedEntry)}

SUBSÍDIO GOVERNO DO ESTADO (PORTA DE ENTRADA):
- Participa do Programa: ${isPortaDeEntrada ? 'SIM' : 'NÃO'}
- Atende Critérios (Renda <= 5SM e Imovel <= 320k): ${meetsSubsidyConditions ? 'SIM' : 'NÃO'}
- Valor do Subsídio Estadual: ${formatCurrency(subsidy)}

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
        federalSubsidyActive: projFederalSubsidy > 0,
        federalSubsidyProjected: projFederalSubsidy,
        federalSubsidyDisplayRange: displayFederalSubsidyRange,
        entryInstallments: selectedProperty.parcelas_entrada,
        debugLog: debugLog
      });

      const broker = await getRotatedBroker();
      setAssignedBroker(broker);

      const formatBirthDateForDb = (dateString: string) => {
        if (!dateString || !dateString.includes('/')) return dateString;
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
      };

      // Salvar simulação e Lead no banco de dados
      supabase.from('simulations').insert([{
        property_id: selectedProperty.id,
        name: formData.name,
        phone: formData.phone,
        income: income,
        birth_date: formatBirthDateForDb(formData.birthDate),
        dependents: formData.hasDependentOrSecondBuyer ? 1 : 0,
        has_second_buyer: formData.hasDependentOrSecondBuyer,
        broker_name: broker.name
      }]).then(({ error }) => {
        if (error) {
           console.error("Erro ao salvar simulação:", error);
        }
      });

      if (onSimulationComplete) {
        onSimulationComplete(formData);
      }

      setLoading(false);
    }, 2000);
  };

  const totalSubsidy = (result?.federalSubsidyActive ? result.federalSubsidyProjected : 0) + (result?.subsidyApplied ? 20000 : 0);

  const ctaMessage = encodeURIComponent(
    `Olá! Fiz uma simulação para o ${selectedProperty?.name}. 
    Renda: ${formatCurrency(formData.income)}
    Entrada: ${formatCurrency(result?.entry || 0)}
    Parcela: ${formatCurrency(result?.parcel || 0)}${totalSubsidy > 0 ? `\n    Subsídio: ${formatCurrency(totalSubsidy)}` : ''}
    Gostaria de falar com um especialista.`
  );
  
  const whatsappLink = `https://wa.me/${assignedBroker.phone}?text=${ctaMessage}`;

  const isNameValid = !formData.name || (formData.name.trim().split(/\s+/).length >= 2 && !/(.)\1{2,}/i.test(formData.name) && !/[0-9]/.test(formData.name));
  const rawPhone = formData.phone.replace(/\D/g, '');
  const isValidPhone = !formData.phone || (rawPhone.length === 11 && !/(.)\1{4,}/.test(rawPhone) && Number(rawPhone.substring(0,2)) >= 11);
  const isAdult = !formData.birthDate || formData.birthDate.length < 10 || calculateAge(formData.birthDate) >= 18;

  const handleShareSimulation = async () => {
    if (!result || !selectedProperty) return;
    
    const shareText = `*Simulação de Financiamento - ${selectedProperty.name}*\n\n` +
      `👤 Cliente: ${formData.name}\n` +
      `💰 Renda Informada: ${formatCurrency(formData.income)}\n` +
      `🏠 Valor do Imóvel: ${formatCurrency(result.propertyValue)}\n` +
      `💵 Entrada Prevista: ${formatCurrency(result.entry)}\n` +
      `💳 Parcela Mensal Estimada: ${formatCurrency(result.parcel)}\n\n` +
      `*Imperial Paris Imóveis*`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Simulação Caixa - Imperial Paris',
          text: shareText,
        });
      } catch (err) {
        console.warn('Erro ao compartilhar', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Resumo copiado para a área de transferência! Cole no seu WhatsApp ou mensagem.');
    }
  };

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
            {[1, 2, 3].map(i => (
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
                    {formData.name.length > 0 && !isNameValid && (
                      <span className="text-[10px] text-red-500 font-bold block mt-2">
                        Insira nome e sobrenome válidos, sem números ou letras repetidas.
                      </span>
                    )}
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
                    {formData.phone.length > 0 && !isValidPhone && (
                      <span className="text-[10px] text-red-500 font-bold block mt-2 leading-tight">
                        Insira com DDD local (ex: 53 99999-9999). Sequências vazias não são aceitas.
                      </span>
                    )}
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
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-imperio-blue-900/10 transition-shadow">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Renda Familiar Bruta</label>
                  <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      min="1000"
                      step="100"
                      value={formData.income || ''}
                      onChange={e => setFormData({ ...formData, income: Number(e.target.value) })}
                      onBlur={e => {
                        const val = Number(e.target.value);
                        if (val < 1000) setFormData({ ...formData, income: 1000 });
                      }}
                      className="w-full font-black text-2xl text-imperio-blue-900 outline-none bg-transparent"
                      placeholder="5000"
                      required
                    />
                  </div>
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
                        type="text" 
                        maxLength={10}
                        placeholder="DD/MM/AAAA"
                        value={formData.birthDate}
                        onChange={handleDateChange}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-imperio-blue-900/10 transition-all text-sm"
                        required 
                      />
                    </div>
                    {formData.birthDate.length === 10 && !isAdult && (
                      <span className="text-[10px] text-red-500 font-bold block mt-2">
                        Você precisa ter no mínimo 18 anos para simular.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col space-y-3 w-full">
                    <label className="flex items-center space-x-3 cursor-pointer group w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-imperio-blue-900/30 transition-all">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={formData.hasDependentOrSecondBuyer}
                          onChange={e => setFormData({ ...formData, hasDependentOrSecondBuyer: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-imperio-gold-500 peer-checked:border-imperio-gold-500 transition-all flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest leading-tight">Possui Dependente ou 2º Comprador</span>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-imperio-blue-900/30 transition-all">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={formData.has3YearsFGTS}
                          onChange={e => setFormData({ ...formData, has3YearsFGTS: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-imperio-gold-500 peer-checked:border-imperio-gold-500 transition-all flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest leading-tight">Mínimo de 3 Anos Acumulados no FGTS</span>
                        <span className="text-[10px] text-slate-500 font-medium">Marcando esta opção, você garante taxas de juros menores.</span>
                      </div>
                    </label>
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
            
            {step < 3 ? (
              <button 
                type="button"
                onClick={handleNext}
                disabled={(step === 1 && (!formData.name || !formData.phone || !isNameValid || !isValidPhone)) || (step === 2 && !selectedProperty)}
                className="flex-1 bg-imperio-blue-900 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-imperio-blue-900/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="submit"
                disabled={formData.birthDate.length < 10 || !isAdult}
                className="flex-1 bg-imperio-gold-500 text-white font-black uppercase text-sm tracking-widest py-4 rounded-2xl shadow-xl shadow-imperio-gold-500/20 flex items-center justify-center space-x-3 active:scale-[0.98] transition-all disabled:opacity-50"
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
                  <div className="bg-white/5 rounded-2xl p-4 mb-4 flex flex-col items-center text-center">
                     <p className="text-[10px] lg:text-xs font-black text-white/40 uppercase tracking-widest mb-1 text-center w-full">Parcela Mensal Estimada</p>
                     <p className="text-3xl md:text-[1.65rem] lg:text-3xl xl:text-4xl font-black text-white italic tracking-tighter text-center w-full leading-none py-1">{formatCurrency(result.parcel)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 lg:gap-3 w-full">
                     <div className="bg-white/5 rounded-xl p-2 lg:p-3 overflow-hidden flex flex-col items-center justify-center text-center">
                        <p className="text-[8px] lg:text-[9px] text-white/30 font-bold uppercase mb-1 w-full truncate">Entrada Estimada</p>
                        <p className="text-[10px] lg:text-xs xl:text-sm font-black text-imperio-gold-500 tracking-tighter w-full lg:px-1" title={formatCurrency(result.entry)}>{formatCurrency(result.entry)}</p>
                     </div>
                     <div className="bg-white/5 rounded-xl p-2 lg:p-3 overflow-hidden flex flex-col items-center justify-center text-center">
                        <p className="text-[8px] lg:text-[9px] text-white/30 font-bold uppercase mb-1 w-full truncate">Financiado</p>
                        <p className="text-[10px] lg:text-xs xl:text-sm font-black text-white tracking-tighter w-full lg:px-1" title={formatCurrency(result.financed)}>{formatCurrency(result.financed)}</p>
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
             {result.federalSubsidyActive && (
               <div className="flex flex-col mt-2 mb-2">
                 <div className="flex justify-between items-center text-blue-600">
                    <span className="text-[9px] font-bold uppercase tracking-widest">Subsídio Gov. Federal (Proj.)</span>
                    <span className="text-sm font-black italic">- {formatCurrency(result.federalSubsidyProjected)}</span>
                 </div>
                 <span className="text-[8px] text-blue-400 font-bold uppercase mt-0.5">*Valor projetado entre {result.federalSubsidyDisplayRange} (use o demonstrativo para ver detalhes)</span>
               </div>
             )}
             {result.subsidyApplied && (
               <div className="flex justify-between items-center mt-2 mb-1 text-emerald-600">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Porta de Entrada (Subsídio Estadual)</span>
                  <span className="text-sm font-black italic">- {formatCurrency(20000)}</span>
               </div>
             )}
             {result.entry > 0 && result.entryInstallments && (
                 <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-100/50 to-transparent pointer-events-none"></div>
                    <div className="flex justify-between items-start w-full mb-3 relative z-10">
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none">Entrada Parcelada</span>
                         <span className="text-[9px] font-bold text-emerald-600/80 uppercase mt-1 line-clamp-1">S/ Juros com a Construtora</span>
                      </div>
                      <span className="text-xs font-black text-emerald-700 italic border border-emerald-200/50 bg-white rounded-[8px] px-2.5 py-1 shadow-sm shrink-0 whitespace-nowrap ml-2">Até {result.entryInstallments}x</span>
                    </div>
                    
                    <div className="bg-white border border-emerald-100 rounded-[10px] p-2.5 sm:p-3 flex flex-col sm:flex-row justify-between sm:items-center relative z-10 shadow-[0_2px_10px_rgba(16,185,129,0.05)] gap-1">
                       <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest leading-tight">Parcela Mensal Estimada</span>
                       <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tighter" title={formatCurrency(result.entry / result.entryInstallments)}>
                          {formatCurrency(result.entry / result.entryInstallments)}
                       </span>
                    </div>
                 </div>
             )}
             <p className="text-[8px] text-slate-400 font-medium text-center uppercase mt-3">* Esta é uma simulação preliminar e não garante aprovação de crédito.</p>
             
             {result.debugLog && (
                <div className="flex flex-col space-y-2 mt-4">
                 <button 
                   onClick={handleShareSimulation}
                   type="button"
                   className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[10px] font-black text-white transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-emerald-500/20"
                 >
                   <Share2 className="w-4 h-4" />
                   <span>Compartilhar Simulação</span>
                 </button>
                 
                 <button 
                   onClick={downloadDebugLog}
                   type="button"
                   className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest active:scale-95"
                 >
                   <Download className="w-3.5 h-3.5" />
                   <span>Baixar Demonstrativo Caixa (TXT)</span>
                 </button>
                </div>
             )}
          </div>

          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative block"
          >
            <div className="absolute -inset-1 bg-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all"></div>
            <div className="relative flex items-center justify-between w-full bg-[#25D366] hover:bg-[#20BE5A] text-white py-4 px-5 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1">
               <div className="flex items-center space-x-3">
                 <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                   <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.815 11.815 0 001.594 5.961L0 24l6.117-1.605a11.815 11.815 0 005.925 1.583h.005c6.637 0 12.05-5.414 12.053-12.053a11.82 11.82 0 00-3.58-8.502z"/>
                 </svg>
                 <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-tighter italic leading-none">APROVE SUA SIMULAÇÃO AGORA MESMO</p>
                   <p className="text-[8px] font-bold text-white/80 uppercase mt-0.5">CHAME UM CORRETOR</p>
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
