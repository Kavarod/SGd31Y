const Transform = require("stream").Transform;

let lengthRegex = /Content-Length:\s*(\d+)/i;

// Start of Image
const soi = Buffer.from([0xff, 0xd8]);

// End of Image
const eoi = Buffer.from([0xff, 0xd9]);

/**
 * Simple class for consuming mjpeg stream form a camera.
 * @param {import("stream").TransformOptions} options options to camera, by default are empty..
 */
class MjpegConsumer extends Transform {
	buffer = null;

	reading = false;
	contentLength = null;
	bytesWritten = 0;

	constructor(options) {
		super(options);
	}

	/**
	 * @param {Number} len - length to initialize buffer
	 * @param {Buffer} chunk - chunk of http goodness
	 * @param {Number=} start - optional index of start of jpeg chunk
	 * @param {Number=} end - optional index of end of jpeg chunk
	 *
	 * Initialize a new buffer and reset state
	 */
	_initFrame = function (len, chunk, start, end) {
		this.contentLength = len;
		this.buffer = Buffer.alloc(len);
		this.bytesWritten = 0;

		let hasStart = typeof start !== "undefined" && start > -1;
		let hasEnd = typeof end !== "undefined" && end > -1 && end > start;

		if (hasStart) {
			let bufEnd = chunk.length;

			if (hasEnd) {
				bufEnd = end + eoi.length;
			}

			chunk.copy(this.buffer, 0, start, bufEnd);

			this.bytesWritten = chunk.length - start;
			// If we have the eoi bytes, send the frame
			if (hasEnd) {
				this._sendFrame();
			} else {
				this.reading = true;
			}
		}
	};

	/**
	 * @param {Buffer} chunk - chunk of http goodness
	 * @param {Number} start - index of start of jpeg in chunk
	 * @param {Number} end - index of end of jpeg in chunk
	 *
	 */
	_readFrame = function (chunk, start, end) {
		let bufStart = start > -1 && start < end ? start : 0;
		let bufEnd = end > -1 ? end + eoi.length : chunk.length;

		chunk.copy(this.buffer, this.bytesWritten, bufStart, bufEnd);

		this.bytesWritten += bufEnd - bufStart;

		if (end > -1 || this.bytesWritten === this.contentLength) {
			this._sendFrame();
		} else {
			this.reading = true;
		}
	};

	/**
	 * Handle sending the frame to the next stream and resetting state
	 */
	_sendFrame = function () {
		this.reading = false;
		this.push(this.buffer);
	};

	_transform = function (chunk, encoding, done) {
		let start = chunk.indexOf(soi);
		let end = chunk.indexOf(eoi);
		let len = (lengthRegex.exec(chunk.toString("ascii")) || [])[1];

		if (this.buffer && (this.reading || start > -1)) {
			this._readFrame(chunk, start, end);
		}

		if (len) {
			this._initFrame(+len, chunk, start, end);
		}

		done();
	};
}

module.exports = MjpegConsumer;
