
const  desiredConn = "http://localhost:3000/";
const socket = require('socket.io-client')(desiredConn);
const MjpegCamera = require('./mjpegCamera');
const fs = require("fs");



socket.on('connect',  function(){
console.log("Camera and Proxy Servers connected");
console.log("Waiting for instance request");

//!Fallback case for cam!!
let camera = new MjpegCamera({
  name: "Phone Cam",
  user: "admin",
  password: "12334",
  url:"http://192.168.0.102:6969/video" 
});

socket.on("VideoId",function(id){
  let CamData =JSON.parse(fs.readFileSync("./CameraStorage.json","utf-8")).cams;
  let Camera = CamData[id];

  
  if(Camera == undefined){
    socket.emit("ErrorCam",`Camera obj is undefined by id : ${id}`);
    console.log(`Camera obj is undefined by id : ${id}`);
    return;
  }
  camera.name=Camera.name;
  camera.user=Camera.user;
  camera.password=Camera.password;
  camera.url=Camera.url;

  camera.on("frame",function(data){
    socket.emit("Frame",data);
    });

    camera.on("error",(err)=>{
      socket.emit("ErrorCam",err);
    })
    //! Start the server manually
   camera.start();
});

socket.on("Stop",function(data){
  let Auth = JSON.parse(data);
  if(Auth.adminReq  == "QeLfer31dI"){
    console.log(`Stream closed. Reason: ${Auth.reason}`);
    camera.stop();
    return;
  }
  else{
    console.log('Stream unchanged: Unauthorized stop request');
    return;
  }
})

socket.on('disconnect', function() {
  console.log("Lost connection to Proxy Server");
  camera.stop();
});

});




