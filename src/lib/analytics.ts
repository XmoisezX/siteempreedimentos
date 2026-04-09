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

export const analytics = {
  pageView: (path: string) => 
    trackEvent('pagina_acessada', { page_path: path }),
    
  propertyView: (propertyName: string, propertyId: string) => 
    trackEvent('imovel_visualizado', { empreendimento_nome: propertyName, empreendimento_id: propertyId }),
    
  whatsAppMenuClick: () => 
    trackEvent('botao_whatsapp_menu_clicado'),
    
  whatsAppFloatingClick: () => 
    trackEvent('botao_whatsapp_flutuante_clicado'),
    
  whatsAppSimulationClick: (propertyName: string) => 
    trackEvent('botao_whatsapp_simulacao_clicado', { empreendimento_nome: propertyName }),
    
  bookClick: (propertyName: string) => 
    trackEvent('ver_book_clicado', { empreendimento_nome: propertyName }),

  simulationStart: (propertyName: string) => 
    trackEvent('iniciar_simulacao_clicado', { empreendimento_nome: propertyName }),
    
  simulationComplete: (propertyName: string, valorSimulado: number) => 
    trackEvent('simulacao_concluida', { empreendimento_nome: propertyName, valor_simulado: valorSimulado }),
};
