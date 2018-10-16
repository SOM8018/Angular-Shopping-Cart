const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Category = require("../models/category");
const config = require("../config");


//===========================================
//Categories REST API 16:10:2018 5:53PM
//===========================================
router.route('/categories')
  .get((req, res, next) => {
  	//find categories if exist and dispaly the response "categories"
    Category.find({}, (err, categories) => {
      res.json({
        success: true,
        message: "Success",
        categories: categories
      })
    })
  })
  .post((req, res, next) => {
  	//create categories by new Category() monggose model and savee it
    let category = new Category();
    category.name = req.body.category;
    category.save();
    res.json({
      success: true,
      message: "Successfully saved Categories"
    });
  });

  module.exports = router;