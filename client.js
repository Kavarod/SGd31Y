const fs = require("fs");
const io = require("socket.io-client");
const socket = io("http://localhost:3000");
const request = require("request");
const MjpegConsumer = require("./MjpegConsumer");

socket.on("connect", () => {
	console.log("Client connected.");
});

socket.on("disconnect", () => {
	console.log("Bye from client!");
	// Reconnect automatically.
	// socket.connect();
});

socket.on("validId", (id) => {
	const consumer = new MjpegConsumer();

	const CamData = JSON.parse(
		fs.readFileSync("./CameraStorage.json", "utf-8")
	).cams;

	const Camera = CamData[id];

	if (Camera == undefined) {
		socket.emit("error", `Error: Camera with id ${id} can not be found.`);
		return;
	}

	//! http://mjpeg.sanford.io/count.mjpeg
	request("http://mjpeg.sanford.io/count.mjpeg")
		.on("error", (e) => {
			console.log("unable to connect to camera, write error html.");
			socket.emit(
				"error",
				"Error: Camera is not working properly, connection failed."
			);
			return;
		})
		.on("response", () => {
			console.log("request is possible, write headers.");
			socket.emit("response");
		})
		.pipe(consumer)
		.on("data", (content) => {
			socket.emit("frame", content);
		});
});
