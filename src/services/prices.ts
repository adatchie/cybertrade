import type { ShopPrice } from '../types';

export const PriceService = {
    fetchPrices: async (janCode: string): Promise<ShopPrice[]> => {
        const shops = [
            {
                name: 'Rakuten',
                url: `https://search.rakuten.co.jp/search/mall/${janCode}/`,
            },
            {
                name: 'Yahoo',
                url: `https://shopping.yahoo.co.jp/search?first=1&tab_ex=commerce&fr=shp-prop&oq=&aq=&mcr=8294e2fb9a0654662467163317249936&ts=1700000000&p=${janCode}`,
            }
        ];

        const results: ShopPrice[] = [];

        // Helper to fetch via CORS proxy
        const fetchWithProxy = async (targetUrl: string) => {
            try {
                // Using allorigins.win as a CORS proxy
                const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
                if (!response.ok) return null;
                return await response.text();
            } catch (e) {
                console.warn(`Proxy fetch failed for ${targetUrl}`, e);
                return null;
            }
        };

        await Promise.all(shops.map(async (shop) => {
            const html = await fetchWithProxy(shop.url);
            let price = 0;
            let productName = '';
            let imageUrl = '';

            if (html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Rakuten Parsing
                if (shop.name === 'Rakuten') {
                    const titleEl = doc.querySelector('.searchresultitem .title a') || doc.querySelector('div[class*="title"] a');
                    if (titleEl) productName = titleEl.textContent?.trim() || '';

                    const imgEl = doc.querySelector('.searchresultitem .image img') || doc.querySelector('div[class*="image"] img');
                    if (imgEl) {
                        imageUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
                        const alt = imgEl.getAttribute('alt');
                        if (alt && alt.length > productName.length) productName = alt;
                    }
                }

                // Yahoo Parsing
                if (shop.name === 'Yahoo') {
                    const titleEl = doc.querySelector('a.LoopList__itemTitle');
                    if (titleEl) productName = titleEl.textContent?.trim() || '';

                    const imgEl = doc.querySelector('li.LoopList__item img');
                    if (imgEl) {
                        imageUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
                    }
                }
            }

            results.push({
                shopName: shop.name,
                price,
                url: shop.url,
                productName,
                imageUrl
            } as any);
        }));

        return results;
    },

    getBestPrice: (prices: ShopPrice[]) => {
        const validPrices = prices.filter(p => p.price > 0);
        if (validPrices.length === 0) return null;
        return validPrices.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    }
};
