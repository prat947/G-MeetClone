// const { start } = require("repl");

// const { name } = require("ejs");

// const { send } = require("process");

const socket = io('/')
const videoGrid = document.getElementById('video-grid');
const chat_window = document.querySelector("#chat_window");
let loggedin = false;
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})

let myUserid ;
let currentPeer ;

myPeer.on('open', id => {
  myUserid = id;
  console.log(id);
  socket.emit('join-room', ROOM_ID, id , loggedin)
})

const myVideo = document.createElement('video')
let have = false;
myVideo.muted = true

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then(stream => {
  addVideoStream(myVideo, stream)
    have = true;
    myPeer.on('call', call => {
    console.log('please no');
    call.answer(stream);
    currentPeer = call;
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {    
    console.log('connected yo');
    // connectToNewUser(userId , stream);
    setTimeout(connectToNewUser,1500,userId,stream)
  })
});



let face = myVideo.srcObject;

// //shares the stream with all other users innit.
function connectToNewUser(userId, stream) {
//call method created , passing userID and stream into it.
  const call = myPeer.call(userId, stream);
  currentPeer = call; 
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })
}
function addVideoStream(video, stream) {
  video.srcObject = stream
  face = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}


let text =  $('input')
console.log(text);
socket.on('create_msg' , (msg , user) => {
  console.log('ayooooo' , user);
  addMsg(msg , user);
});

function addMsg(text , userId) {
  const div = document.createElement('div');
  div.class = "alert";
  const msg = document.createElement('h3');
  let tot = userId;
  tot += " ";
  tot += text;
  msg.innerHTML += tot;
  let real_in = `<div class="alert"><h3>`;
  real_in += userId;
  real_in += "</h3>";
  real_in += "<p>";
  real_in += text;
  real_in += "</p></div>";
  chat_window.innerHTML += real_in;
}


$('html').keydown((e) => {
  if(e.which == 13 && text.val().length !== 0)
  {
    console.log(text.val() , myUserid);
    addMsg(text.val() , 'Me');
    console.log(ROOM_ID, NAME);
    socket.emit('message' , text.val() , NAME , ROOM_ID);
    text.val('');
  }
})

let canvas = document.querySelector("#board");
let x_coor ;  
let y_coor ;
let mouseDown = false;

x_coor = 20;
y_coor = 0;

var rect = canvas.parentNode.getBoundingClientRect();
canvas.width = rect.width;
canvas.height = rect.height;
let ctx = canvas.getContext("2d");

let arr = ["#00FF00" , "#FF0000" , "#000000" , "#A020F0"];
let color = Math.floor(Math.random() * 4);
ctx.strokeStyle = arr[color];
function getXY(canvas, event) {
  var rect = canvas.getBoundingClientRect();  // absolute position of canvas
  return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
  }
}


socket.on('makeline' , (x , y , newcolor) => {
    // ctx.beginPath();
    let ori = color;
    ctx.strokeStyle = arr[newcolor];
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = arr[ori];
});

socket.on('movedown' , (x , y) => {
  ctx.beginPath();
  var rect = canvas.getBoundingClientRect();
  ctx.moveTo(x  - rect.left, y - rect.top);
})

window.onmousedown = (e) => {
  ctx.beginPath();
  socket.emit('down' , ROOM_ID , e.clientX , e.clientY);
  var pos = getXY(canvas, e);
  ctx.moveTo(pos.x, pos.y);
  mouseDown = true;
};

window.onmouseup = (e) => {
  mouseDown = false;
};

window.onmousemove = (e) => {
  var pos = getXY(canvas, e);
  // console.log(x_coor , y_coor);
  if (mouseDown) {
    socket.emit('draw' , pos.x , pos.y , color,  ROOM_ID);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
};

const whitebutton = document.querySelector(".whiteboard");
whitebutton.addEventListener("click" , openwhiteboard);
function openwhiteboard(){
  document.querySelector(".canvas").style.backgroundColor = "white";
}

const mic = document.querySelector(".main__mute_button");
mic.addEventListener("click" , muteUnmute);
function muteUnmute() {
  const myVideoStream = myVideo.srcObject;
  let enabled = myVideoStream.getAudioTracks()[0].enabled;
  console.log(enabled);
  if(enabled){
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  }
  else{
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const screenshare = document.querySelector(".screenshare");
screenshare.addEventListener('click' , screensharecode);
let screen = false;
function screensharecode() {
  const myScreen = document.createElement('video');
  if(!screen)
  {
  navigator.mediaDevices.getDisplayMedia().then(stream => {
    // myVideo.srcObject = stream;
    // replaceStream(myPeer , stream);
    let videotrack = stream.getVideoTracks()[0];
    console.log(currentPeer);
    let sender = currentPeer.peerConnection.getSenders()[1];
    sender.replaceTrack(videotrack);
    myVideo.srcObject = stream;
  })
  screen = true;
  stopsharing();
}
else{
  myVideo.srcObject = face;
  screen = false;
  sharing();
}
}

const stopsharing = () => {
  const html = `
  <i class="fas fa-times-circle"></i>
    <span>Stop Sharing</span>
  `
  document.querySelector('.screenshare').innerHTML = html;
}


const sharing = () => {
  const html = `
  <i class="fas fa-desktop"></i>
  <span>Share Screen</span>
  `
  document.querySelector('.screenshare').innerHTML = html;
}



const playStop = () => {
  const myVideoStream = myVideo.srcObject;
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo()
  } else {
    setStopVideo()
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setMuteButton = () => {
  console.log('yo');
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const leavebutton = document.querySelector(".leavemeet");
leavebutton.addEventListener('click' , function() {
  window.location.href = "http://localhost:3000/";
});

