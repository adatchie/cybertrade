import type { ShopPrice } from '../types';

// 各ショップの検索URL生成ロジック
const SHOPS = [
    { name: '買取商店', urlGen: (_: string) => `https://www.kaitorishouten-co.jp/` },
    { name: '買取Wiki', urlGen: (jan: string) => `https://gamekaitori.jp/search?type=&q=${jan}` },
    { name: '買取ルデア', urlGen: (jan: string) => `https://kaitori-rudeya.com/search/index/${jan}/` },
    { name: '買取ソムリエ', urlGen: (_: string) => `https://somurie-kaitori.com/` },
    { name: '買取ホムラ', urlGen: (_: string) => `https://kaitori-homura.com/` },
];



export const PriceService = {
    fetchPrices: async (janCode: string): Promise<ShopPrice[]> => {
        try {
            const response = await fetch(`/api/prices?jan=${janCode}`);
            if (!response.ok) throw new Error('API failed');

            const data = await response.json();
            return data;

        } catch (e) {
            console.warn('API fetch failed, falling back to links generation', e);

            // Try Google Books API for metadata (Client-side fallback)
            let googleMeta = { productName: '', imageUrl: '' };
            try {
                const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${janCode}`);
                const gData = await gRes.json();
                if (gData.items && gData.items.length > 0) {
                    const vol = gData.items[0].volumeInfo;
                    googleMeta.productName = vol.title;
                    if (vol.imageLinks) {
                        googleMeta.imageUrl = vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail;
                    }
                }
            } catch (gErr) {
                console.warn('Google Books API failed', gErr);
            }

            // Fallback logic
            const results: ShopPrice[] = [];
            SHOPS.forEach(shop => {
                // Add Rakuten link manually if not in SHOPS (it is not in SHOPS array in this file yet)
                results.push({
                    shopName: shop.name,
                    price: 0,
                    url: shop.urlGen(janCode),
                    ...((shop.name === '買取Wiki' || shop.name === 'Rakuten') ? googleMeta : {}) // Attach google meta to one of them to be picked up
                } as any);
            });

            // Add Rakuten explicitly if missing from SHOPS constant
            results.push({
                shopName: 'Rakuten',
                price: 0,
                url: `https://search.rakuten.co.jp/search/mall/${janCode}/`,
                ...googleMeta
            } as any);

            return results;
        }
    },

    getBestPrice: (prices: ShopPrice[]) => {
        const validPrices = prices.filter(p => p.price > 0);
        if (validPrices.length === 0) return null;
        return validPrices.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    }
};
