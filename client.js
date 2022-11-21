const fs = require("fs");
const io = require("socket.io-client");
const socket = io("http://localhost:3000");
const request = require("request");
const MjpegConsumer = require("./MjpegConsumer");

//! Key State.
let camerarequest = null;

socket.on("connect", () => {
	console.log("Client connected.");
});

socket.on("disconnect", () => {
	console.log("Client disconnected.");
	socket.connect();
});

socket.on("validId", (id) => {
	
	console.log("Client has been given a valid id!");
	const consumer = new MjpegConsumer();

	const CamData = JSON.parse(
		fs.readFileSync("./CameraStorage.json", "utf-8")
	).cams;

	const Camera = CamData[id];

	if (Camera == undefined) {
		socket.emit("error", `Error: Camera with id ${id} can not be found.`);
		return;
	}

	//? http://mjpeg.sanford.io/count.mjpeg
	camerarequest = request("http://mjpeg.sanford.io/count.mjpeg")
		.on("error", (e) => {
			console.log("unable to connect to camera, write error html.");
			socket.emit(
				"error",
				"Error: Camera is not working properly, connection failed."
			);
			camerarequest.end();
		})
		.on("response", () => {
			console.log("Request is possible, writting headers.");
			socket.emit("response");
		})
		.pipe(consumer)
		.on("data", (content) => {
			socket.emit("frame", content);
		});
});

socket.on("terminate",()=>{
	if(camerarequest){
		camerarequest.end();
		console.log("camera terminated.");
	}
});

