module.exports=
{
    database:"mongodb://Somamazon:Som801886@ds123003.mlab.com:23003/amazonclone",
    port:3030,
    secret: 'Som123',
    aws : 
    {
    	Access_key_ID: "AKIAIWQU5TXGHPLOYEXA",
    	Secret_access_key : "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"
    },
    algolia :
    {
    	appId: 'DCCVL1624R',
 	    apiKey: 'e62667286cf465f1294342a6fa4ef17a',
  		indexName: 'SomAmazon',
    },
    stripe :
    {
    	Publishable_key : 'pk_test_huujno2o9Y3e4HZZr3fFaUDN',
		Secret_key : 'sk_test_D7ICIKfcWfYVWimv39qiSLcx',
    },

}