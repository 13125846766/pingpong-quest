import { describe, expect, it } from "vitest";
import { stages } from "../src/content";
import { MemoryStorage } from "../src/platform/mock";
import {
  checksum,
  freshSave,
  SaveStore,
  type Result,
} from "../src/persistence/save";
import { Economy, unlocked } from "../src/progression/economy";
const setup = () => {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  return { storage, store, economy: new Economy(store) };
};
const result = (
  stageId = "SH01",
  id = "result-1",
  patch: Partial<Result> = {},
): Result => ({
  id,
  stageId,
  won: true,
  stars: 3,
  playerScore: 5,
  aiScore: 0,
  precise: 1,
  hits: 12,
  duration: 45,
  expert: false,
  ...patch,
});
describe("成长与事务", () => {
  it("108关首通总量为24680金币/5940积分/162碎片", () => {
    const { store, economy } = setup();
    for (const stage of stages) {
      expect(unlocked(store.data, stage.id)).toBe(true);
      economy.start(stage.id);
      economy.finish(result(stage.id, stage.id));
      economy.claim(stage.id);
      economy.dismiss();
      if (stage.id === "PA06") {
        expect(store.data.coins).toBe(4280);
        expect(store.data.careerXp).toBe(990);
        expect(store.data.skinShards).toBe(27);
        expect(store.data.ownedSkins).not.toContain("champion_gold");
      }
    }
    expect(store.data.coins).toBe(24680);
    expect(store.data.careerXp).toBe(5940);
    expect(store.data.skinShards).toBe(162);
    expect(store.data.cityRewardsClaimed).toHaveLength(18);
    expect(store.data.ownedRackets).toHaveLength(4);
    expect(store.data.ownedSkins).toContain("champion_gold");
    expect(store.data.ownedSkins).toContain("pixel");
  });
  it("旧存档保留装备、金币和冠军外观，从北京接着打", () => {
    const { store, storage } = setup();
    store.transact((save) => {
      for (const stage of stages.slice(0, 18))
        save.stageProgress[stage.id] = { cleared: true, stars: 3, wins: 1 };
      save.cityRewardsClaimed = ["shanghai", "tokyo", "paris"];
      save.coins = 120;
      save.careerXp = 990;
      save.skinShards = 27;
      save.racketLevels.balanced = 5;
      save.ownedSkins.push("champion_gold");
      save.equippedSkin = "champion_gold";
    });
    const restored = new SaveStore(storage);
    expect(restored.data.coins).toBe(120);
    expect(restored.data.racketLevels.balanced).toBe(5);
    expect(restored.data.equippedSkin).toBe("champion_gold");
    expect(Object.keys(restored.data.stageProgress)).toHaveLength(18);
    expect(unlocked(restored.data, "BJ01")).toBe(true);
    expect(unlocked(restored.data, "CD01")).toBe(false);
    const economy = new Economy(restored);
    economy.start("BJ01");
    economy.finish(result("BJ01", "first-beijing"));
    economy.claim("first-beijing");
    expect(restored.data.coins).toBe(300);
    expect(restored.data.skinShards).toBe(28);
  });
  it("首通、城市奖励、星级和同一个结果都不重复领取", () => {
    const { store, economy } = setup();
    economy.start("SH01");
    economy.finish(result());
    economy.claim("result-1");
    economy.claim("result-1");
    expect(store.data.coins).toBe(380);
    economy.dismiss();
    economy.start("SH01");
    economy.finish(result("SH01", "repeat", { stars: 1 }));
    economy.claim("repeat");
    expect(store.data.coins).toBe(480);
    expect(store.data.careerXp).toBe(75);
    expect(store.data.stageProgress.SH01?.stars).toBe(3);
  });
  it("每关前三次失败奖励20，后续零，主动退出零", () => {
    const { store, economy } = setup();
    for (let i = 0; i < 5; i++) {
      economy.start("SH01");
      economy.finish(result("SH01", "loss" + i, { won: false, stars: 0 }));
      economy.claim("loss" + i);
      economy.dismiss();
    }
    expect(store.data.coins).toBe(260);
    economy.start("SH01");
    economy.abandon();
    expect(store.data.coins).toBe(260);
  });
  it("金币不足与未拥有球拍不会部分扣款，满级不可再升级", () => {
    const { store, economy } = setup();
    economy.upgrade("balanced");
    expect(store.data.coins).toBe(0);
    expect(store.data.racketLevels.balanced).toBe(2);
    expect(() => economy.upgrade("balanced")).toThrow("金币不足");
    expect(() => economy.upgrade("attack")).toThrow("还没获得");
    store.transact((s) => {
      s.coins = 2400;
      s.racketLevels.balanced = 1;
    });
    for (let i = 0; i < 4; i++) economy.upgrade("balanced");
    expect(store.data.coins).toBe(0);
    expect(() => economy.upgrade("balanced")).toThrow("满级");
  });
  it("高手不产生首通、城市、星级奖励，不改标准难度", () => {
    const { store, economy } = setup();
    store.transact((s) => {
      s.careerXp = 540;
      s.stageProgress.SH01 = { cleared: true, stars: 1, wins: 1 };
    });
    economy.start("SH01", true);
    economy.finish(result("SH01", "expert", { expert: true }));
    economy.claim("expert");
    expect(store.data.coins).toBe(300);
    expect(store.data.stageProgress.SH01?.stars).toBe(1);
    expect(stages[0]?.difficulty).toBe(1);
  });
  it("指定皮肤兑换扣正确资源，无法装备未拥有皮肤", () => {
    const { store, economy } = setup();
    expect(() => economy.skin("mint")).toThrow();
    store.transact((s) => {
      s.coins = 300;
      s.skinShards = 12;
    });
    economy.skin("mint");
    expect(store.data.coins).toBe(0);
    economy.skin("porcelain");
    expect(store.data.skinShards).toBe(0);
    expect(store.data.equippedSkin).toBe("porcelain");
    expect(() => economy.skin("champion_gold")).toThrow();
  });
  it("未解锁关卡不能开始", () => {
    const { economy } = setup();
    expect(() => economy.start("TK01")).toThrow("先打完上一关");
  });
  it("存储写入失败时金币与等级一并回滚", () => {
    const { storage, store, economy } = setup();
    storage.set = () => {
      throw new Error("full");
    };
    expect(() => economy.upgrade("balanced")).toThrow("full");
    expect(store.data.coins).toBe(200);
    expect(store.data.racketLevels.balanced).toBe(1);
  });
});
describe("存档恢复", () => {
  it("没有存档时初始化", () => expect(setup().store.data.coins).toBe(200));
  it("最新槽损坏时恢复上一有效revision", () => {
    const { storage, store } = setup();
    store.transact((s) => {
      s.coins = 300;
    });
    store.transact((s) => {
      s.coins = 500;
    });
    storage.set("pp.save.0", "broken");
    const recovered = new SaveStore(storage);
    expect(recovered.data.coins).toBe(300);
    expect(recovered.message).toContain("备用");
  });
  it("两个槽损坏时明确提示，不静默假装读取成功", () => {
    const storage = new MemoryStorage();
    storage.set("pp.save.0", "broken");
    storage.set("pp.save.1", "bad");
    const store = new SaveStore(storage);
    expect(store.message).toContain("均无法读取");
    expect(storage.get("pp.save.0")).toBe("broken");
  });
  it("v1存档迁移保留币与外观", () => {
    const storage = new MemoryStorage();
    const old = {
      ...freshSave(),
      schemaVersion: 1,
      coins: 876,
      ownedSkins: ["classic", "mint"],
      equippedSkin: "mint",
    };
    const payload = JSON.stringify(old);
    storage.set(
      "pp.save.0",
      JSON.stringify({ payload, checksum: checksum(payload) }),
    );
    const store = new SaveStore(storage);
    expect(store.data.schemaVersion).toBe(2);
    expect(store.data.coins).toBe(876);
    expect(store.data.equippedSkin).toBe("mint");
  });
  it("pointer写入失败仍可按最高revision恢复", () => {
    const { storage, store } = setup();
    const set = storage.set.bind(storage);
    storage.set = (key, value) => {
      if (key === "pp.save.current") throw new Error("pointer failed");
      set(key, value);
    };
    store.transact((s) => {
      s.coins = 321;
    });
    expect(new SaveStore(storage).data.coins).toBe(321);
  });
  it("非法存档导入拒绝，重置后两槽均为新进度", () => {
    const { storage, store } = setup();
    store.transact((s) => {
      s.coins = 5000;
    });
    expect(() =>
      store.import(JSON.stringify({ ...freshSave(), coins: -1 })),
    ).toThrow();
    store.reset();
    expect(new SaveStore(storage).data.coins).toBe(200);
  });
});
