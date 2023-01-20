require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const _ = require("lodash"); 
const $ = require("jquery");
// const md5 = require("md5");
// const bcrypt = require("bcrypt"); 
// const saltRounds = 10;

// requiring passport packages for sessions and cookies
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


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

// config session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
})
);
// init passport
app.use(passport.initialize());
// init session using passport
app.use(passport.session());

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

// encryption
// userSchema.plugin(encrypt, {secret:  process.env.SECRET_KEY, encryptedFields: ["password"]} );
// excludeFromEncryption: []

// passportLocalMongoose
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// passport-local config
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




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
    const userpassword = req.body.password ;
    User.findOne({email: userName}, (err,foundUser)=>{
        if (foundUser) {
            bcrypt.compare(userpassword, foundUser.password, (err, result)=>{
                if (result === true ) {
                    res.render("secrets");
                }else{
                    res.send("password is invalid")
                }
            });         
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
    const userPassword =  req.body.password;
    bcrypt.hash(userPassword, saltRounds , (err,hash)=>{
        User.findOne({email: userEmail}, (err,foundUser)=>{
            if (!foundUser) {
                const newUser = new User({
                    email: userEmail , 
                    password: hash
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
    })
});



















const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`secrrets app listening on port ${port}!`));
