import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/prices', async (req, res) => {
    const { jan } = req.query;

    if (!jan || typeof jan !== 'string') {
        return res.status(400).json({ error: 'JAN code is required' });
    }

    console.log(`Fetching metadata for JAN: ${jan}`);

    const shops = [
        {
            name: 'Rakuten',
            url: `https://search.rakuten.co.jp/search/mall/${jan}/`,
            selector: '.searchresultitem',
            fallback: true
        },
        {
            name: 'Yahoo',
            url: `https://shopping.yahoo.co.jp/search?first=1&tab_ex=commerce&fr=shp-prop&oq=&aq=&mcr=8294e2fb9a0654662467163317249936&ts=1700000000&p=${jan}`,
            selector: '.LoopList__item',
            fallback: true
        }
    ];

    const results = await Promise.all(shops.map(async (shop) => {
        try {
            const { data } = await axios.get(shop.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            let price = 0;
            let productName = '';
            let imageUrl = '';

            // Rakuten Metadata Fetching
            if (shop.name === 'Rakuten') {
                // Try multiple selectors for Rakuten
                const titleLink = $('.searchresultitem .title a').first();
                if (titleLink.length) {
                    productName = titleLink.text().trim();
                } else {
                    productName = $('div[class*="title"] a').first().text().trim();
                }

                const img = $('.searchresultitem .image img').first();
                if (img.length) {
                    imageUrl = img.attr('src') || img.attr('data-src') || '';
                    const altText = img.attr('alt');
                    if (altText && altText.length > productName.length) {
                        productName = altText;
                    }
                } else {
                    const fallbackImg = $('div[class*="image"] img').first();
                    imageUrl = fallbackImg.attr('src') || fallbackImg.attr('data-src') || '';
                }
            }

            // Yahoo Shopping Metadata Fetching
            if (shop.name === 'Yahoo') {
                const firstItem = $('li.LoopList__item').first();
                if (firstItem.length) {
                    const titleLink = firstItem.find('a.LoopList__itemTitle');
                    productName = titleLink.text().trim();

                    const img = firstItem.find('img');
                    imageUrl = img.attr('src') || img.attr('data-src') || '';
                }
            }

            // Price Extraction Logic
            const text = $('body').text();
            const priceRegex = /[¥￥]([0-9,]+)|([0-9,]+)円/g;
            let match;
            const foundPrices = [];

            while ((match = priceRegex.exec(text)) !== null) {
                const pStr = (match[1] || match[2]).replace(/,/g, '');
                const p = parseInt(pStr, 10);
                if (p > 100 && p < 1000000) {
                    foundPrices.push(p);
                }
            }

            if (foundPrices.length > 0) {
                price = Math.max(...foundPrices);
            }

            return {
                shopName: shop.name,
                price,
                url: shop.url,
                productName,
                imageUrl
            };

        } catch (error) {
            console.error(`Error fetching ${shop.name}:`, error.message);
            return {
                shopName: shop.name,
                price: 0,
                url: shop.url
            };
        }
    }));

    // Post-process: Pick the best metadata
    let bestName = '';
    let bestImage = '';

    results.forEach(r => {
        // Use Rakuten or Yahoo for metadata
        if (r.shopName === 'Rakuten' || r.shopName === 'Yahoo') {
            if (r.productName && r.productName.length > bestName.length) bestName = r.productName;
            if (r.imageUrl && !bestImage) bestImage = r.imageUrl;
        }
    });

    // Backfill metadata to all results
    const finalResults = results.map(r => ({
        ...r,
        productName: bestName || r.productName,
        imageUrl: bestImage || r.imageUrl
    }));

    res.json(finalResults);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
