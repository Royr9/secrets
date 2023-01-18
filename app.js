require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const _ = require("lodash"); 
const $ = require("jquery");


// running lodash on all file types
app.locals._ = _;
// jquery on all files
app.locals.$ = $;

// body parser
app.use(express.urlencoded({extended: true}));
// to upload static files
app.use(express.static(__dirname + "/public"));
// ejs
app.set("view engine", "ejs");


// mongodb/mongoose
mongoose.set('strictQuery', false);

// // to connecto locally:  mongodb://0.0.0.0:27017/<dbname>
async function main() {
  await mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});
}
main().catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "no email specified"]
    },
    password:{
        type: String,
        required: [true, "no password specified"]
    } 
});


userSchema.plugin(encrypt, {secret:  process.env.SECRET_KEY, encryptedFields: ["password"]} );
// excludeFromEncryption: []
const User = new mongoose.model("User", userSchema);



app.route("/")
.get( (req,res) =>{
res.render("home");
});

app.route("/login")
.get( (req,res) =>{
res.render("login");
})

.post((req,res)=>{
    const userName = req.body.username.toLowerCase();
    const password = req.body.password;
    User.findOne({email: userName}, (err,foundUser)=>{
        if (foundUser) {
            if (foundUser.password === password ) {
                res.render("secrets");
            }else{
                res.send("password is invalid")
            }
        } else {
            res.send("username invalid")
        }
    });
})

app.route("/register")
.get( (req,res) =>{
res.render("register");
})
.post((req,res)=>{
    const userEmail = req.body.username.toLowerCase();
 User.findOne({email: userEmail}, (err,foundUser)=>{
    if (!foundUser) {
        const newUser = new User({
            email: userEmail , 
            password: req.body.password
        });
        newUser.save(err=>{
            if (!err) {
                res.render("secrets");
            }
        });
    }else{
        res.send("user name already exits :(")
    }
 })   
 

});



















const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`secrrets app listening on port ${port}!`));
