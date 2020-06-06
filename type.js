const typeList = {mine:"挖礦"};
const ssrList = {3:"SSR", 2:"SR", 1:"R"};
module.exports = function (type) {
    return typeList[type];
}
module.exports.ssrList = function (rare) {
    return ssrList[rare];
}
