module.exports.d66 = function () {
    let diceOne = Math.floor(Math.random()*6)+1;
    let diceTwo = Math.floor(Math.random()*6)+1;
    return diceOne + diceTwo;
}
module.exports.d6 = function () {
    return Math.floor(Math.random()*6)+1;
}