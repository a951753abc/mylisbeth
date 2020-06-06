const typeList = {mine:"挖礦"};
const ssrList = {3:"★★★", 2:"★★", 1:"★"};
module.exports = function (type) {
    return typeList[type];
}
module.exports.ssrList = function (rare) {
    return ssrList[rare];
}
