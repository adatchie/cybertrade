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
            url: `https://www.kaitorishouten-co.jp/`,
            selector: '.price_num',
            fallback: true
        },
        {
            name: '買取Wiki',
            url: `https://gamekaitori.jp/search?type=&q=${jan}`,
            selector: '.price',
            fallback: true
        },
        {
            name: '買取ルデア',
            url: `https://kaitori-rudeya.com/search/index/${jan}/`,
            selector: '.price',
            fallback: true
        },
        {
            name: '買取ソムリエ',
            url: `https://somurie-kaitori.com/`,
            selector: '.price',
            fallback: true
        },
        {
            name: '買取ホムラ',
            url: `https://kaitori-homura.com/`,
            selector: '.price',
            fallback: true
        }
    ];

    const results = await Promise.all(shops.map(async (shop) => {
        try {
            // Skip fetching for shops that are just homepage links
            if (['買取商店', '買取ソムリエ', '買取ホムラ'].includes(shop.name)) {
                return {
                    shopName: shop.name,
                    price: 0,
                    url: shop.url
                };
            }

            const { data } = await axios.get(shop.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 10000 // Increase timeout
            });

            const $ = cheerio.load(data);
            let price = 0;
            let productName = '';
            let imageUrl = '';

            // Scrape metadata if it's Kaitori Wiki (good source for names)
            if (shop.name === '買取Wiki') {
                productName = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
                // Clean up title (remove site name etc if needed)
                productName = productName.replace(' | 買取Wiki', '').replace('検索結果', '').trim();

                imageUrl = $('meta[property="og:image"]').attr('content') || '';
            }

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
                url: shop.url,
                productName, // Return these
                imageUrl
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
