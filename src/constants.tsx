
import { Product } from './types';

// The Product type in types.ts now includes description and imageUrl
export interface ProductDisplay extends Product { }

export const PRODUCTS: ProductDisplay[] = [
  {
    id: '1',
    name: 'Detergent Powder',
    price: 85,
    unit: 'kg',
    category: 'Laundry',
    description: 'Tough on stains, gentle on fabrics. High-foaming local formula.',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '2',
    name: 'Liquid Dishwash',
    price: 120,
    unit: 'litre',
    category: 'Kitchen',
    description: 'Sparkling clean dishes with a fresh lemon scent. pH balanced.',
    imageUrl: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '3',
    name: 'Liquid Handwash',
    price: 150,
    unit: 'litre',
    category: 'Personal',
    description: 'Moisturizing formula that kills 99.9% germs. Soft on skin.',
    imageUrl: 'https://images.unsplash.com/photo-1603533871305-6490656360f2?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '4',
    name: 'Toilet Cleaner',
    price: 90,
    unit: 'litre',
    category: 'Bathroom',
    description: 'Powerful disinfectant that removes scales and brightens surfaces.',
    imageUrl: 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '5',
    name: 'White Phenyl',
    price: 60,
    unit: 'litre',
    category: 'Floor',
    description: 'Long-lasting pine fragrance. Best for daily floor sanitization.',
    imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=400'
  },
];

export const STARTER_PACK: Product = {
  id: 'STARTER-PACK',
  name: 'Trial Starter Box',
  price: 199,
  unit: 'kg',
  category: 'Special',
  description: 'A perfect sample box for new members! Includes trial packs of all our essentials.',
  imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=400'
};

export const DELIVERY_DATES = [5, 15, 25];

export const COLORS = {
  primary: '#13ec13',
  secondary: '#1d4ed8',
};