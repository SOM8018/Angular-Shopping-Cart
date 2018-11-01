const router = require('express').Router();
const config = require('../config');
const algoliasearch = require('algoliasearch');
const client = algoliasearch(config.algolia.appId, config.algolia.apiKey);
const index = client.initIndex('SomAmazon');


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
//product search Rest Api - 11:01:2018 - SOUMYARANJAN MOHANTY
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.get('/', (req, res, next) => {
  if (req.query.query) {
    index.search({
      query: req.query.query,
      page: req.query.page,
    }, (err, content) => {
      res.json({
        success: true,
        message: "Here is your search",
        status: 200,
        content: content,
        search_result: req.query.query
      });
    });
  }
});


module.exports = router;

