declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

export const trackFbEvent = (eventName: string, params?: Record<string, any>, isCustom: boolean = false) => {
  if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
    if (isCustom) {
      (window as any).fbq('trackCustom', eventName, params);
    } else {
      (window as any).fbq('track', eventName, params);
    }
  }
};

export const analytics = {
  pageView: (path: string) => 
    trackEvent('pagina_acessada', { page_path: path }),
    
  propertyView: (propertyName: string, propertyId: string) => 
    trackEvent('imovel_visualizado', { empreendimento_nome: propertyName, empreendimento_id: propertyId }),
    
  whatsAppMenuClick: () => 
    trackEvent('botao_whatsapp_menu_clicado'),
    
  whatsAppFloatingClick: () => {
    trackEvent('botao_whatsapp_flutuante_clicado');
    trackFbEvent('Contact', { content_name: 'WhatsApp Flutuante' });
  },
    
  whatsAppSimulationClick: (propertyName: string) => {
    trackEvent('botao_whatsapp_simulacao_clicado', { empreendimento_nome: propertyName });
    trackFbEvent('Contact', { content_name: 'WhatsApp Final Simulação', content_category: propertyName });
  },
    
  bookClick: (propertyName: string) => {
    trackEvent('ver_book_clicado', { empreendimento_nome: propertyName });
    trackFbEvent('ViewContent', { content_name: 'Ver Book', content_category: propertyName });
  },

  simulationStart: (propertyName: string) => {
    trackEvent('iniciar_simulacao_clicado', { empreendimento_nome: propertyName });
    trackFbEvent('Simular Financiamento', { content_name: propertyName }, true);
  },
    
  simulationComplete: (propertyName: string, valorSimulado: number) => {
    trackEvent('simulacao_concluida', { empreendimento_nome: propertyName, valor_simulado: valorSimulado });
    trackFbEvent('Lead', { content_name: 'Simular Agora', content_category: propertyName, value: valorSimulado, currency: 'BRL' });
  },

  shareSimulationClick: (propertyName: string) => {
    trackEvent('compartilhar_simulacao_clicado', { empreendimento_nome: propertyName });
    trackFbEvent('Opção Final Simulação - Compartilhar', { content_name: propertyName }, true);
  },

  downloadSimulationClick: (propertyName: string) => {
    trackEvent('baixar_simulacao_clicado', { empreendimento_nome: propertyName });
    trackFbEvent('Opção Final Simulação - Baixar', { content_name: propertyName }, true);
  }
};
