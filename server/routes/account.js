const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const config = require("../config");
const checkJWT = require("../middlewares/check-jwt");

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Signup Rest Api - 10:06:2018 - SOUMYARANJAN MOHANTY
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.post('/signup',(req,res,next)=>{
    let user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
    user.picture = user.gravatar();
    user.isSeller = req.body.isSeller;
    //Find in database the email exist or not ?
    User.findOne({email: req.body.email},(err,existuser)=>{
        if(existuser)
        {
            //If user already Exists in database.
            res.json({
                success:'false',
                message:'User Already Exist ! Try Forgot Password',
            })
        }
        else{
            //If user not exist save the user.
            user.save();
            //also generate the token for authentication purpose
            var token = jwt.sign({user : user},config.secret,{expiresIn:'7d'});
            //show the token
            res.json({
                success: 'true',
                message: "Succesfully Token genearted",
                token: token
            });
        }
    });
});
//++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Login Rest Api - 10:06:2018 - SOUMYARANJAN MOHANTY  
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++

router.post('/login',(req,res,next)=>{
    User.findOne({email: req.body.email},(err,user)=>{
        if(err)
        {
            //If any error occured throw error
            throw err;
        }
        if(!user)
        {
            //if any user not matches
            res.json({
                success: false,
                message: 'Authentication Failed. Check Your Email'
            })
        }
        else if (user)
        {
        //If User Found then check for password//**req.body.password=input**/**user =password saved in mongo/*
            var validPassword = user.comparePassword(req.body.password);
            //here comparePassword () is defined in user.js that use {bcrypt.compareSync(password,this.password)};
            if(!validPassword)
            {
                res.json({
                    success:'false',
                    message:'Authentication Failed. Wrong Password'
                });
            }
            else{
                //password matches then generate token for auth
                //also generate the token for authentication purpose
                var token = jwt.sign({user : user},config.secret,{expiresIn:'7d'});
                res.json({
                    success: true,
                    message:'Enjoy your token',
                    token: token
                });
            }
        }
    });
});
//++++++++++++++++++++++++++++++++++++++++++++++++++++++


//++++++++++++++++++++++++++++++++++++++++++++++++++++++
// PROFILE Rest Api Start - 10:08:2018 - SOUMYARANJAN MOHANTY //
//++++++++++++++++++++++++++++++++++++++++++++++++++++++

//*******************/                     //*******************/
//router.get('/profile')       same as      router.route('profile')
//router.post('/profile')                   .get()
/********************///                    .post()

router.route('/profile')
.get(checkJWT,(req,res,next)=>{
    //if any token saved then show the user 
    User.findOne({ _id: req.decoded.user._id },(err,user)=>{
            res.json({
                success:true,
                user: user,
                message: "Successful"
            });
    });
})
.post(checkJWT,(req,res,next)=>{
    //if any token saved then update the prfile data 
    User.findOne({ _id: req.decoded.user._id },(err,user)=>{
           if(err) return next(err);
        if(req.body.name)
        {
            user.name = req.body.name;
        }
        if(req.body.email)
        {
            user.name = req.body.email;
        }
        if(req.body.password)
        {
            user.name = req.body.password;
        }
        user.isSeller = req.body.isSeller;
        user.save();
        res.json({
            success:true,
            message: "Users data updated succesfully"
        });
    });
})
//++++++++++++++++++++++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Address Rest Api Start - 10:10:2018 - SOUMYARANJAN MOHANTY
//++++++++++++++++++++++++++++++++++++++++++++++++++++++
router.route('/address')
.get(checkJWT,(req,res,next)=>{
    //if any token saved then show the useraddress 
    User.findOne({ _id: req.decoded.user._id },(err,user)=>{
            res.json({
                success:true,
                address: user.address,
                message: "Successful"
            });
    });
})
.post(checkJWT,(req,res,next)=>{
    //if any token saved then update the user address 
    User.findOne({ _id: req.decoded.user._id },(err,user)=>{
           if(err) return next(err);
        if(req.body.address1)
        {
            user.address.address1 = req.body.address1;
        }
        if(req.body.address2)
        {
            user.address.address2 = req.body.address2;
        }
        if(req.body.city)
        {
            user.address.city = req.body.city;
        }
        if(req.body.state)
        {
            user.address.state = req.body.state;
        }
        if(req.body.country)
        {
            user.address.country = req.body.country;
        }
        if(req.body.postalCode)
        {
            user.address.postalCode = req.body.postalCode;
        }
        user.save();
        res.json({
            success:true,
            message: "Users address updated succesfully"
        });
    });
})

module.exports = router;