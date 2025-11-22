import type { ShopPrice } from '../types';

// 各ショップの検索URL生成ロジック
const SHOPS = [
    { name: '買取商店', urlGen: (jan: string) => `https://www.kaitorishouten-co.jp/search/${jan}` }, // Verified pattern often used or search param
    { name: '買取Wiki', urlGen: (jan: string) => `https://gamekaitori.jp/search/result?keyword=${jan}` },
    { name: '買取ルデア', urlGen: (jan: string) => `https://kaitori-rudeya.com/search/result?keyword=${jan}` },
    { name: '買取ソムリエ', urlGen: (jan: string) => `https://somurie-kaitori.com/search/result?keyword=${jan}` },
    { name: '買取ホムラ', urlGen: (jan: string) => `https://kaitori-homura.com/search?q=${jan}` },
];

// Mock Data for demonstration (still kept for UI testing)
const MOCK_DB: { [key: string]: ShopPrice[] } = {
    '4902370542912': [
        { shopName: '買取商店', price: 7500, url: 'https://www.kaitori-shoten.com/' },
        { shopName: '買取Wiki', price: 7200, url: 'https://kaitori-wiki.com/' },
    ]
};

export const PriceService = {
    fetchPrices: async (janCode: string): Promise<ShopPrice[]> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Mock DB check
        let results: ShopPrice[] = [];
        if (MOCK_DB[janCode]) {
            results = [...MOCK_DB[janCode]];
        }

        // 2. Add "Search Link" entries for all shops (even if no price found)
        // This allows the user to manually check
        SHOPS.forEach(shop => {
            if (!results.find(r => r.shopName === shop.name)) {
                results.push({
                    shopName: shop.name,
                    price: 0, // 0 indicates "Unknown/Check manually"
                    url: shop.urlGen(janCode)
                });
            }
        });

        return results;
    },

    getBestPrice: (prices: ShopPrice[]) => {
        const validPrices = prices.filter(p => p.price > 0);
        if (validPrices.length === 0) return null;
        return validPrices.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    }
};
