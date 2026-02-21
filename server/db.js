const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

module.exports.connect = async function () {
  await client.connect();
  db = client.db("lisbeth");
  console.log("MongoDB connected!");
};

module.exports.findOne = async function (collectName, query, options = {}) {
  const collection = db.collection(collectName);
  return await collection.findOne(query, options);
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

module.exports.updateMany = async function (collectName, filter, newValue) {
  const collection = db.collection(collectName);
  await collection.updateMany(filter, newValue);
};

module.exports.aggregate = async function (collectName, filter) {
  const collection = db.collection(collectName);
  return await collection.aggregate(filter).toArray();
};

module.exports.findOneAndUpdate = async function (
  collectName,
  filter,
  update,
  options = {},
) {
  const collection = db.collection(collectName);
  return await collection.findOneAndUpdate(filter, update, options);
};

module.exports.atomicIncItem = async function (
  userId,
  itemId,
  itemLevel,
  itemName,
  delta,
) {
  const collection = db.collection("user");
  if (delta > 0) {
    // Ensure element exists (only pushes if NOT already present)
    await collection.updateOne(
      { userId, itemStock: { $not: { $elemMatch: { itemId, itemLevel } } } },
      { $push: { itemStock: { itemId, itemLevel, itemNum: 0, itemName } } },
    );
    // Now safely increment (element guaranteed to exist)
    await collection.updateOne(
      { userId, itemStock: { $elemMatch: { itemId, itemLevel } } },
      { $inc: { "itemStock.$.itemNum": delta } },
    );
    return true;
  }
  const absDelta = Math.abs(delta);
  const result = await collection.updateOne(
    {
      userId,
      itemStock: {
        $elemMatch: { itemId, itemLevel, itemNum: { $gte: absDelta } },
      },
    },
    { $inc: { "itemStock.$.itemNum": delta } },
  );
  if (result.modifiedCount > 0) {
    await collection.updateOne(
      { userId },
      { $pull: { itemStock: { itemNum: { $lte: 0 } } } },
    );
  }
  return result.modifiedCount > 0;
};

module.exports.upsert = async function (collectName, filter, update) {
  const collection = db.collection(collectName);
  await collection.updateOne(filter, update, { upsert: true });
};

module.exports.count = async function (collectName, filter) {
  const collection = db.collection(collectName);
  return await collection.countDocuments(filter);
};

module.exports.deleteOne = async function (collectName, filter) {
  const collection = db.collection(collectName);
  return await collection.deleteOne(filter);
};

module.exports.saveItemToUser = async function (userId, mine) {
  await module.exports.atomicIncItem(
    userId,
    mine.itemId,
    mine.level.itemLevel,
    mine.name,
    1,
  );
};
