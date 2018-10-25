const express = require("express");
const router = express.Router();
const Product = require("../models/product")
const config = require("../config");
const checkJWT = require("../middlewares/check-jwt");
const faker = require("faker");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new aws.S3({ accessKeyId: config.aws.Access_key_ID , secretAccessKey : config.aws.Secret_access_key });


var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'mycarts3',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Products Rest Api - 24:10:2018 - SOUMYARANJAN MOHANTY
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.route('/products')
.get(checkJWT, (req, res, next) => {
    Product.find({ owner: req.decoded.user._id })
      .populate('owner')
      .populate('category')
      .exec((err, products) => {
        if (products) {
          res.json({
            success: true,
            message: "Products",
            products: products
          });
        }
      });
  })
.post([checkJWT, upload.single('product_picture')], (req, res, next) => {
    console.log(upload);
    console.log(req.file);
    let product = new Product();
    product.owner = req.decoded.user._id;
    product.category = req.body.categoryId;
    product.title = req.body.title;
    product.price = req.body.price;
    product.description = req.body.description;
    product.image = req.file.location;
    product.save();
    res.json({
      success: true,
      message: 'Successfully Added the product'
    })
  });

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Fakers Rest Api for testing - 24:10:2018 - SOUMYARANJAN MOHANTY
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++

router.get('/faker/test',(req, res, next) => {
  for (i = 0; i < 20; i++) {
    let product = new Product();
    product.category = "5bc5dbc6d6f6b305047c2121";
    product.owner = "5bd01a182bbbf72370da6e3b";
    product.image = faker.image.cats();
    product.title = faker.commerce.productName();
    product.description = faker.lorem.words();
    product.price = faker.commerce.price();
    product.save();
  }

  res.json({
    message: "Successfully added 20 pictures"
  });

});




module.exports = router;
