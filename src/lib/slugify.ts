export function generateSlug(text: string): string {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD') // separa acentos das letras
    .replace(/[\u0300-\u036f]/g, '') // remove os acentos
    .replace(/\s+/g, '-') // substitui espaços por -
    .replace(/[^\w\-]+/g, '') // remove caracteres especiais
    .replace(/\-\-+/g, '-') // remove múltiplos -
    .replace(/^-+/, '') // remove - do início
    .replace(/-+$/, ''); // remove - do fim
}
