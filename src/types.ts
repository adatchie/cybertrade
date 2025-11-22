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
