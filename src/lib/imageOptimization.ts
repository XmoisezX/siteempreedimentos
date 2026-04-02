/**
 * Otimiza URLs de imagens do Supabase Storage para utilizar a API de Transformação de Imagens.
 * Reduz o tamanho do payload e acelera o carregamento da imagem usando processamento no servidor.
 */
export function getOptimizedImageUrl(url: string | undefined, width: number = 800): string {
  if (!url) return '';
  
  // Apenas altera a URL se pertencer ao Supabase Storage (object/public)
  if (url.includes('/object/public/')) {
    // Altera o endpoint de 'object' para 'render/image' e adiciona parâmetros de transformação
    return url.replace('/object/public/', '/render/image/public/') + `?width=${width}&resize=cover&quality=80`;
  }
  
  // Retorna a URL original caso seja de fontes externas ou base64
  return url;
}
