const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

module.exports.connect = async function () {
    await client.connect();
    db = client.db("lisbeth");
    console.log("MongoDB connected!");
};

module.exports.findOne = async function (collectName, query) {
    const collection = db.collection(collectName);
    return await collection.findOne(query);
};

module.exports.find = async function (collectName, query) {
    const collection = db.collection(collectName);
    return await collection.find(query).toArray();
};

module.exports.insertOne = async function (collectName, value) {
    const collection = db.collection(collectName);
    await collection.insertOne(value);
};

module.exports.update = async function (collectName, filter, newValue) {
    const collection = db.collection(collectName);
    await collection.updateOne(filter, newValue);
};

module.exports.aggregate = async function (collectName, filter) {
    const collection = db.collection(collectName);
    return await collection.aggregate(filter).toArray();
};

module.exports.updateCooldown = async function (userId) {
    const now = Date.now();
    await module.exports.update("user", { userId }, { $set: { move_time: now } });
};

module.exports.saveItemToUser = async function (userId, userItemStock, mine) {
    const _ = require('lodash');
    const query = { userId };
    const item = _.filter(userItemStock, { itemId: mine.itemId, itemLevel: mine.level.itemLevel });
    const itemNum = _.get(item[0], "itemNum", undefined);
    if (itemNum === undefined) {
        const newValue = { $push: { itemStock: { itemId: mine.itemId, itemLevel: mine.level.itemLevel, itemNum: 1, itemName: mine.name } } };
        await module.exports.update("user", query, newValue);
    } else {
        const matchQuery = { userId, itemStock: { itemId: mine.itemId, itemLevel: mine.level.itemLevel, itemNum, itemName: mine.name } };
        const newValue = { $inc: { "itemStock.$.itemNum": 1 } };
        await module.exports.update("user", matchQuery, newValue);
    }
};
