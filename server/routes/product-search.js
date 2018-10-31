const router = require('express').Router();

const algoliasearch = require('algoliasearch');
const client = algoliasearch('DCCVL1624R', 'e62667286cf465f1294342a6fa4ef17a');
const index = client.initIndex('SomAmazon');



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

