const fs = require("fs");
const io = require("socket.io-client");
const request = require("request");
//Local camera jpeg consumer library.
const MjpegConsumer = require("./MjpegConsumer");

//* connect to socket with Auth Token.
//https://nameless-hollows-47413.herokuapp.com
//http://localhost:3000
const socket = io("https://nameless-hollows-47413.herokuapp.com", {
	auth: {
		token: "Bearer Infinno#Bathomatic423",
	},
	transports: ["websocket"],
	timeout: 35000,
	pingTimeout: 180000,
	reconnectionDelayMax: 3000,
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
	//Try to reconnect manually.
	socket.connect();
});

//! Key App state.
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

//Every 10 seconds.
const pingtime = 10000;
/**
 * Helper function for sending pings to the client socket.
 */
function sendHeartbeat() {
	setTimeout(sendHeartbeat, pingtime);
	socket.emit("ping", { beat: 1 });
}
//*Prevents the client socket from timeout.
setTimeout(sendHeartbeat, pingtime);

//* Prevents the client socket from timeing out.
socket.on("pong", function (data) {
	//Don't pollute the console with pings.
});