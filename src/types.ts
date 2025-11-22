export interface InventoryItem {
    id: string;
    janCode: string;
    name: string; // Initially just "Unknown Item" or fetched name
    purchasePrice: number;
    quantity: number;
    timestamp: number;
}

export interface ShopPrice {
    shopName: string;
    price: number;
    url?: string;
}

export interface PriceAnalysis {
    janCode: string;
    bestPrice: number;
    bestShop: string;
    profit: number; // bestPrice - purchasePrice
    prices: ShopPrice[];
}
