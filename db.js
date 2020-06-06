const auth = require("./auth.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;

module.exports.findOne = async function (collectName, query) {
    let client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return;
    }
    try {
        let db = client.db("lisbeth");
        let collection = db.collection(collectName);
        return  await collection.findOne(query);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}
module.exports.find = async function (collectName, query) {
    let client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return;
    }
    try {
        let db = client.db("lisbeth");
        let collection = db.collection(collectName);
        return  await collection.find(query).toArray();
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}
module.exports.insertOne = async function (collectName, value) {
    let client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return false;
    }
    let db = client.db("lisbeth");
    let collection = db.collection(collectName);
    try {
        await collection.insertOne(value);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}
module.exports.update = async function (collectName, filter, newValue) {
    let client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return false;
    }
    let db = client.db("lisbeth");
    let collection = db.collection(collectName);
    try {
        await collection.updateOne(filter, newValue);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}
