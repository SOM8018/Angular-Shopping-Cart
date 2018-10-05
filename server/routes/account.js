const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const config = require("../config");

//Signup Rest Api - 10:06:2018 - SOUMYARANJAN MOHANTY
router.post('/signup',(req,res,next)=>{
    let user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
});

module.exports = router;