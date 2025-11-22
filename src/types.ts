export interface InventoryItem {
    id: string;
    janCode: string;
    name: string;
    imageUrl?: string;
    purchasePrice: number;
    quantity: number;
    timestamp: number;
    status: 'active' | 'sold';
    soldDate?: number;
    soldPrice?: number;
}

export interface ShopPrice {
    shopName: string;
    price: number;
    url?: string;
    productName?: string;
    imageUrl?: string;
}

export interface PriceAnalysis {
    janCode: string;
    bestPrice: number;
    bestShop: string;
    profit: number;
    prices: ShopPrice[];
}
