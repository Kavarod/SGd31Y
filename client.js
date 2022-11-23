const fs = require("fs");
const io = require("socket.io-client");
const request = require("request");
//Local camera jpeg consumer library.
const MjpegConsumer = require("./MjpegConsumer");

//* connect to socket with Auth Token.
const socket = io("https://nameless-hollows-47413.herokuapp.com", {
	transportOptions: {
		polling: {
			extraHeaders: {
				Authorization: "Bearer Infinno#Bathomatic123",
			},
		},
	},
});

socket.on("connect", () => {
	console.log("Client connected.");
});

socket.on("disconnect", () => {
	console.log("Client disconnected.");
	//Try to reconnect.
	socket.connect();
});

//! Key App state.
//Holds all camera connections + 1 buffer.
let camerarequests = [null, null, null, null, null, null];
//* Read JSON data once!
const CamData = JSON.parse(
	fs.readFileSync("./cameraStorage.json", "utf-8")
).cams;

socket.on("validId", (id) => {

	// holds the current connection to active camera.
	let camerarequest = null;

	if(camerarequests[id]!=null){
		socket.emit("error", `Error: Camera with id ${id} already in use.`, id);
		return;
	}
	console.log("Client has been given a valid id.");
	const consumer = new MjpegConsumer();

	const Camera = CamData[id];

	if (Camera == undefined) {
		socket.emit("error", `Error: Camera with id ${id} can not be found.`, id);
		return;
	}

	//? http://mjpeg.sanford.io/count.mjpeg
	camerarequest = request(Camera.url)
		.on("error", () => {
			console.log("unable to connect to camera.");
			socket.emit(
				"error",
				"Error: Camera is not working properly, connection failed.",
				id
			);
			// Return null to object instance so if can be reset manually (important).
			return null;
		})
		.on("response", () => {
			console.log("Request is possible, writting response headers.");
			socket.emit("response", id);
		})
		.pipe(consumer)
		.on("data", (content) => {
			socket.emit("frame", content, id);
		});

	camerarequests[id] = camerarequest;
});

socket.on("terminate", (id) => {
	if (camerarequests.at(id)) {
		camerarequests.at(id).end();
		camerarequests[id] = null;
		console.log("camera terminated.");
	}
});
