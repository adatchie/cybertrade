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
            let match;
            const foundPrices: number[] = [];

            while((match = priceRegex.exec(text)) !== null) {
                const pStr = (match[1] || match[2]).replace(/,/g, '');
                const p = parseInt(pStr, 10);
                if(p > 100 && p < 1000000) {
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
    console.error(`Error fetching ${shop.name}:`, error);
    return {
        shopName: shop.name,
        price: 0,
        url: shop.url
    };
}
}));

res.status(200).json(finalResults);
}
