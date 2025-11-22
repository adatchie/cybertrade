import type { VercelRequest, VercelResponse } from '@vercel/node';
{
    name: '買取ホムラ',
        url: `https://kaitori-homura.com/search?q=${jan}`,
            selector: '.price',
                fallback: true
}
    ];

const results = await Promise.all(shops.map(async (shop) => {
    try {
        const { data } = await axios.get(shop.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 5000
        });

        const $ = cheerio.load(data);
        let price = 0;

        // 1. Try specific selector if we knew it (we don't exactly, so we try generic)
        // 2. Try searching for the JAN code in the page to ensure relevance, then look for price nearby.
        // 3. Brute force regex for price-like strings (¥10,000 or 10,000円) and take the max reasonable one.

        const text = $('body').text();
        // Regex to find prices: ¥ followed by numbers or numbers followed by 円
        const priceRegex = /[¥￥]([0-9,]+)|([0-9,]+)円/g;
        let match;
        const foundPrices: number[] = [];

        while ((match = priceRegex.exec(text)) !== null) {
            const pStr = (match[1] || match[2]).replace(/,/g, '');
            const p = parseInt(pStr, 10);
            // Filter out unlikely prices (too small like 0-100 yen, or dates like 2023)
            if (p > 100 && p < 1000000) {
                foundPrices.push(p);
            }
        }

        if (foundPrices.length > 0) {
            // Heuristic: The buy price is often the highest prominent number, 
            // but sometimes the "selling" price is higher. 
            // For resale shops, usually only buy price is listed prominently.
            price = Math.max(...foundPrices);
        }

        return {
            shopName: shop.name,
            price,
            url: shop.url
        };

    } catch (error) {
        console.error(`Error fetching ${shop.name}:`, error);
        return {
            shopName: shop.name,
            price: 0,
            url: shop.url
        };
    }
}));

res.status(200).json(results);
}
