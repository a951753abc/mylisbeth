/**
 * 冒險敘事模板
 * 按結果（win/lose/draw）和敵人難度分類
 * 支援變數：{npc} {enemy} {weapon} {place} {floor} {floorName} {rounds} {maxDamage}
 */

const TEMPLATES = {
  win: {
    "[Easy]": [
      "{npc} 在 {place} 遭遇了 {enemy}。雙方交鋒，{npc} 揮動著 {weapon} 乾淨俐落地解決了對手，戰鬥不過片刻便已結束。",
      "「這傢伙不是對手。」{npc} 低聲說道，在 {place} 以 {weapon} 輕鬆制服了 {enemy}，甚至沒有喘一口氣。",
      "{place} 的空氣微微震動。{npc} 見到 {enemy} 衝來，沉著地側身閃過，{weapon} 一揮，漂亮地結束了這場遭遇戰。",
      "{enemy} 猛衝而上，然而 {npc} 的反應遠比它快。{weapon} 在 {place} 的光線下閃過一道弧光，{enemy} 化成了碎片。",
      "第 {floor} 層的 {place}，{npc} 以 {weapon} 三兩下便解決了擋路的 {enemy}。「鍛造師 {smith} 的武器真不錯。」",
    ],
    "[Normal]": [
      "{npc} 與 {enemy} 在 {place} 展開激戰，{rounds} 個回合的纏鬥後，{weapon} 終於貫穿了對方的防禦，將其擊倒。",
      "「不讓你通過！」{enemy} 嘶吼著，然而 {npc} 握緊 {weapon}，在 {rounds} 回合的激烈交鋒後取得了勝利。",
      "{place} 的石壁上留下了戰鬥的痕跡。{npc} 與 {enemy} 打得旗鼓相當，但最終 {weapon} 的鋒芒佔了上風。",
      "劍光交錯間，{npc} 的 {weapon} 精準地找到了 {enemy} 的破綻，將其一舉擊潰。第 {floor} 層的戰場再添一勝。",
    ],
    "[Hard]": [
      "血腥的 {rounds} 回合鏖戰後，{npc} 終於以 {weapon} 擊倒了強大的 {enemy}。雙膝微微顫抖，但眼神依然堅定。",
      "「這種程度——還不夠！」{npc} 咬牙撐過 {enemy} 的猛攻，在 {place} 尋得一絲破綻，以 {weapon} 決定性一擊結束了戰鬥。",
      "{enemy} 的攻擊一度讓 {npc} 退至牆角，然而危機之中，{weapon} 爆發出驚人的力量，逆轉了戰局，在 {place} 取得了艱辛的勝利。",
      "{place} 的地面滿是戰鬥留下的痕跡。{npc} 以 {weapon} 硬是在連續 {rounds} 回合的苦戰後擊敗了 {enemy}，耗盡了大半力氣。",
    ],
    "[Hell]": [
      "在 {place} 與 {enemy} 的惡戰持續了整整 {rounds} 回合。{npc} 已精疲力竭，然而 {weapon} 最後一刻的爆擊決定了勝負。",
      "地獄難度的 {enemy} 令 {npc} 招架得狼狽不堪，但強大的裝備 {weapon} 帶來了關鍵的 {maxDamage} 點暴擊傷害，最終以些微差距逆轉。",
      "「你……還挺能打的。」{enemy} 倒下前沙啞地說道。{npc} 靠著 {weapon} 撐過了這場幾乎讓他喪命的惡鬥，在 {place} 艱難獲勝。",
      "每一回合都是生死之交。{npc} 與 {enemy} 的戰鬥將 {place} 的空氣都燃燒成了赤紅，最終 {weapon} 帶來了 {maxDamage} 點傷害，終結一切。",
    ],
    "[優樹]": [
      "傳說中的 {enemy} 降臨 {place}。{npc} 幾乎絕望，然而 {weapon} 在危急時刻爆發出了難以置信的力量，以 {maxDamage} 點傷害終結了這場奇蹟般的戰鬥！",
      "面對超規格的 {enemy}，{npc} 的手都在顫抖。但 {weapon} 沒有讓他失望——連續暴擊，最高達 {maxDamage} 點傷害，以命換命地取得了勝利。",
      "「這就是鍛造師打造的武器嗎……」{enemy} 驚呼著崩解消散。{npc} 在 {place} 奇蹟般地擊敗了這個原本不可能戰勝的對手，全憑 {weapon} 的力量。",
    ],
  },

  lose: {
    "[Easy]": [
      "{npc} 輕敵了。{enemy} 出乎意料地兇猛，{weapon} 雖奮力揮舞，仍未能防住最後一擊，在 {place} 含恨落敗。",
      "「怎麼可能……」{npc} 跌倒在 {place}，難以置信地看著擊敗自己的 {enemy}。就算是弱小的敵人，也絕不能大意。",
      "{enemy} 的動作出乎意料地迅速，{npc} 的 {weapon} 反應慢了半拍，在 {place} 吃下了敗仗。",
    ],
    "[Normal]": [
      "{place} 的戰鬥讓 {npc} 付出了慘痛代價。{enemy} 硬生生磨穿了 {weapon} 帶來的防線，在第 {rounds} 回合終結了這場對決。",
      "「退下！」{enemy} 的攻勢滔滔不絕，{npc} 以 {weapon} 奮力抵擋，仍於第 {rounds} 回合在 {place} 力竭落敗。",
      "{npc} 的判斷出了問題——{enemy} 比預想的更難纏。{weapon} 的耐久在苦戰中消耗殆盡，最終無力回天。",
    ],
    "[Hard]": [
      "{place} 迴盪著 {npc} 落敗的沉重聲響。{enemy} 的力量遠超預期，{weapon} 雖已發揮極限，仍在第 {rounds} 回合飲恨。",
      "「下次……一定會贏。」{npc} 在 {place} 咬牙撐到了第 {rounds} 回合，但強大的 {enemy} 最終佔了上風，{weapon} 無力迴天。",
      "這場戰鬥從一開始就充滿不利的預兆。{enemy} 以壓倒性的攻勢在 {place} 將 {npc} 一舉擊潰，{weapon} 也無法改變結局。",
    ],
    "[Hell]": [
      "{enemy} 宛如災難降臨。{npc} 全力揮動 {weapon}，卻在 {place} 被碾壓般擊潰——這就是地獄難度的現實。",
      "沒有僥倖，沒有奇蹟。{enemy} 在 {place} 以絕對的強大壓垮了 {npc}，{weapon} 的每一擊都被輕鬆化解。這次的教訓代價慘重。",
      "「你還不夠強。」{enemy} 的每一擊都如山嶽壓頂，{npc} 在 {place} 被這場地獄級戰鬥徹底擊潰，{weapon} 也留下了深深的傷痕。",
    ],
    "[優樹]": [
      "「那個……是什麼？」{npc} 在 {place} 遭遇了傳說中的 {enemy}，無論如何奮戰，{weapon} 的攻擊如同撓癢。毫無懸念地落敗了。",
      "超出規格的 {enemy} 降臨，{npc} 的 {weapon} 無法在這場戰鬥中發揮應有的作用。活著回來，就已經是勝利了。",
    ],
  },

  draw: {
    "[Easy]": [
      "{npc} 與 {enemy} 在 {place} 打了個平手——沒想到這麼小的傢伙還挺能撐的。最終雙方都疲憊地撤退。",
      "「你夠頑強的。」{npc} 對著頑強的 {enemy} 說道，{rounds} 回合後仍未能分出勝負，雙方在 {place} 各自撤離。",
    ],
    "[Normal]": [
      "{rounds} 個回合的激戰，{npc} 與 {enemy} 在 {place} 不分軒輊。{weapon} 雖給予對手不小的壓力，卻始終無法給予決定性一擊。",
      "勢均力敵的戰鬥。{npc} 以 {weapon} 全力搏殺，{enemy} 卻也頑強地撐過了 {rounds} 回合，最終在 {place} 以平手收場。",
      "第 {floor} 層的 {place} 見證了一場膠著的戰鬥。{npc} 與 {enemy} 彼此都留下了深深的印記，卻無法分出勝負。",
    ],
    "[Hard]": [
      "硬碰硬的 {rounds} 回合後，{npc} 與強敵 {enemy} 在 {place} 握成了平手。{weapon} 發揮了最大功效，但對方實力同樣不容小覷。",
      "「下次再來！」{npc} 在 {place} 喘著粗氣，{enemy} 同樣遍體鱗傷。{rounds} 回合的惡鬥後，沒有誰能宣稱取得了勝利。",
    ],
    "[Hell]": [
      "傳說中這種敵人不可能被平手——然而 {npc} 與 {enemy} 在 {place} 的 {rounds} 回合激鬥，偏偏就出現了這個奇蹟般的結局。{weapon} 功不可沒。",
      "{enemy} 的力量足以讓人絕望，但 {npc} 死撐著 {weapon} 硬是拖過了 {rounds} 回合。沒有勝利，但活下來本身就是奇蹟。",
    ],
    "[優樹]": [
      "與超規格的 {enemy} 打成平手——這本身就已是傳奇。{npc} 握著 {weapon}，在 {place} 以不可思議的意志力撐完了 {rounds} 回合。",
    ],
  },
};

module.exports = TEMPLATES;
