import type { ShopPrice } from '../types';

// 各ショップの検索URL生成ロジック
const SHOPS = [
    { name: '買取商店', urlGen: (jan: string) => `https://www.kaitorishouten-co.jp/search/${jan}` },
    { name: '買取Wiki', urlGen: (jan: string) => `https://gamekaitori.jp/search/result?keyword=${jan}` },
    { name: '買取ルデア', urlGen: (jan: string) => `https://kaitori-rudeya.com/search/result?keyword=${jan}` },
    { name: '買取ソムリエ', urlGen: (jan: string) => `https://somurie-kaitori.com/search/result?keyword=${jan}` },
    { name: '買取ホムラ', urlGen: (jan: string) => `https://kaitori-homura.com/search?q=${jan}` },
];



export const PriceService = {
    fetchPrices: async (janCode: string): Promise<ShopPrice[]> => {
        try {
            // Call our own Vercel API
            // Note: In local dev, this might fail if the API isn't running on the same port or proxy isn't set up.
            // For Vercel deployment, /api/prices works.
            // For local dev, we might need to point to the full URL or mock it if API isn't running locally.

            // Check if we are in dev mode and if API is available. 
            // Since we are running 'vite', the API function won't run locally unless we use 'vercel dev'.
            // So for local testing, we might still fallback to links, but for production, we use API.

            // For now, let's try to fetch. If it fails, fallback to links.
            const response = await fetch(`/api/prices?jan=${janCode}`);
            if (!response.ok) throw new Error('API failed');

            const data = await response.json();
            return data;

        } catch (e) {
            console.warn('API fetch failed, falling back to links generation', e);

            // Fallback logic (same as before)
            const results: ShopPrice[] = [];
            SHOPS.forEach(shop => {
                results.push({
                    shopName: shop.name,
                    price: 0,
                    url: shop.urlGen(janCode)
                });
            });
            return results;
        }
    },

    getBestPrice: (prices: ShopPrice[]) => {
        const validPrices = prices.filter(p => p.price > 0);
        if (validPrices.length === 0) return null;
        return validPrices.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    }
};
