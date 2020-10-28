
const  desiredConn = "https://damp-waters-51468.herokuapp.com";
const socket = require('socket.io-client')(desiredConn);
const MjpegCamera = require('./mjpegCamera');
const fs = require("fs");

const camera = new MjpegCamera({
  name: "Phone Cam",
  user: "admin",
  password: "admin",
  url: "http://192.168.0.102:6969/video"
});

socket.on('connect',  function(){
console.log("Camera and Proxy Servers connected");
console.log("Waiting for instance request");
});

socket.on("VideoId",function(id){
  let CamData =JSON.parse(fs.readFileSync("./CameraStorage.json","utf-8")).cams;
  let Camera = CamData[id];

  if(Camera == undefined){
    socket.emit("ErrorCam",`Camera obj is undefined by id : ${id}`);
    console.log(`Camera obj is undefined by id : ${id}`);
    return;
  }
   setInterval(()=>{
     socket.emit("Frame","Data has been paassed!!!");
   },1000);
   
  camera.on("frame",function(data){
    socket.emit("Frame",data.substring(1,Math.floor(Math.random()*7 + 5)));
    //TODO:Send the whole thing when done with proxy {data}
    });

    camera.on("error",(err)=>{
      socket.emit("ErrorCam",err);
    })
    //! Start the server manually
   // camera.start();
});

socket.on("Stop",function(data){
  let Auth = JSON.parse(data);
  if(Auth.adminReq  == "QeLfer31dI"){
    console.log(`Accses granted. Reason: ${Auth.reason}`);
    camera.stop();
    return;
  }
  else{
    console.log('Accses denied: Unauthorized stop request');
    return;
  }
})

socket.on('disconnect', function() {
  console.log("Lost connection to Proxy Server");
  camera.stop();
});

