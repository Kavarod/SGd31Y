const fs = require("fs");
const io = require("socket.io-client");
const request = require("request");
//Local camera jpeg consumer library.
const MjpegConsumer = require("./MjpegConsumer");
// Local restart function.
const restart = require("./restart");

//* connect to socket with Auth Token.
//https://nameless-hollows-47413.herokuapp.com
const socket = io("https://nameless-hollows-47413.herokuapp.com", {
	auth: {
		token: "Bearer Infinno#Bathomatic423",
	},
	transports: ["websocket"],
	timeout: 35000,
	pingTimeout: 180000,
	reconnectionDelayMax: 3000,
	reconnect: false,
});

socket.on("connect", () => {
	console.log(
		"\nClient connected" + " @ " + new Date(Date.now()).toUTCString()
	);
});

socket.on("disconnect", (reason) => {
	console.log(
		"\nClient disconnected" + " @ " + new Date(Date.now()).toUTCString()
	);
	if (reason) {
		console.log("Reason for disconnection: " + reason);
	}
	//Try to reconnect manually by restating the proccess.
	setTimeout(restart, 1000);
});

//* Key app state.
//Holds all camera connections + 1 buffer.
let camerarequests = [null, null, null, null, null, null];

//* Read JSON data once!
const CamData = JSON.parse(
	fs.readFileSync("./CameraStorage.json", "utf-8")
).cams;

socket.on("validId", (id) => {
	// holds the current connection to active camera.
	let camerarequest = null;

	const consumer = new MjpegConsumer();
	const Camera = CamData[id];

	if (Camera == undefined) {
		socket.emit("error", `Error: Camera with id ${id} can not be found.`, id);
		return;
	}
	console.log("camera is validly choosen.");

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
			console.log("camera started.");
			socket.emit("response", id);
		})
		.pipe(consumer)
		.on("data", (content) => {
			socket.emit("frame", content, id);
		});

	camerarequests[id] = camerarequest;
});

//* When the user wants to end the current camera stream.
socket.on("terminate", (id) => {
	if (camerarequests[id]) {
		camerarequests[id].end();
		camerarequests[id] = null;
		console.log("camera terminated. \n");
	}
});
