import "server-only";
import { requestSorftime } from "@/server/sorftime/adapter";

type SorftimeCoinQueryResponse = {
  Coin?: number | string | null;
};

export async function querySorftimeCoinBalance() {
  return requestSorftime<SorftimeCoinQueryResponse, number | null>({
    apiName: "CoinQuery",
    marketplace: "US",
    body: {},
    mockData: 0,
    mapData: (data) => {
      const coin = data?.Coin;
      if (coin === null || coin === undefined) {
        return null;
      }

      const numericCoin = Number(coin);
      return Number.isFinite(numericCoin) ? numericCoin : null;
    }
  });
}
