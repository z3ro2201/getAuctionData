import dotenv from 'dotenv'
import axios from 'axios'
import { init as initDb, connect as connectDb, query as queryDb } from './config/mysqlConf'
import cron from 'node-cron'

dotenv.config();

// 떠돌이 상인 시간 형식
interface WandderTime {
    inTime: string;
    outTime: string;
}

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
    '10레벨 홍염',
    '1레벨 겁화',
    '2레벨 겁화',
    '3레벨 겁화',
    '4레벨 겁화',
    '5레벨 겁화',
    '6레벨 겁화',
    '7레벨 겁화',
    '8레벨 겁화',
    '9레벨 겁화',
    '10레벨 겁화',
    '1레벨 작열',
    '2레벨 작열',
    '3레벨 작열',
    '4레벨 작열',
    '5레벨 작열',
    '6레벨 작열',
    '7레벨 작열',
    '8레벨 작열',
    '9레벨 작열',
    '10레벨 작열'
];

// 떠돌이 상인 시간
const wanderTimeList: WandderTime[] = [
    { inTime: '4:00', outTime: '9:30' },
    { inTime: '10:00', outTime: '15:30' },
    { inTime: '16:00', outTime: '21:30' },
    { inTime: '22:00', outTime: '3:30' },
];

// 로스트아크 서버
const LOA_SERVER_LIST:string[] = ['루페온', '실리안', '아만', '아브렐슈드', '카단', '카마인', '카제로스', '니나브'];

// API에서 데이터를 받아온다.
const fetchGemData = async (gemstoneName) => {
    const itemName = gemstoneName + '의 보석';
    const data = {
        CategoryCode: gemstoneCategoryCode,
        Sort: gemstoneCategorySort,
        ItemName: itemName,
    }
    try {
        await axios.post(LOA_OPENAPI_URL + 'auctions/items', data, {
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

// 떠돌이 상인 데이터 가져오기
const fetchWanderData = async () => {
    const getWanderApi:string = process.env.WANDER_API_URL;
    try {
        for (let i = 0; i <= LOA_SERVER_LIST.length; i++) {
            const currentTime = new Date();
            const currentHours = currentTime.getHours();
            const currentMinutes = currentTime.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            const serverKey = i + 1;
            let legends = 0;
            await axios.get(getWanderApi + serverKey) // getWanderApi는 호출할 API의 URL이어야 합니다. 여기서는 serverName을 사용하는 방식을 추가해야 할 것 같습니다.
            .then(response => {
                const res = response.data.merchants;
                const wanderTempData = [];
                res.map(data => {
                    const dataCreateTime = data.created_at;
                    const continentName = data.continent;
                    const itemTmp = [];
                    let itemHero = 0;
                    let itemLegend = 0;
                    for(const item of data.items) {
                        if(item.type === 0) {
                            itemTmp.push(item.content + '카드');
                        } else if(item.type == 1 && item.content === '0' && itemHero == 0) {
                            itemTmp.push('영웅 호감도');
                            itemHero = 1
                        } else if (item.type === 1 && item.content === '1' && itemLegend === 0) {
                            itemTmp.push('전설 호감도');
                            legends++;
                            itemLegend = 0;
                        } else if (item.type === 2) itemTmp.push(item.content);
                    };
                    wanderTempData.push({
                        worldName: LOA_SERVER_LIST[i],
                        continentName: continentName,
                        itemList: itemTmp
                    })
                });
                console.log(wanderTempData);
            })
            .catch(error => {
                console.error("Error fetching data:", error);
            });
        }
    } catch (error) {
        console.log(error)
    }
};

// 모든 보석에 대해 데이터를 보냄
const main = async () => {
    // for(const gemstone of gemstoneArray) {
    //     await fetchGemData(gemstone);
    // }
    fetchWanderData();
}

// MySQL에 데이터 입력 (경매데이터)
const auctionDataInsert = async (itemName, itemTier, itemAmount) => {
    const conn = initDb();
    await connectDb(conn);
    try {
        const insertColumns = '(item_tier, item_name, item_amount, item_registDate, item_registDateTime)';
        const insertQuery = 'INSERT INTO LOA_AUCTION_GEMS_PRICE ' + insertColumns + ' VALUES (?,?,?,NOW(),NOW())';
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
// cron.schedule('*/5 * * * *', () => {
//     main();
// })
main();