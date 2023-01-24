require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
const _ = require("lodash"); 
const $ = require("jquery");
// const md5 = require("md5");
// const bcrypt = require("bcrypt"); 
// const saltRounds = 10;

// requiring passport packages for sessions and cookies
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); 

const findOrCreate = require("mongoose-findorcreate");

// google oauth
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

// running lodash on all file types
app.locals._ = _; 


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
// init session using passport to manage our sessions
app.use(passport.session());

// mongodb/mongoose
mongoose.set('strictQuery', false);

// // to connecto locally:  mongodb://0.0.0.0:27017/<dbname>
async function main() {
  await mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});
}
main().catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    googleEmail: String,
    facebookId: String,
    secret: String 
});

// encryption
// userSchema.plugin(encrypt, {secret:  process.env.SECRET_KEY, encryptedFields: ["password"]} );
// excludeFromEncryption: []

// passportLocalMongoose
userSchema.plugin(passportLocalMongoose);
// find or create package
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// passport-local config
passport.use(User.createStrategy());

// local authentication:
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


// all strategies authentication
// old code(still works)
// passport.serializeUser((user,done)=>{
// done(null, user.id);
// });

// passport.deserializeUser((id,done)=>{
// User.findById(id, (err,user)=>{
//     done(err,user);
// });
// });
// new code
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username
      });
    });
  });
   
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// google oauth configure strategy:
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile,  cb) {
    User.findOrCreate({ googleId: profile.id }, {googleEmail:profile.emails[0].value}, function (err, user) {
      return cb(err, user);
    });
  }
));


// facebook oauth 
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APPID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/secrets',
    profileFields: ['id', 'displayName', 'email', 'birthday', 'friends', 'first_name', 'last_name', 'middle_name', 'gender', 'link']
  },
  function(accessToken, refreshToken, profile,  cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id },  function (err, user) {
      return cb(err, user);
    });
  }
));



////////////////////////////////////routes /////////////////////////////////////////////
// home route ////////////
app.route("/")
.get( (req,res) =>{
    if (req.isAuthenticated()){
        res.redirect("/secrets");
    }else{
        res.render("home");
    }

});

// google auth route//////////////////
app.get("/auth/google", passport.authenticate("google",  { scope: ["profile", "email"] }));
// ///////
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

//   facebook auth route////////
app.get("/auth/facebook", passport.authenticate("facebook",  { scope: [ "public_profile","user_gender","email","user_friends", "user_location"] }));
// ///
app.get("/auth/facebook/secrets", 
  passport.authenticate("facebook", { failureRedirect: "/login" , failureMessage: true }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


// /////////////////////////
app.route("/register")

.get( (req,res) =>{
res.render("register");
})

.post((req,res)=>{
    const userEmail = req.body.username.toLowerCase();
    const userPassword =  req.body.password;
    User.register({username: userEmail}, req.body.password, (err,user)=>{
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local") (req, res , ()=>{
                if (req.isAuthenticated()){
                    res.redirect("/secrets");
                }else{
                    res.redirect("/register");
                }
              
            });
        }
    });
});

// //////////

app.route("/login")

.get( (req,res) =>{
res.render("login");
})

.post((req,res)=>{
    const userEmail = req.body.username.toLowerCase();
    const userPassword =  req.body.password;
    User.findOne({username: userEmail}, (err,foundUser)=>{
        if (foundUser){
            const newUser = new User({
                username: userEmail,
                password: userPassword
              }) ;
              passport.authenticate("local") (req, res , ()=>{
                req.login(newUser, err=>{
            if (!err) {
             res.redirect("/secrets");               
             }
             });
            });
        }else{
            console.log("no user found");
            res.redirect("/login");
        }
    });
});


// ////////////////////////////////////
app.get("/logout", (req,res)=>{
req.logout(err=>{
    if (err) {
        console.log(err);
    }else{
        res.redirect("/");
    }   
});

});

// ////////////////////////////////////

app.route("/secrets")

.get((req,res)=>{
    // to not allow cache for the browser so it wont render it when we are logged out
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
if (req.isAuthenticated()){
    res.render("secrets");
}else{
    res.redirect("/login");
}
});

// ///////////////////////////////

app.route("/submit")

.get((req,res)=>{
    // to not allow cache for the browser so it wont render it when we are logged out
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
if (req.isAuthenticated()){
    res.render("submit");
}else{
    res.redirect("/login");
}
})

.post((req,res)=>{
const submittedSecret = req.body.secret;
console.log(req.user);
User.findById(req.user.id, (err,foundUser)=>{
if (err) {
    console.log(err);
}else{
    if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
        res.redirect("/secrets");
        });
    }
}
});
});

// ////////////////////////////////////// 




 











const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`secrrets app listening on port ${port}!`));
