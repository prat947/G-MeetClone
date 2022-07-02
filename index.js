const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const qs = require('querystring');
const { resolve } = require('path');
const { Interface, createInterface } = require('readline');
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { render } = require('express/lib/response');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
app.set('view engine', 'ejs');
app.use(express.static('public'));
let rid = "yo";
let loggedin = false;
let joiningmeet = false;
let gotoroom ;
let name;
let email;

app.get('/', (req, res) => {
  if(loggedin)
  {
    if(!joiningmeet){
      rid = uuidV4();
      res.redirect(`/${rid}`)
    }
    else{
      res.redirect(gotoroom);
      joiningmeet = false;
    }
  }
  else
  {
    let link = getGoogleAuthURL();
    // console.log(link);
    try{
      res.redirect(link);
    }
    catch(e)
    {
      // console.log(e);
    }
  }
})

app.get('/:room', (req, res) => {
  gotoroom = req.params.room;
  joiningmeet = true;
  if(gotoroom == "schedule"){
    let meetid = "http://localhost:3000/"
    meetid += uuidV4();
    res.render('schedule', {meetid});
  }
  else {
    if(loggedin) {
      res.render('room', { roomId: req.params.room , name : name , email : email })
      loggedin = false;
    }
    else
    {
      let link = getGoogleAuthURL();
      res.redirect(link);
    }
  }
})

let redirect = process.env.PUBLIC_OAUTH_REDIRECT_URL.toString();
let id = process.env.PUBLIC_GOOGLE_CLIENT_ID.toString();
let secret = process.env.PUBLIC_GOOGLE_CLIENT_SECRET.toString();
let pass = process.env.PUBLIC_APP_PASSWORD.toString();
console.log(pass);
app.get("/api/sessions/oauth/google", googleOauthHandler);

async function googleOauthHandler(req , res) {
  const code = req.query.code.toString();
  const resu = await getGoogleOAuthTokens(code);
  const access_token = resu.data.access_token;
  const id_token = resu.data.id_token;
  const googleUser = jwt.decode(id_token);
  name = googleUser.name;
  email = googleUser.email;
  loggedin = true;
    res.redirect('/');
}

async function getGoogleOAuthTokens(code) {
    const url = "https://oauth2.googleapis.com/token";
    const values = {
      code : code,
      client_id: id, 
      client_secret: secret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    };

    const fa = new URLSearchParams(values);
    try {
      const res = await axios.post(
        url,
        fa.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
        return res;
    } catch (error) {
    }
};

function getGoogleAuthURL() {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirect,
    client_id: id,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(" "),
  };
  const fa =  new URLSearchParams(options);
  console.log(fa.toString());
  return `${rootUrl}?${fa.toString()}`;
}

//socket connection -> room join -> user-connected ->
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId , logstatus) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId)
  })
  socket.on('message' , (msg , user , roomId) => {
    socket.to(roomId).emit('create_msg' , msg , user);
  });

  socket.on('sendmail' , (to , subject , time ,id) => {
  let transporter = nodemailer.createTransport(
    {
      service : 'gmail',
      auth : {
        user : `${email}`,
        pass : pass,
      }
    }
  );

    let text = "Please join the meet at ";
    text += time;
    text += " using the link ";
    text += id;
      var mailOptions = {
      from : `${email}`,
      to : to,
      subject : subject,
      text : text,
    };

    transporter.sendMail(mailOptions , function(error , info){
      if(error){
      }
      else{
        console.log('sent');
        console.log(info.response);
      }
    });

    let hour = time[0];
    hour += time[1];
    let minute = time[3];
    minute += time[4];
    minute -= 15;
    hour -= 0;
    
    cron.schedule(`00 ${minute} ${hour} * * *`, function () {
      mailOptions.subject = "Reminder";
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log(error);
        else console.log('Email sent: ' + info.response);
      });
    });
  

  });

  socket.on('draw' , (x , y ,color, roomId) => {
    socket.to(roomId).emit('makeline', x , y , color);
  });

  socket.on('down' , (roomId , x , y) => {
    socket.to(roomId).emit('movedown' , x , y);
  })

  socket.on('screenshared' , (id ,roomId) => {
    socket.to(roomId).emit("displayscreen" , id);
  })

})


server.listen(3000);




