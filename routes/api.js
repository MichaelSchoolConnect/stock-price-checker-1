"use strict";

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true
});

const Schema = mongoose.Schema;
const StockSchema = new Schema({
  stock: String,
  price: String,
  likes: Number,
  likeIPs: [String]
});
const Stock = mongoose.model("Stock", StockSchema);

module.exports = (app) => {
  mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true
  });

  app.route("/api/stock-prices")
    .get(async (req, res) => {
      try {
        const data = req.query;
        const like = data.like ? true : false;
        const reqIp = req.header('x-forwarded-for') || req.connection.remoteAddress;
        
        // build query params array
        let queryParams = {};
        for (const param in data) {
          if (param !== "like") queryParams[param] = data[param];
        }
        // query database with query params array
        let queryDatabaseResult = await Stock.find({ $or: [queryParams] });
        (like && data.stock.length === 1) ? queryDatabaseResult.gt("likes", 0) : queryDatabaseResult;

        let updateDatabaseResult = [];
        for (const param of queryDatabaseResult) {
          if (like && param.likeIPs.indexOf(reqIp) === -1) {
            await Stock.findByIdAndUpdate({
              _id: param._id
            }, {
              likes: param.likes + 1
            });
            
            const result = await Stock.findByIdAndUpdate(param._id, {
              likeIPs: reqIp
            });
            
            updateDatabaseResult.push(result);
          } else {
            updateDatabaseResult.push(param);
          }
        }
        
        // single value array === send object instead
        const fixResult = (updateDatabaseResult.length <= 1) ? updateDatabaseResult[0] : updateDatabaseResult;

        res.json({
          stockData: fixResult
        });
      } catch (e) {
        console.error(e.message);
        res.send("something went wrong");
      }
    });
};