import type { ShopPrice } from '../types';

// 各ショップの検索URL生成ロジック
const SHOPS = [
    { name: '買取商店', urlGen: (_: string) => `https://www.kaitorishouten-co.jp/` },
    { name: '買取Wiki', urlGen: (jan: string) => `https://gamekaitori.jp/search?type=&q=${jan}` },
    { name: '買取ルデア', urlGen: (jan: string) => `https://kaitori-rudeya.com/search/index/${jan}/` },
    { name: '買取ソムリエ', urlGen: (_: string) => `https://somurie-kaitori.com/` },
    { name: '買取ホムラ', urlGen: (_: string) => `https://kaitori-homura.com/` },
    }
};
