const jwt = require("jsonwebtoken");
const config = require("../config");
module.exports = function(req,res,next)
{
    //Check the token exist in localstorage or not ?
    let token = req.headers["authorization"];
    if(token)
    {
        //if token exist verify it
        jwt.verify(token,config.secret,function(err,decoded){
            if(err)
            {
                //if token not matches
                res.json({
                    success:'false',
                    message:'Failed to authenticate token'
                });
            }
            else
            // save the decoded token in req.decoded//req.decoded contain all the user info 
            // if we want to access user info then we can write in //
            //     req.decoded.user.name or req.decoded.user.email etc.
            req.decoded = decoded;
            next();
        })
    }
    else{
        res.status(403).json({
            success:'false',
            message:'No token provided',
        })
    }
}