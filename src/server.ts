import dotenv from "dotenv";
import axios from "axios";
import { init as initDb, connect as connectDb, query as queryDb } from "./config/mysqlConf";
import cron from "node-cron";

dotenv.config();

// 떠돌이 상인 시간 형식
interface WandderTime {
  inTime: string;
  outTime: string;
}

// 로스트아크 API 주소
const LOA_OPENAPI_URL: string = "https://developer-lostark.game.onstove.com/";
const LOA_OPENAPI_KEY: string = process.env.LOSTARK_OPENAPI_KEY;

// 로스트아크 API 설정
const gemstoneCategoryCode: number = 210000;
const gemstoneCategorySort: string = "BUY_PRICE";

// 보석 목록
const gemstoneArray: string[] = [
  "1레벨 멸화",
  "2레벨 멸화",
  "3레벨 멸화",
  "4레벨 멸화",
  "5레벨 멸화",
  "6레벨 멸화",
  "7레벨 멸화",
  "8레벨 멸화",
  "9레벨 멸화",
  "10레벨 멸화",
  "1레벨 홍염",
  "2레벨 홍염",
  "3레벨 홍염",
  "4레벨 홍염",
  "5레벨 홍염",
  "6레벨 홍염",
  "7레벨 홍염",
  "8레벨 홍염",
  "9레벨 홍염",
  "10레벨 홍염",
  "1레벨 겁화",
  "2레벨 겁화",
  "3레벨 겁화",
  "4레벨 겁화",
  "5레벨 겁화",
  "6레벨 겁화",
  "7레벨 겁화",
  "8레벨 겁화",
  "9레벨 겁화",
  "10레벨 겁화",
  "1레벨 작열",
  "2레벨 작열",
  "3레벨 작열",
  "4레벨 작열",
  "5레벨 작열",
  "6레벨 작열",
  "7레벨 작열",
  "8레벨 작열",
  "9레벨 작열",
  "10레벨 작열",
];

// API에서 데이터를 받아온다. (보석)
const fetchGemData = async (gemstoneName: string) => {
  const itemName = gemstoneName + "의 보석";
  const data = {
    CategoryCode: gemstoneCategoryCode,
    Sort: gemstoneCategorySort,
    ItemName: itemName,
  };
  try {
    await axios
      .post(LOA_OPENAPI_URL + "auctions/items", data, {
        headers: {
          accept: "application/json",
          authorization: "bearer " + LOA_OPENAPI_KEY,
        },
      })
      .then((response) => {
        const itemName = response.data.Items[0].Name;
        const itemTier = response.data.Items[0].Tier;
        const lowPrice = response.data.Items[0].AuctionInfo.BuyPrice;
        auctionDataInsert("GEMS", itemName, itemTier, lowPrice);
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  } catch (e) {
    console.error(e);
  }
};

// 재련재료 목록
type Material = {
  itemId: number;
  ItemName: string;
  CategoryCode: number;
};

const MaterialArray: Material[] = [
  { CategoryCode: 50010, itemId: 66102005, ItemName: "정제된 파괴강석" },
  { CategoryCode: 50010, itemId: 66102006, ItemName: "운명의 파괴석" },
  { CategoryCode: 50010, itemId: 66102007, ItemName: "운명의 파괴석 결정" },
  { CategoryCode: 50010, itemId: 66102105, ItemName: "정제된 수호강석" },
  { CategoryCode: 50010, itemId: 66102106, ItemName: "운명의 수호석" },
  { CategoryCode: 50010, itemId: 66102107, ItemName: "운명의 수호석 결정" },
  { CategoryCode: 50010, itemId: 66110224, ItemName: "찬란한 명예의 돌파석" },
  { CategoryCode: 50010, itemId: 66110225, ItemName: "운명의 돌파석" },
  { CategoryCode: 50010, itemId: 66110226, ItemName: "위대한 운명의 돌파석" },
  { CategoryCode: 50010, itemId: 6861011, ItemName: "최상급 오레하 융화 재료" },
  { CategoryCode: 50010, itemId: 6861012, ItemName: "아비도스 융화 재료" },
  { CategoryCode: 50010, itemId: 6861013, ItemName: "상급 아비도스 융화 재료" },
  { CategoryCode: 50010, itemId: 66130131, ItemName: "명예의 파편 주머니(소)" },
  { CategoryCode: 50010, itemId: 66130132, ItemName: "명예의 파편 주머니(중)" },
  { CategoryCode: 50010, itemId: 66130133, ItemName: "명예의 파편 주머니(대)" },
  { CategoryCode: 50010, itemId: 66130141, ItemName: "운명의 파편 주머니(소)" },
  { CategoryCode: 50010, itemId: 66130142, ItemName: "운명의 파편 주머니(중)" },
  { CategoryCode: 50010, itemId: 66130143, ItemName: "운명의 파편 주머니(대)" },
  { CategoryCode: 50020, itemId: 66111131, ItemName: "용암의 숨결" },
  { CategoryCode: 50020, itemId: 66111132, ItemName: "빙하의 숨결" },
  { CategoryCode: 51100, itemId: 66150010, ItemName: "에스더의 기운" },
];

// API에서 데이터를 받아온다. (쌀)
const fetchMaterial = async (item: Material) => {
  const { ItemName, CategoryCode } = item;
  const data = { ItemName, CategoryCode, ItemTier: 0 };
  try {
    await axios
      .post(LOA_OPENAPI_URL + "markets/trades", data, {
        headers: {
          accept: "application/json",
          authorization: "bearer " + LOA_OPENAPI_KEY,
        },
      })
      .then((response) => {
        const itemName = response.data.Items[0].Name;
        const itemTier = response.data.Items[0].Tier;
        const lowPrice = response.data.Items[0].RecentPrice;
        auctionDataInsert("MATERIAL", itemName, itemTier, lowPrice);
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  } catch (e) {
    console.error(e);
  }
};

// 모든 보석에 대해 데이터를 보냄
const main = async () => {
  for (const meterial of MaterialArray) {
    await fetchMaterial(meterial);
  }
  for (const gemstone of gemstoneArray) {
    await fetchGemData(gemstone);
  }
};

// MySQL에 데이터 입력 (경매데이터)
const auctionDataInsert = async (itemType: string, itemName: string, itemTier: string, itemAmount: string) => {
  const conn = initDb();
  await connectDb(conn);
  try {
    const insertColumns = "(item_tier, item_name, item_amount, item_registDate, item_registDateTime)";
    const insertQuery = `INSERT INTO LOA_AUCTION_${itemType}_PRICE ${insertColumns} VALUES (?,?,?,NOW(),NOW())`;
    const insertValues = [itemTier, itemName, itemAmount];
    const result = await queryDb(conn, insertQuery, insertValues);
    return result;
  } catch (error) {
    console.error("Query execution failed:", error);
    return null;
  } finally {
    conn.end();
  }
};

// 매 시간마자 작업 스캐줄링
// cron.schedule('*/5 * * * *', () => {
//     main();
// })
main();
