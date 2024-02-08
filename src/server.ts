import dotenv from 'dotenv'
import axios from 'axios'
import { init as initDb, connect as connectDb, query as queryDb } from './config/mysqlConf'
import cron from 'node-cron'

dotenv.config();

// 로스트아크 API 주소
const LOA_OPENAPI_URL:string = 'https://developer-lostark.game.onstove.com/';
const LOA_OPENAPI_KEY:string = process.env.LOSTARK_OPENAPI_KEY;

// 로스트아크 API 설정
const gemstoneCategoryCode:number = 210000;
const gemstoneCategorySort:string = 'BUY_PRICE';

// 보석 목록
const gemstoneArray:string[] = [
    '1레벨 멸화',
    '2레벨 멸화',
    '3레벨 멸화',
    '4레벨 멸화',
    '5레벨 멸화',
    '6레벨 멸화',
    '7레벨 멸화',
    '8레벨 멸화',
    '9레벨 멸화',
    '10레벨 멸화',
    '1레벨 홍염',
    '2레벨 홍염',
    '3레벨 홍염',
    '4레벨 홍염',
    '5레벨 홍염',
    '6레벨 홍염',
    '7레벨 홍염',
    '8레벨 홍염',
    '9레벨 홍염',
    '10레벨 홍염'
];

// API에서 데이터를 받아온다.
const fetchData = async (gemstoneName) => {
    const itemName = gemstoneName + '의 보석';
    const data = {
        CategoryCode: gemstoneCategoryCode,
        Sort: gemstoneCategorySort,
        ItemName: itemName,
    }
    try {
        const response = await axios.post(LOA_OPENAPI_URL + 'auctions/items', data, {
            headers: {
                'accept': 'application/json',
                'authorization' : 'bearer ' + LOA_OPENAPI_KEY
            }
        })
        .then(response => {
            const itemName = response.data.Items[0].Name;
            const itemTier = response.data.Items[0].Tier;
            const lowPrice = response.data.Items[0].AuctionInfo.BuyPrice;
            auctionDataInsert(itemName, itemTier, lowPrice);
        })
        .catch(error => {
            console.error('Error: ', error);
        })
    } catch(e) {
        console.error(e);
    }
};

// 모든 보석에 대해 데이터를 보냄
const main = async () => {
    for(const gemstone of gemstoneArray) {
        await fetchData(gemstone);
    }
}

// MySQL에 데이터 입력
const auctionDataInsert = async (itemName, itemTier, itemAmount) => {
    const conn = initDb();
    await connectDb(conn);
    try {
        const insertColumns = '(item_tier, item_name, item_amount, item_registDateTime)';
        const insertQuery = 'INSERT INTO LOA_AUCTION_GEMS_PRICE ' + insertColumns + ' VALUES (?,?,?,NOW())';
        const insertValues = [itemTier, itemName, itemAmount];
        const result = await queryDb(conn, insertQuery, insertValues);
        return result;
    } catch (error) {
        console.error('Query execution failed:', error);
        return null;
    } finally {
        conn.end();
    }
}

// 매 시간마자 작업 스캐줄링
cron.schedule('0 * * * *', () => {
    main();
})
