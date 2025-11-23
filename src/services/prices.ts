import type { ShopPrice } from '../types';

export const PriceService = {
    fetchPrices: async (janCode: string): Promise<ShopPrice[]> => {
        // Shops for Price Checking (Links only)
        const linkShops = [
            {
                name: 'Kaitori Wiki',
                url: `https://kaitori.wiki/search/${janCode}`,
            },
            {
                name: 'Kaitori Shoten',
                url: `https://www.kaitorishouten.co.jp/search?q=${janCode}`,
            },
            {
                name: 'Kaitori Rudeya',
                url: `https://kaitori-rudeya.com/search?q=${janCode}`,
            }
        ];

        // Shops for Metadata (Scraping)
        const metaShops = [
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

        // 1. Add Link Shops (Price 0/Unknown)
        linkShops.forEach(shop => {
            results.push({
                shopName: shop.name,
                price: 0,
                url: shop.url,
                productName: '',
                imageUrl: ''
            });
        });

        // Helper to fetch via CORS proxy with fallback
        const fetchWithProxy = async (targetUrl: string) => {
            const proxies = [
                (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
            ];

            for (const createProxyUrl of proxies) {
                try {
                    const response = await fetch(createProxyUrl(targetUrl));
                    if (response.ok) return await response.text();
                } catch (e) {
                    console.warn(`Proxy fetch failed`, e);
                }
            }
            return null;
        };

        // 2. Fetch Metadata from Rakuten/Yahoo
        await Promise.all(metaShops.map(async (shop) => {
            const html = await fetchWithProxy(shop.url);
            let productName = '';
            let imageUrl = '';

            if (html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Rakuten Parsing
                if (shop.name === 'Rakuten') {
                    // Try multiple selectors for title
                    const titleEl = doc.querySelector('.searchresultitem .title a')
                        || doc.querySelector('div[class*="title"] a')
                        || doc.querySelector('h2 a')
                        || doc.querySelector('.dui-card.searchresultitem .title a');

                    if (titleEl) productName = titleEl.textContent?.trim() || '';

                    // Try multiple selectors for image
                    const imgEl = doc.querySelector('.searchresultitem .image img')
                        || doc.querySelector('div[class*="image"] img')
                        || doc.querySelector('.dui-card.searchresultitem img');

                    if (imgEl) {
                        imageUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
                        const alt = imgEl.getAttribute('alt');
                        if (alt && (!productName || alt.length > productName.length)) productName = alt;
                    }
                }

                // Yahoo Parsing
                if (shop.name === 'Yahoo') {
                    const titleEl = doc.querySelector('a.LoopList__itemTitle')
                        || doc.querySelector('.LoopList__itemTitle a')
                        || doc.querySelector('[class*="LoopList__itemTitle"]');

                    if (titleEl) productName = titleEl.textContent?.trim() || '';

                    const imgEl = doc.querySelector('li.LoopList__item img')
                        || doc.querySelector('[class*="LoopList__item"] img');

                    if (imgEl) {
                        imageUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
                    }
                }
            }

            if (productName) {
                results.push({
                    shopName: shop.name,
                    price: 0,
                    url: shop.url,
                    productName,
                    imageUrl
                });
            }
        }));

        // 3. Fallback: Google Books API (Great for books/media)
        try {
            const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${janCode}`);
            if (googleRes.ok) {
                const data = await googleRes.json();
                if (data.items && data.items.length > 0) {
                    const info = data.items[0].volumeInfo;
                    results.push({
                        shopName: 'GoogleBooks',
                        price: 0,
                        url: info.infoLink,
                        productName: info.title,
                        imageUrl: info.imageLinks?.thumbnail || ''
                    });
                }
            }
        } catch (e) {
            console.warn('Google Books fetch failed', e);
        }

        return results;
    },

    getBestPrice: (prices: ShopPrice[]) => {
        const validPrices = prices.filter(p => p.price > 0);
        if (validPrices.length === 0) return null;
        return validPrices.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    }
};
