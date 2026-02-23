const typeList = { mine: "挖礦", forge: "鍛造", adv: "冒險" };
const ssrList = { 4: "★★★★", 3: "★★★", 2: "★★", 1: "★" };

module.exports = function (type) {
    return typeList[type];
};

module.exports.ssrList = function (rare) {
    return ssrList[rare];
};
