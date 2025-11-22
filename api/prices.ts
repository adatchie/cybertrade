import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { jan } = req.query;

    if (!jan || typeof jan !== 'string') {
        return res.status(400).json({ error: 'JAN code is required' });
    }

    const shops = [
        {
            name: '買取商店',
            url: `https://www.kaitorishouten-co.jp/search/${jan}`,
            selector: '.price_num',
            fallback: true
        },
        {
            name: '買取Wiki',
            url: `https://gamekaitori.jp/search/result?keyword=${jan}`,
            selector: '.price',
            fallback: true
        },
        {
            name: '買取ルデア',
            url: `https://kaitori-rudeya.com/search/result?keyword=${jan}`,
            selector: '.price',
            fallback: true
        },
        {
            name: '買取ソムリエ',
            url: `https://somurie-kaitori.com/search/result?keyword=${jan}`,
            selector: '.price',
            fallback: true
        },
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

            const text = $('body').text();
            // Regex to find prices: ¥ followed by numbers or numbers followed by 円
            const priceRegex = /[¥￥]([0-9,]+)|([0-9,]+)円/g;
            let match;
            const foundPrices: number[] = [];

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
