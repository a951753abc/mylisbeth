const { MongoClient } = require('mongodb');
const auth = require("./auth.js");
const uri = auth.uri;

// 建立一個單一的客戶端實例
const client = new MongoClient(uri, { useUnifiedTopology: true });
let db;

// 連接資料庫，並在應用程式啟動時調用一次
module.exports.connect = async function () {
    try {
        await client.connect();
        db = client.db("lisbeth");
        console.log("MongoDB connected!");
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1); // 連線失敗時直接結束程式
    }
}

module.exports.findOne = async function (collectName, query) {
    try {
        const collection = db.collection(collectName);
        return  await collection.findOne(query);
    } catch (err) {
        console.log(err);
    }
}
module.exports.find = async function (collectName, query) {
    try {
        const collection = db.collection(collectName);
        return  await collection.find(query).toArray();
    } catch (err) {
        console.log(err);
    }
}
module.exports.insertOne = async function (collectName, value) {
    try {
        const collection = db.collection(collectName);
        await collection.insertOne(value);
    } catch (err) {
        console.log(err);
    }
}
module.exports.update = async function (collectName, filter, newValue) {
    try {
        const collection = db.collection(collectName);
        await collection.updateOne(filter, newValue);
    } catch (err) {
        console.log(err);
    }
}
module.exports.aggregate = async function (collectName, filter) {
    try {
        const collection = db.collection(collectName);
        return await collection.aggregate(filter).toArray();
    } catch (err) {
        console.log(err);
    }
}