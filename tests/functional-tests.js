const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");
const MongoClient = require("mongodb").MongoClient;

chai.use(chaiHttp);

suite("Functional Tests", () => {
  const dbName = "fcc-apis-mcs";
  const collectionName = "stocks";
  const url = process.env.MONGO_URL;
  const client = new MongoClient(url, {
    useNewUrlParser: true
  });
  
  const testDocument1 = {
    "stock": "GOOG",
    "price": "786.90",
    "likes": 1,
    "likeIPs": []
  }
  const testDocument2 = {
    "stock": "MSFT",
    "price": "62.30",
    "likes": 0,
    "likeIPs": []
  }
  
  let testDocumentIds;

  before(async () => {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const insertResult = await collection.insertMany([testDocument1, testDocument2]);
    testDocumentIds = Object.values(await insertResult.insertedIds)
  });
  
  after(async () => {
    try {
      for (const value of testDocumentIds) {
        await client.db(dbName).collection(collectionName).deleteOne({
          _id: value
        });
      }
    } catch (e) {
      console.error(e.message);
    }
  });

  suite("GET /api/stock-prices => stockData object", () => {
    test("Query stock: GOOG", (done) => {
      chai.request(server)
        .get("/api/stock-prices")
        .query({
          stock: "GOOG"
        })
        .end((err, res) => {
          assert.equal(res.status, 200)
          assert.equal(res.body.stockData.stock, "GOOG")
          assert.property(res.body.stockData, "price");
          assert.equal(res.body.stockData.likes, 1);
          done();
        });
    });

    test("Query stock: GOOG and like", (done) => {
      chai.request(server)
        .get("/api/stock-prices")
        .query({
          stock: "GOOG",
          like: true
        })
        .end((err, res) => {
          assert.equal(res.status, 200)
          assert.isNotArray(res.body.stockData);
          assert.equal(res.body.stockData.stock, "GOOG")
          assert.property(res.body.stockData, "price");
          assert.equal(res.body.stockData.likes, 2);
          done();
        });
    });

    test("Stock that is already liked", (done) => {
      chai.request(server)
        .get("/api/stock-prices")
        .query({
          stock: "GOOG",
          like: true
        })
        .end((err, res) => {
          assert.equal(res.status, 200)
          assert.isNotArray(res.body.stockData);
          assert.equal(res.body.stockData.stock, "GOOG")
          assert.property(res.body.stockData, "price");
          assert.equal(res.body.stockData.likes, 2);
          done();
        });
    });

    test("Query for two stocks - GOOG and MSFT", (done) => {
      chai.request(server)
        .get("/api/stock-prices")
        .query({
          stock: ["GOOG", "MSFT"]
        })
        .end((err, res) => {
          assert.equal(res.status, 200)
          assert.isArray(res.body.stockData);
          assert.equal(res.body.stockData[0].stock, "GOOG");
          assert.equal(res.body.stockData[1].stock, "MSFT");
          assert.equal(res.body.stockData[0].likes, 2);
          assert.equal(res.body.stockData[1].likes, 0);
          assert.equal(res.body.stockData[0].likeIPs.length, 1);
          assert.equal(res.body.stockData[1].likeIPs.length, 0);
          done();
        });
    });

    test("Query for two stock and like them - GOOG and MSFT", (done) => {
      chai.request(server)
        .get("/api/stock-prices")
        .query({
          stock: ["GOOG", "MSFT"],
          like: true
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          done();
        });
    });
  });
});