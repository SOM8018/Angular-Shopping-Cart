const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const config = require("../config");
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
module.exports = router;