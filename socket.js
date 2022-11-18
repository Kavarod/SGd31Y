const desiredConn = "https://localhost:3000";
const MjpegCamera = require("./mjpegCamera");
const fs = require("fs");

const WebSocketClient = require('websocket').client;
const client = new WebSocketClient('ws://'+ desiredConn,'echo-protocol');

//!Fallback case for camera!!
const camera = new MjpegCamera({
	name: "Main Cam",
	user: "admin",
	password: "1234",
	url: "http://admin:admin@192.168.2.171/snapshot.cgi",
});

//TODO: handle disconnection from proxy server!
/*
	socket.on("Stop", function (data) {
		let Auth = JSON.parse(data);
		if (Auth.adminReq == "QeLfer31dI") {
			console.log(`Stream closed. Reason: ${Auth.reason}`);
			camera.stop();
			return;
		} else {
			console.log("Stream unchanged: Unauthorized stop request");
			return;
		}
	});
	socket.on("disconnect", function () {
		console.log("Lost connection to Proxy Server");
		camera.stop();
	});*/

client.on("connection", (socketclient) => {
	console.log("Camera connected to the proxy server.");
	socketclient.onmessage(({ data }) => {
		const id = Number(data);
		let CamData = JSON.parse(
			fs.readFileSync("./CameraStorage.json", "utf-8")
		).cams;
		let Camera = CamData[id];

		if (Camera == undefined) {
			console.log(`Camera obj is undefined by id : ${id}`);
			return;
		}
		camera.name = Camera.name;
		camera.user = Camera.user;
		camera.password = Camera.password;
		camera.url = Camera.url;

		//* Start the server manually
		camera.start();

		camera.on("frame", function (data) {
			//Send blob chunk form camera.
			socketclient.send(data);
		});

		camera.on("error", (err) => {
			console.log("Camera gave an Error.");
			camera.close();
			// socket2.close();
		});
	});
});
