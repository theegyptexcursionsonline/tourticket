export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Tour {
  id: number | string;
  title: string;
  image: string;
  discountPrice: number;
  duration?: string;
  rating?: number;
  bookings?: number;
  originalPrice?: number;
  tags?: string[];
  description?: string;
  highlights?: string[];
}

export interface CartItem extends Tour {
  quantity: number;
}
