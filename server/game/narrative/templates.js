/**
 * 冒險敘事模板
 * 按結果（win/lose/draw）和敵人難度分類
 * 基本變數：{npc} {enemy} {weapon} {place} {floor} {floorName} {rounds} {maxDamage} {smith}
 * 劍技變數：{skillName} {skillNameJp} {skillCount} {skillDamage} {chainMax}
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

  // ────────────────────────────────────────────
  // 劍技版敘事模板（有劍技發動時優先選用）
  // ────────────────────────────────────────────

  skillWin: {
    "[Easy]": [
      "{npc} 的 {weapon} 亮起了光芒——「{skillNameJp}！」劍技【{skillName}】一閃而過，{enemy} 連反應的機會都沒有就在 {place} 化為碎片。",
      "「去吧——{skillNameJp}！」{npc} 隨手發動了【{skillName}】，{weapon} 在 {place} 劃出一道華麗的軌跡，{enemy} 瞬間被斬殺。連熱身都不算。",
      "{place} 的空氣被劍壓撕裂。{npc} 見 {enemy} 逼近，{weapon} 發動劍技【{skillName}】輕鬆解決，{skillDamage} 點傷害對雜魚來說太過奢侈了。",
      "{enemy} 猛撲上來的瞬間，{npc} 的 {weapon} 已經在閃耀。「{skillNameJp}。」低語般的技名宣言後，戰鬥在 {place} 便已結束。",
    ],
    "[Normal]": [
      "{place} 的戰場上，{npc} 的 {weapon} 突然迸發出耀眼的光芒。「{skillNameJp}！」劍技【{skillName}】精準命中 {enemy}，造成了 {skillDamage} 點傷害，以 {rounds} 回合決定了勝負。",
      "纏鬥 {rounds} 回合後，{npc} 等到了破綻。{weapon} 爆發出劍技光輝——【{skillName}】！{skillDamage} 點的巨大傷害將 {enemy} 徹底擊潰。",
      "「好機會——{skillNameJp}！」{npc} 在 {place} 找到了 {enemy} 的空隙，{weapon} 發動劍技【{skillName}】一舉貫穿防線，第 {floor} 層再添一勝。",
      "{enemy} 的攻勢漸緩的一瞬，{npc} 的 {weapon} 綻放出劍技之光。【{skillName}】帶著 {skillDamage} 點傷害降臨，終結了這場 {place} 的戰鬥。",
    ],
    "[Hard]": [
      "鏖戰 {rounds} 回合，{npc} 幾近極限。然而就在那一瞬——{weapon} 爆發出炫目的光輝！「{skillNameJp}！」劍技【{skillName}】轟出 {skillDamage} 點傷害，逆轉了敗局！",
      "「{skillNameJp}——！」{npc} 在 {place} 咆哮著發動了劍技【{skillName}】。{weapon} 的軌跡劈開了 {enemy} 的防禦，{skillDamage} 點傷害帶來了血戰中的決定性一擊。",
      "{enemy} 以為勝券在握——直到 {npc} 的 {weapon} 燃起了劍技之光。【{skillName}】的 {skillDamage} 點傷害撕裂了一切，在 {place} 奇蹟般地逆轉了這場 {rounds} 回合的苦戰。",
      "滿身傷痕的 {npc} 低下了身子——不是認輸，而是蓄力。{weapon} 綻放光芒的一刻，{place} 響徹了「{skillNameJp}！」的怒吼，【{skillName}】以 {skillDamage} 點傷害終結了 {enemy}。",
    ],
    "[Hell]": [
      "地獄級的 {enemy} 幾乎擊碎了 {npc} 的所有希望——直到 {weapon} 發出了前所未見的光芒。「{skillNameJp}——！」劍技【{skillName}】以 {skillDamage} 點傷害創造了奇蹟！",
      "在 {place} 與 {enemy} 的生死惡鬥中，{npc} 的 {weapon} 突然爆發出凌厲的劍技之光。【{skillName}】——{skillDamage} 點！這一擊，連命運都被斬斷了。",
      "「就算是你——也要在這招前倒下！{skillNameJp}！」{npc} 以命相搏發動了劍技【{skillName}】。{weapon} 帶來的 {skillDamage} 點毀滅性傷害，終於撕開了地獄級 {enemy} 的不敗神話。",
      "第 {rounds} 回合，{npc} 的瞳孔中映出了死亡。然而肉體在意識之前動了——{weapon} 迸發劍技光芒，【{skillName}】以 {skillDamage} 點傷害一擊終結了 {enemy}。在 {place}，奇蹟確實存在。",
    ],
    "[優樹]": [
      "面對傳說中的 {enemy}，{npc} 已經做好了赴死的覺悟。然而——{weapon} 在絕望中綻放出從未見過的劍技光輝。「{skillNameJp}——！！」【{skillName}】以 {skillDamage} 點不可思議的傷害擊碎了超規格的怪物！",
      "「不可能……那個冒險者，居然在對那傢伙發動劍技？」周圍的倖存者不敢置信地看著 {npc} 的 {weapon} 在 {place} 大放異彩——【{skillName}】的一閃，造出了 {skillDamage} 點傷害的奇蹟。",
      "超規格的 {enemy} 以壓倒性的力量令一切黯然失色。但 {npc} 的靈魂拒絕屈服——{weapon} 爆發出極限的劍技【{skillName}】，{skillNameJp} 之名在 {place} 化為傳說。",
    ],
  },

  skillLose: {
    "[Easy]": [
      "{npc} 發動了劍技【{skillName}】，{weapon} 閃過一道光芒——然而 {enemy} 出乎意料地閃過了致命一擊。劍技後搖的空隙被抓住，在 {place} 反遭擊敗。",
      "「{skillNameJp}——」{npc} 的技名宣言還沒說完，{enemy} 已經鑽入了死角。劍技的後搖成了致命破綻，在 {place} 含恨落敗。",
      "{weapon} 的劍技之光確實閃耀了，但【{skillName}】未能完全命中。{enemy} 趁著後搖的空隙反擊，{npc} 在 {place} 意外敗北。",
    ],
    "[Normal]": [
      "{npc} 在第 {rounds} 回合發動了劍技【{skillName}】，{skillDamage} 點的傷害令 {enemy} 搖晃——卻沒有倒下。劍技後搖的致命瞬間，{enemy} 的反擊終結了一切。",
      "「{skillNameJp}！」{npc} 賭上一切的劍技在 {place} 綻放。然而 {enemy} 頑強地承受了【{skillName}】的 {skillDamage} 點傷害，並在後搖中給予了致命一擊。",
      "{weapon} 發出的劍技光芒在 {place} 劃過一道弧線，但這還不夠。{enemy} 在承受了【{skillName}】後仍然站立，而 {npc} 在 {rounds} 回合的體力消耗後已無力再戰。",
    ],
    "[Hard]": [
      "「{skillNameJp}——！」{npc} 在 {place} 拼死發動了【{skillName}】，{skillDamage} 點傷害確實削弱了 {enemy}。但強敵的生命力超乎想像，最終在第 {rounds} 回合被壓垮。",
      "劍技之光閃耀的一瞬，{npc} 以為看見了勝利。然而【{skillName}】的 {skillDamage} 點傷害對 {enemy} 來說仍然不夠——{weapon} 在 {place} 的苦戰中迎來了無奈的結局。",
      "{npc} 竭盡全力發動了劍技【{skillName}】，{weapon} 的光芒照亮了 {place}。但 {enemy} 的力量遠超極限——即使有劍技的加持，依然未能翻盤。",
    ],
    "[Hell]": [
      "「{skillNameJp}！」{npc} 的劍技在 {place} 炸裂。{skillDamage} 點傷害——但地獄級的 {enemy} 只是晃了晃。絕望的劍技後搖中，{npc} 被碾碎了最後的抵抗。",
      "即便發動了【{skillName}】，{weapon} 帶來的 {skillDamage} 點傷害在 {enemy} 面前也只是杯水車薪。地獄難度的現實，不是一招劍技能改變的。",
    ],
    "[優樹]": [
      "「{skillNameJp}——！」{npc} 在 {place} 發動了最強的劍技。{weapon} 綻放出極限的光輝——【{skillName}】的 {skillDamage} 點傷害確實打中了。但超規格的 {enemy} 依舊巍然不動。這就是，傳說的力量。",
      "面對傳說級的 {enemy}，{npc} 拿出了一切——包括劍技【{skillName}】。但 {skillDamage} 點傷害連對方的表皮都沒有劃破。活著回來，已是萬幸。",
    ],
  },

  skillDraw: {
    "[Easy]": [
      "{npc} 發動了劍技【{skillName}】，{weapon} 閃耀著光芒——但 {enemy} 以頑強的生命力撐了下來。{rounds} 回合後雙方都精疲力竭，在 {place} 不分勝負。",
      "「{skillNameJp}！」{npc} 的劍技命中了，卻沒能決定勝負。{enemy} 比想像中更加頑強，最終在 {place} 以平手告終。",
    ],
    "[Normal]": [
      "{npc} 的 {weapon} 發動了【{skillName}】，{skillDamage} 點傷害令 {enemy} 搖搖欲墜——但同時 {npc} 也被逼到了極限。{rounds} 回合後，在 {place} 以勢均力敵的姿態收場。",
      "「{skillNameJp}——」{npc} 的劍技切實地削弱了 {enemy}，然而自身也在 {rounds} 回合的消耗戰中耗盡了體力。{place} 的戰場上，雙方都無力再舉起武器。",
      "劍技【{skillName}】的光芒照亮了 {place}。{skillDamage} 點傷害不可謂不重，但 {enemy} 拒絕倒下，{npc} 也沒有餘力追擊，第 {floor} 層留下了一場未了的對決。",
    ],
    "[Hard]": [
      "「{skillNameJp}！」{npc} 在 {place} 拼盡全力發動了【{skillName}】——{skillDamage} 點！{enemy} 被打得踉蹌後退，但同樣的，{npc} 也在 {rounds} 回合的激鬥後站不起身。平手，但雙方都已超越了極限。",
      "{weapon} 的劍技之光與 {enemy} 的殺意在 {place} 正面碰撞。【{skillName}】的 {skillDamage} 點傷害與敵方的猛攻交織成了一場誰也無法贏下的死鬥。",
    ],
    "[Hell]": [
      "地獄級的 {enemy} 幾乎不可戰勝——但 {npc} 以劍技【{skillName}】撐住了。「{skillNameJp}……」{weapon} 最後的光芒與 {enemy} 的殺招同時熄滅，{place} 歸於寂靜。沒有贏家。",
      "劍技【{skillName}】以 {skillDamage} 點傷害重創了地獄級 {enemy}，但無法將其擊殺。{npc} 靠著 {weapon} 和劍技的力量保住了一條命——和 {enemy} 打成平手，本身就是壯舉。",
    ],
    "[優樹]": [
      "「{skillNameJp}——！」{npc} 面對傳說級 {enemy} 發動了劍技【{skillName}】，{weapon} 燃燒出極限的光芒。{skillDamage} 點傷害——不足以擊倒，但足以令傳說退卻。在 {place}，這已是奇蹟般的結局。",
    ],
  },
};

/**
 * Skill Connect 連鎖追加敘事
 * 當戰鬥中發生 Skill Connect 時附加到主敘事之後
 */
const CHAIN_TEMPLATES = {
  win: [
    "更驚人的是——{npc} 沒有停下。劍技的餘韻直接銜接了下一招，Skill Connect 的連鎖光芒在 {place} 綻放了 {chainMax} 次！這就是真正劍士的戰鬥方式。",
    "劍技發動的瞬間，{npc} 的身體已在自動連接下一招——Skill Connect ×{chainMax}！連鎖的劍光如流星雨般傾瀉而下，{enemy} 毫無招架之力。",
    "「還沒完——！」{npc} 的 {weapon} 在劍技後搖結束前便接上了下一擊。完美的 Skill Connect ×{chainMax}，連鎖的光芒在 {place} 編織出了一幅華麗的殺陣。",
  ],
  lose: [
    "儘管 {npc} 展現了 Skill Connect ×{chainMax} 的連鎖劍技，{weapon} 的光芒一度照亮了整個 {place}——但這還不夠。連鎖結束的一瞬，{enemy} 的反擊將一切終結。",
    "Skill Connect ×{chainMax}——{npc} 拼上了所有的劍技連鎖。然而連續的技能消耗也透支了體力，最終的空隙被 {enemy} 無情地抓住。",
  ],
  draw: [
    "Skill Connect ×{chainMax} 的連鎖劍技在 {place} 炸裂，{enemy} 被打得節節敗退——卻在最後關頭站穩了腳步。劍技連鎖耗盡了 {npc} 最後的力氣，雙方以這壯烈的姿態握手言和。",
    "{npc} 以 Skill Connect ×{chainMax} 的華麗連鎖將 {enemy} 逼入了絕境，但連鎖結束的後搖也讓自己暴露了破綻。最終的結局——勢均力敵。",
  ],
};

module.exports = { TEMPLATES, CHAIN_TEMPLATES };
