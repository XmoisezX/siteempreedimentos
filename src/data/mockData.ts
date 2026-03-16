export interface Property {
  id: string;
  name: string;
  type: 'apartments' | 'houses';
  neighborhood: string;
  price: number;
  image_url: string;
  pdf_url?: string;
  lat: number;
  lng: number;
  description: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  company?: string;
  address?: string;
  zip_code?: string;
  valor_avaliacao_caixa?: number;
  valor_imovel_construtora?: number;
  parcelas_entrada?: number;
  created_at?: string;
}

export const properties: Property[] = []; // Empty, will be filled from Supabase
