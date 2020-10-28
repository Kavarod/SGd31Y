
const  desiredConn = "https://damp-waters-51468.herokuapp.com";
const socket = require('socket.io-client')(desiredConn);
const MjpegCamera = require('./mjpegCamera');
const fs = require("fs");

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
  const camera = new MjpegCamera({
    name: Camera.name,
    user: Camera.user,
    password: Camera.password,
    url: Camera.url
  });

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

