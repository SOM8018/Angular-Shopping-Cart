const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Category = require("../models/category");
const config = require("../config");
const Product = require("../models/product");
const async = require("async");
const Review = require("../models/review");
const checkJWT = require("../middlewares/check-jwt");

//===========================================
//All products REST API 25:10:2018 12:07 PM
//===========================================
router.get('/products', (req, res, next) => {
    const perPage = 10;
    const page = req.query.page;
    async.parallel([
      function(callback) {
        Product.count({}, (err, count) => {
          var totalProducts = count;
          callback(err, totalProducts);
        });
      },
      function(callback) {
        Product.find({})
          .skip(perPage * page)
          .limit(perPage)
          .populate('category')
          .populate('owner')
          .exec((err, products) => {
            if(err) return next(err);
            callback(err, products);
          });
      }
    ], function(err, results) {
      //results[0] includes totalproducts.....like that
      var totalProducts = results[0];
      var products = results[1];
      res.json({
        success: true,
        message: 'category',
        products: products,
        totalProducts: totalProducts,
        pages: Math.ceil(totalProducts / perPage),
      });
    });   
  });
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
//========================================================
//Categories WITH SPECIFIC ID REST API 25:10:2018 12:55AM ++ **
// Not good for multi monggose operations so rewrite
//========================================================
  // router.get('/categories/:id', (req, res, next) => {
  //   const perPage = 10;
  //   Product.find({category: req.params.id })
  //     .populate('category')
  //     .exec((err,products)=>{
  //       Product.count({category: req.params.id},(err,totalProducts)=>
  //       {
  //         res.json({
  //             success: true,
  //             message:'category',
  //             products: products,
  //             categoryName : products[0].category.name,
  //             totalProducts: totalProducts,
  //             pages : Math.ceil(totalProducts/perPage)
  //         });
  //       });
  //     });
  // });
//============================================================================================
//Categories WITH SPECIFIC ID REST API( With async callback ) 25:10:2018 11:43 AM ++ **
//============================================================================================
  router.get('/categories/:id', (req, res, next) => {
    const perPage = 10;
    const page = req.query.page;
    async.parallel([
      function(callback) {
        Product.count({ category: req.params.id }, (err, count) => {
          var totalProducts = count;
          callback(err, totalProducts);
        });
      },
      function(callback) {
        Product.find({ category: req.params.id })
          .skip(perPage * page)
          .limit(perPage)
          .populate('category')
          .populate('owner')
          .populate('reviews')
          .exec((err, products) => {
            if(err) return next(err);
            callback(err, products);
          });
      },
      function(callback) {
        Category.findOne({ _id: req.params.id }, (err, category) => {
         callback(err, category)
        });
      }
    ], function(err, results) {
      //results[0] includes totalproducts.....like that
      var totalProducts = results[0];
      var products = results[1];
      var category = results[2];
      res.json({
        success: true,
        message: 'category',
        products: products,
        categoryName: category.name,
        totalProducts: totalProducts,
        pages: Math.ceil(totalProducts / perPage),
      });
    });
    
  });
//============================================================================================
//Single Product REST API( With async callback ) 25:10:2018 12:07 PM ++ **
//============================================================================================

  router.get('/product/:id', (req, res, next) => {
    Product.findById({ _id: req.params.id })
      .populate('category')
      .populate('owner')
      .deepPopulate('reviews.owner')
      .exec((err, product) => {
        if (err) {
          res.json({
            success: false,
            message: 'Product is not found'
          });
        } else {
          if (product) {
            res.json({
              success: true,
              product: product
            });
          }
        }
      });
  });
//============================================================================================
//REVIEW REST API( With async WATERFALL callback ) 26:10:2018 11:23 AM ++ **
//============================================================================================

  router.post('/review', checkJWT, (req, res, next) => {
    async.waterfall([
      function(callback) {
        Product.findOne({ _id: req.body.productId}, (err, product) => {
          if (product) {
            callback(err, product);
          }
        });
      },
      function(product) {
        let review = new Review();
        review.owner = req.decoded.user._id;

        if (req.body.title) review.title = req.body.title;
        if (req.body.description) review.description = req.body.description
        review.rating = req.body.rating;

        product.reviews.push(review._id);
        product.save();
        review.save();
        res.json({
          success: true,
          message: "Successfully added the review"
        });
      }
    ]);
  });

  module.exports = router;