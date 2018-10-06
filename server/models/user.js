const mongoose = require("mongoose");
const schema = mongoose.Schema;
const bcrypt = require("bcrypt-nodejs");
const crypto = require("crypto");
const UserSchema = new schema({
    email:{type: String,unique:true,lowercase:true},
    name: String,
    password: String,
    picture: String,
    isSeller:{type:Boolean,default:false},
    address:{
        address1:String,
        address2:String,
        city:String,
        state: String,
        country: String,
        postalCode: String,
    },
    created:{type:Date,default:Date.now}
});
//encrypt the password before save into database by using //bcrypt.hash
UserSchema.pre('save',function(next){
    var user= this;
    if (!user.isModified('password'))
    { 
        return next();
    }
    bcrypt.hash(user.password,null,null,(err,hash)=>{
        if(err)
        {
            return next(err);
        }
        else
        {
            user.password=hash;
            next();
        }
        
    });
});
// custom function to check wheter you entered passsword is matched with database password or not //bcrypt.comapreSync()
UserSchema.methods.comparePassword= function(password)
{
    return bcrypt.compareSync(password,this.password);
}
UserSchema.methods.gravatar = function(size)
{
    if(!this.size) size=200;
    if(!this.email) 
    {
        return 'https://gravatar.com/avatar/?s'+size+'&d=retro';
    }
    else{
        var md5 = crypto.createHash('md5').update(this.email).digest('hex');
        return 'https://gravatar.com/avatar/'+md5+'?s'+size+'&d=retro';
    }
}
module.exports = mongoose.model('User',UserSchema);