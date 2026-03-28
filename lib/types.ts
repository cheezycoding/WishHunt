export interface Listing {
  price: number;
  currency: string;
  condition: string;
  listingUrl: string;
  sellerName: string;
  title?: string;
  imageUrl?: string;
}

export interface PlatformResult {
  platform: string;
  status: 'pending' | 'searching' | 'done' | 'error';
  listings: Listing[];
  error?: string;
  duration?: number;
}

export interface IdentifiedProduct {
  name: string;
  brand: string;
  model: string;
  searchQuery: string;
  description?: string;
}

export interface WatchItem {
  id: string;
  product: IdentifiedProduct;
  targetPrice: number;
  currency: string;
  createdAt: string;
  lastChecked?: string;
  currentBestPrice?: number;
  currentBestPlatform?: string;
  recipes: WatchRecipe[];
  triggered: boolean;
  lastListings?: (Listing & { platform: string })[];
}

export interface WatchRecipe {
  platform: string;
  url: string;
  goal: string;
}

export type SSEEvent =
  | { type: 'status'; platform: string; status: 'connecting' | 'searching' }
  | { type: 'result'; platform: string; listings: Listing[]; duration: number }
  | { type: 'error'; platform: string; error: string }
  | { type: 'done' };
