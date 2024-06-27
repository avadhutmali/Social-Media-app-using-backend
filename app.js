const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
app.use(cookieParser())

app.set("view engine","ejs");
app.use(express.urlencoded({extended:true}))


app.get("/",(req,res)=>{
    res.render("index")
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.get("/profile",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({email : req.user.email}).populate("post")
    res.render("profile",{user})
})

app.get("/likes/:id",isLoggedIn,async (req,res)=>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid)
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }

    await post.save();
    res.redirect("/profile")
})

app.get("/edit/:id",isLoggedIn,async (req,res)=>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user");

   
    res.render("edit", {post})
})


app.post("/update/:id",isLoggedIn,async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id : req.params.id} , {content : req.body.content});
   
    res.redirect("/profile")
})

app.post("/post",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({email : req.user.email})
    let post = await postModel.create({
        user : user._id,
        content : req.body.content
    })

    user.post.push(post._id);
    await user.save()
    res.redirect("profile")
})

app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect("login");
})

app.post("/register",async(req,res)=>{
    let {username,password,email,name,age} = req.body;

    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10,function(err,salt){
        bcrypt.hash(password,salt,async function(err,hash){
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password : hash
            });
            let token = jwt.sign({email,userid : user._id}, "secret");
            res.cookie("token" ,token);    
            res.send("registered")
        })
    })
})

app.post("/login",async(req,res)=>{
    let {password,email} = req.body;

    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went Wrong");

    bcrypt.compare(password,user.password,function(err,result){
        if(result){
            let token = jwt.sign({email,userid : user._id}, "secret");
            res.cookie("token" ,token);
            res.status(200).redirect("/profile");
            
        }
        else res.redirect("/login")
    })
})

function isLoggedIn(req,res,next){
    if(req.cookies.token ==="")res.redirect("login");
    else{
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
    }
    next();
}


app.listen(3000,()=>{console.log("Server is starting as port : 3000")})