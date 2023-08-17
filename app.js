const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = express();
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const flash=require('connect-flash');
const saltRounds = 5;

require('dotenv').config();

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(flash());

app.use(
  bodyParser.urlencoded({
    extended: true,
  }));

app.use(cookieParser());

app.use(
  session({
    key: "user_sid",
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    // maxAge: 24 * 60 * 60 * 1000
    cookie: {
      expires: 6000000,
    },
  })
);

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.User) {
    res.clearCookie("user_sid");
  }
  next();
});


var sessionChecker = (req, res, next) => {
  if (req.session.User && req.cookies.user_sid) {
    res.redirect("/");
  } else {
    next();
  }
};

mongoose.connect(process.env.DB);

const userSchema = {
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  mobileNumber: Number,
  address: String,
  image: String,
  exam: [String]
};

const User = mongoose.model("User", userSchema);

const examLinksSchema = {
   examName:String,
   examURLs:[String],
   aboutExamURL:String
};
const Exam=mongoose.model("Exam",examLinksSchema);


var Storage = multer.diskStorage({
  destination: "Public/Uploads",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

var upload = multer({
  storage: Storage,
}).single("inputImage");


async function emailSender(senderEmail,senderEmailPass,receiverEmail,subject,senderMessage){
  try{
    let config = {
    service:'gmail',
    auth: {
      user:  senderEmail ,
      pass:  senderEmailPass
    },
  };
  let transporter=nodemailer.createTransport(config);
  let message = {
    from:  senderEmail,
    to: receiverEmail,
    subject: subject,
    html:senderMessage
  };
  transporter.sendMail(message).then(()=>{
      console.log("mail sent");
  });
}catch{
  console.log("Some error occured!!Message was not delivered");
}}


////USER get Routes


app.get("/",async function (req, res) {
   try{
         let exams=await Exam.find();
          var sess=false;
          if (req.session.User && req.cookies.user_sid)
             sess=true;
          res.render("home",{exams:exams,sess:sess,message:req.flash('message')});
   }catch{console.log("error occured");}
});

app.get("/login", sessionChecker, function (req, res) {
  res.render("login",{message:req.flash('message')});
});

app.get("/register", sessionChecker, async function (req, res) {
  let List=await Exam.find();
  let examlist=[];
  List.forEach((exam)=>{
    examlist.push(exam.examName);
  });
  res.render("register",{examlist:examlist,message:req.flash('message')});
});

app.get("/resetPassword",function(req,res){
  res.render("resetPass",{message:req.flash('message')})
});

app.get("/about", function (req, res) {
  var sess=false;
    if (req.session.User && req.cookies.user_sid)
        sess=true;
  res.render("about",{sess:sess});
});

app.get("/contact", function (req, res) {
  if (req.session.User && req.cookies.user_sid) {
     res.render("contact",{message:req.flash('message')});
  }else{
    res.redirect("/login");
  }    
});

app.get("/profile", function (req, res) {
  if (req.session.User && req.cookies.user_sid) {
    User.findById({ _id: req.session.user_id }).then((foundUser) => {
      if (foundUser) {
        res.render("profile", { UserData: foundUser,message:req.flash('message')});
      }
    });
  } else res.redirect("/login");
});

app.get("/updateProfile",async function (req, res) {
  if (req.session.User && req.cookies.user_sid) {
    let List=await Exam.find();
    let examlist=[];
    List.forEach((exam)=>{
      examlist.push(exam.examName);
    });
    User.findById({ _id: req.session.user_id }).then((foundUser) => {
      res.render("updateProfile", { UserData: foundUser,examlist:examlist });
    });
  }else{
    res.redirect("/login");
  } 
});

app.get("/userExam",async(req,res)=>{
  try{
    
    if (req.session.User && req.cookies.user_sid) { 
         const foundUser=await User.findById(req.session.user_id);
         const exams=foundUser.exam;
         let examObjectArray=[];
         for(let ex of exams)
             {
                let found=await Exam.find({examName:ex});                           
                var obj={};
                 obj[found[0].examName]=found[0].examURLs
                 examObjectArray.push(obj);  
             }

         // scrapping 
          const {PythonShell} = require('python-shell')
        //python file
          let pyshell = new PythonShell('./views/Exams/Scrapping/scrapExam.py',{mode:'json'});
          pyshell.send(JSON.stringify(examObjectArray));

          pyshell.on('message', async function (message) {
               var examArray=JSON.parse(message);
               res.render("userExam",{ExamData:examArray,user:foundUser});
          }); 
          pyshell.end(function (err) {
               if (err) throw err;
          });

           }else      
             res.redirect("/login"); 
        }catch(err){
        console.log(err);
       }
   });

app.get("/about/:name",async function(req,res){
    
    var sess=false;
    if (req.session.User && req.cookies.user_sid)
     sess=true;
    ExamName=req.params.name;
    try{
      const requiredExam=await Exam.findOne({examName:ExamName});
      const url=requiredExam.aboutExamURL;

      //scrapping
      const {PythonShell} = require('python-shell')
      //python file
      let pyshell = new PythonShell('./views/Exams/Scrapping/scrapAboutExam.py',{mode:'json'});
       
      pyshell.send(JSON.stringify(url));
  
      pyshell.on('message', async function (message) {
         
         var temp=JSON.parse(message)
         res.render("aboutExam",{aboutArray:temp,requiredExam:requiredExam,sess:sess})
       }); 
       pyshell.end(function (err,code,signal) {
       if (err) throw err;
        console.log('The exit code was: ' + code);
         });
    }catch{
      console.log("Some error occured")
    }
   
});   

app.get("/logout", (req, res) => {
  if (req.session.User && req.cookies.user_sid) {
    res.clearCookie("user_sid");
    res.redirect("/login");
  } else {
    console.log("login first");
    res.redirect("/login");
  }
});



/////USER post Routes



    ///Register without Email Authentication

// app.post("/register", function (req, res) {
//   const firstname = req.body.firstname;
//   const lastname = req.body.lastname;
//   const email = req.body.emailid;
//   const mobilenumber = req.body.mobilenumber;
//   const address = req.body.address;
//   const exam = req.body.userExam;


//   User.findOne({ email: email }).then((match) => {
//     if (match) {
//       console.log("This email is already registered!!!");
//       req.flash('message',"This email is already registered!!")
//       res.redirect("/login");
//     } else {
//       bcrypt.hash(req.body.password, saltRounds).then((hash) => {
//         var usernew = new User({
//           firstName: firstname,
//           lastName: lastname,
//           email: email,
//           password: hash,
//           mobileNumber: mobilenumber,
//           address: address,
//           exam: exam
//         });
//         usernew.save().then((val) => {
//           if (!val) res.redirect("/register");
//           else {
//             req.session.user_id = val._id;
//             req.session.User = val;
//             req.flash('message',"Welcome to Exam Tracker")
//             res.redirect("/");
//           }
//         });
//       });
//     }
//   });
// });

      ////Register with Email Authentication

app.post("/register",async function(req,res){

    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const email = req.body.emailid;
    const mobilenumber = req.body.mobilenumber;
    const address = req.body.address;
    const exam = req.body.userExam;
   await User.findOne({ email: email }).then((match) => {
          if (match) {
            console.log("This email is already registered!!!");
            req.flash('message',"This email is already registered!!");
            res.redirect("/login");
          }else {
              bcrypt.hash(req.body.password, saltRounds).then((hash) => {
                var usernew = {
                firstName: firstname,
                lastName: lastname,
                email: email,
                password: hash,
                mobileNumber: mobilenumber,
                address: address,
                exam:exam
                   };                  
                
                const otp=Math.floor((Math.random()+1)*1000);    
                const senderSubject="Email Verification for Exam Tracker Registration";
                const senderMessage="Your OTP for Exam Tracker Verification is <h2>"+otp+"</h2>"+
                "<br><h5><strong>Do not share it with anyone</strong></h5>" +
                "<p>If it was not you then please ignore this email</p>";

                emailSender(process.env.EMAIL,process.env.EMAILPASS,email,senderSubject,senderMessage)
                res.render("registerOTP",{otp:otp,usernew:usernew}); 
                        });
                      }});
                    });

app.post("/registerOTP",function(req,res){
            sentOTP=req.body.sentOTP;
            enteredOTP=req.body.inputOTP;
            var temp=req.body.exam
            var exam=temp.split(",");
            if(sentOTP===enteredOTP){
              var usernew = new User({
                          firstName: req.body.firstName,
                          lastName: req.body.lastName,
                          email: req.body.email,
                          password: req.body.password,
                          mobileNumber: req.body.mobileNumber,
                          address: req.body.address,
                          exam: exam
                        });
                      usernew.save().then((val) => {
                      if (!val) res.redirect("/register");
                      else {
                        req.session.user_id = val._id;
                        req.session.User = val;
                         res.redirect("/");
            } });
        }else{
                req.flash('message',"Wrong OTP");
                console.log("wrong OTP");
                res.redirect("/register");
            }
});


app.post("/login", async (req, res) => {

  const email = req.body.inputemail;
  const password = req.body.inputpassword;

  var foundUser = await User.findOne({ email: email }).exec();

  if (foundUser) {
    bcrypt.compare(password, foundUser.password).then((match) => {

        
      if(match) {

        req.session.User = foundUser;
        req.session.user_id = foundUser._id;
        if(email==="admin@admin.com")
          {  
            req.flash('message',"Welcome Admin");
             res.redirect("/admin");
          }
        else{ 
         req.flash('message',"Login Successful");  
         res.redirect("/");
        }
      } 
      else{
        req.flash('message',"Password do not match!!");
        res.redirect("/login");
      } 
    });
  } else {
   
    console.log("Email not registered");
    req.flash('message',"Email Not Registered!!");
    res.redirect("/login");
  }
});

app.post("/resetPassword",function(req,res){
  receiverEmail=req.body.inputemail;
  const otp=Math.floor((Math.random()+1)*1000);
  const senderSubject="Email Verification for Exam Tracker Password Reset";
  const senderMessage="Your OTP for Exam Tracker Password Reset is <h2>"+otp+"</h2>"+
  "<br><h5><strong>Do not share it with anyone</strong></h5>" +
  "<p>If it was not you then please ignore this email</p>";
  emailSender(process.env.EMAIL,process.env.EMAILPASS,receiverEmail,senderSubject,senderMessage);
  res.render("resetPassOTP",{sentOTP:otp,message:req.flash('message')})
  });
  
app.post("/resetPasswordOTPverify",function(req,res){
  if(req.body.sentOTP===req.body.inputOTP){
     res.render("changePassword",{message:req.flash('message')})
  }else{
     console.log("Wrong OTP Entered");
     req.flash('message',"Wrong OTP Entered");
     res.redirect("/resetPassword")
  }
  });
  
app.post("/newPassword",async function(req,res){
  email=req.body.Email;
  
  if(req.body.newPassword===req.body.confirmNewPassword){
   bcrypt.hash(req.body.newPassword, saltRounds).then((hash) => {
  
   User.findOneAndUpdate({email:email},{password:hash}).then((found)=>{
    if(found){
      req.flash('message',"Password Updated Successfully");
      console.log("Password Updated Successfully!!")
    }
    else{
     req.flash('message',"Wrong Email Entered");
     console.log("Wrong Email Entered");
     
   }
  })
  });
  
  res.redirect("/login");
  }else{
  req.flash('message',"Password and Confirm Password do not match");
  console.log("Password and Confirm Password do not match");
  res.render("changePassword",{message:req.flash('message')});
  } 
  });

app.post("/userChoice", function (req, res) {
  if (req.session.User && req.cookies.user_sid) {
    User.findById({ _id: req.session.user_id }).then((foundUser) => {
      if (foundUser) {
        const userExam = foundUser.exam;
        const choice = req.body.choice;
        res.render("Exams/" + userExam + "/" + choice);
      }
    });
  } else res.redirect("/login");
});

app.post("/update", upload, (req, res) => {
  if (req.file) {
    User.findByIdAndUpdate(req.session.user_id, {
      firstName: req.body.newfirstname,
      lastName: req.body.newlastname,
      email: req.body.newemail,
      mobileNumber: req.body.newnumber,
      address: req.body.newaddress,
      image: req.file.filename,
      exam:req.body.userExam
    }).then(() => {
      req.flash('message',"Profile Updated Successfully");
      console.log("done update");
    });
    res.redirect("/profile");
  }else {
    User.findByIdAndUpdate(req.session.user_id, {
      firstName: req.body.newfirstname,
      lastName: req.body.newlastname,
      email: req.body.newemail,
      mobileNumber: req.body.newnumber,
      address: req.body.newaddress,
      exam:req.body.userExam
    }).then(() => {
      req.flash('message',"Profile Updated Successfully");
      console.log("done update");
    });
    req.flash('message',"Profile Updated Successfully");
    res.redirect("/profile");
  }
}); 

app.post("/contact",function(req,res){
  if (req.session.User && req.cookies.user_sid) {

    var senderName=req.body.senderName;
    var senderEmail=req.body.senderEmail;
    var senderSubject=req.body.senderSubject;
    const senderText=req.body.senderText;  
    emailSender(senderEmail,req.body.senderPassword,process.env.EMAIL,senderSubject,senderText);
    req.flash('message',"Your message will be delivered to our team");
    res.redirect("/contact");}
  else{  
    console.log("Please login first");
    res.redirect("/contact");
  }
});

app.post("/deleteProfile", function (req, res) {
  if (req.session.User && req.cookies.user_sid) {
    User.findByIdAndRemove(req.session.user_id).then(() => {});
    res.redirect("/logout");
  }
});

app.post("/otpVerify",function(req,res){
  const originalOTP=req.body.originalOTP; 
  const userOTP=req.body.userOTP;
  console.log(userOTP);
  if(originalOTP==userOTP)
  res.redirect("/");
  else
  res.redirect("/registerTemp");
});


//////////////////////////////////
/////////////////////////////


/////ADMIN get Routes


app.get("/admin",function(req,res){
  if (req.session.User && req.cookies.user_sid) {
    User.findById({ _id: req.session.user_id }).then((foundUser) => {
      res.render("Admin/admin",{UserData: foundUser,message:req.flash('message')});
  });
}else{
  res.redirect("/login");
} });

app.get("/adminView",async function(req,res){
  if (req.session.User && req.cookies.user_sid) {
    try{
       let exams=await Exam.find();
       res.render("Admin/adminView",{exams:exams,message:req.flash('message')});
    }catch{console.log("error occured");}
  }else{
    res.redirect("/login");
  } 
});

app.get("/adminExam/:task",async function(req,res){
  if (req.session.User && req.cookies.user_sid) {
      let task=req.params.task;
      if(task==="Show")
      {
        try{
          let exams=await Exam.find();
          res.render("Admin/adminExam",{exams:exams,task:task});
        }catch{console.log("error occured");}
      }
      else if(task==="Add")
      {
         res.render("Admin/adminExam",{task:task});
      }
    }else{
      res.redirect("/login");
    }      
});
  
app.get("/adminUsers/All",async function(req,res){
  if (req.session.User && req.cookies.user_sid) {
        let allUsers=await User.find();
        res.render("Admin/adminChoiceList",{allUsers:allUsers,UserChoice:""});
  }else{
    res.redirect("/login");
  } 
});


/////ADMIN post Routes


app.post("/addExam",async function(req,res){
  const ExamName = req.body.ExamName;
  const examURLs = [req.body.ExamURL1,req.body.ExamURL2,req.body.ExamURL3,req.body.ExamURL4];
  const aboutURL = req.body.aboutUrl;
  await Exam.findOne({ examName: ExamName }).then((match) => {
    if (match) {
      req.flash('message',"This Exam Already Exists");
      console.log("This Exam already exists!!!");
      res.redirect("/adminView");
    }
    else{
      var newExamLinks = new Exam({
        examName: ExamName,
        examURLs:examURLs,
        aboutExamURL:aboutURL
      });
      newExamLinks.save().then((val) => {
        if (!val) res.redirect("/admin");
      });
      req.flash('message',"Exam Added Successfully");
      res.redirect("/adminView");
    }
});
});

app.post("/removeExams",async function(req,res){
  let examsToRemove=req.body.userExam;
  if(typeof examsToRemove==='string')
          examsToRemove=[examsToRemove];
  for(var i=0;i<examsToRemove.length;i++){
      try{
           await Exam.deleteOne({examName:examsToRemove[i]});
           req.flash('message',"Exam Removed Successfully");
           res.redirect("/adminView");
        }catch(err){
           console.log("error occured");
        }
          }        
});

app.post("/EditExam",async function(req,res){
   let examToEdit=req.body.selectedExam;
   Exam.findOne({ examName: examToEdit }).then((match) => {
      res.render("Admin/adminExamEdit",{ExamData:match});
    });
});

app.post("/updateExam",function(req,res){
  const id=req.body.ExamId;
  const newName=req.body.examName;
  const newURLs=[req.body.url1,req.body.url2,req.body.url3,req.body.url4]; 
  Exam.findByIdAndUpdate(id,{
       examName:newName ,
       examURLs:newURLs
  }).then(()=>{    
    console.log("Exam Updated");
  });
      req.flash('message',"Exam Updated Successfully");
      res.redirect("/adminView");
});

app.post("/adminSomeUsers/",async function(req,res){
    try{
       let UserChoice=req.body.userChoice;      
       let allUsers=await User.find();
       if(typeof UserChoice==='string')
            UserChoice=[UserChoice];
       res.render("Admin/adminChoiceList",{UserChoice:UserChoice,allUsers:allUsers});
    }catch
      {console.log("error");}
});


/////Listening 

app.listen(process.env.PORT, function () {
  console.log(`Server is running at ${process.env.PORT}`);
});
