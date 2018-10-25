const express = require("express");
const morgan = require("morgan");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const cors = require('cors');
// mongodb://<dbuser>:<dbpassword>@ds123003.mlab.com:23003/amazonclone
const config = require("./config");

mongoose.connect(config.database, { useNewUrlParser: true } ,err=>{
if(err)
{
    console.log(err);
}
else{
    console.log("connected to mlab");
}
});
const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));
app.use(morgan('dev'));
//Enable the CORS
app.use(cors());
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
const routes = require("./routes/account");
const mainRoute = require("./routes/main");
const sellerRoute = require("./routes/seller");

app.use('/api/accounts',routes);
app.use('/api',mainRoute);
app.use('/api/seller',sellerRoute);

//Frst test test route som for test api
// app.get('/',(req,res,next)=>{
//     res.json({
//         user: 'soumya',
//     });
// });


app.listen(config.port);