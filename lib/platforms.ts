export interface Platform {
  id: string;
  name: string;
  color: string;
  url: (query: string) => string;
  goal: (query: string) => string;
}

export const PLATFORMS: Platform[] = [
  {
    id: 'stockx',
    name: 'StockX',
    color: '#00ff87',
    url: (q) => `https://stockx.com/search?s=${encodeURIComponent(q)}`,
    goal: (q) =>
      `Search for "${q}" on this page. Find all product listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 12500.00,
  "currency": "USD",
  "condition": "New",
  "listingUrl": "https://stockx.com/example-product",
  "sellerName": "StockX",
  "title": "${q}"
}]
Only include items that match or closely match "${q}". If no results found, return [].`,
  },
  {
    id: 'carousell',
    name: 'Carousell SG',
    color: '#ff4d4d',
    url: (q) => `https://www.carousell.sg/search/${encodeURIComponent(q)}/`,
    goal: (q) =>
      `Search for "${q}" on this page. Find all product listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 8500.00,
  "currency": "SGD",
  "condition": "Used - Like New",
  "listingUrl": "https://www.carousell.sg/p/example-123",
  "sellerName": "seller_username",
  "title": "${q}"
}]
Only include items that match or closely match "${q}". If no results found, return [].`,
  },
  {
    id: 'grailed',
    name: 'Grailed',
    color: '#a855f7',
    url: (q) => `https://www.grailed.com/shop/listings?search[query]=${encodeURIComponent(q)}`,
    goal: (q) =>
      `Search for "${q}" on this page. Find all product listings shown. Return a JSON array of up to 8 results:
[{
  "price": 9800.00,
  "currency": "USD",
  "condition": "Good",
  "listingUrl": "https://www.grailed.com/listings/12345678-example",
  "sellerName": "grailed_user",
  "title": "${q}"
}]
Only include items that match or closely match "${q}". If no results found, return [].`,
  },
  {
    id: 'vestiaire',
    name: 'Vestiaire',
    color: '#f59e0b',
    url: (q) => `https://www.vestiairecollective.com/search/?q=${encodeURIComponent(q)}`,
    goal: (q) =>
      `Search for "${q}" on this page. Find all product listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 11200.00,
  "currency": "EUR",
  "condition": "Very Good",
  "listingUrl": "https://www.vestiairecollective.com/men-accessories/12345678-example.shtml",
  "sellerName": "Vestiaire seller",
  "title": "${q}"
}]
Only include items that match or closely match "${q}". If no results found, return [].`,
  },
  {
    id: 'chrono24',
    name: 'Chrono24',
    color: '#3b82f6',
    url: (q) => `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(q)}&dosearch=1`,
    goal: (q) =>
      `Search for "${q}" on this page. Find all watch listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 13500.00,
  "currency": "USD",
  "condition": "Pre-owned",
  "listingUrl": "https://www.chrono24.com/watches/ref-12345.htm",
  "sellerName": "Chrono24 Dealer",
  "title": "${q}"
}]
Only include items that match or closely match "${q}". If no results found, return [].`,
  },
];

export function getPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
