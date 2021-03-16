const path = require("path");

module.exports = {
	entry: path.join(__dirname, "/TS/step_script.ts"),
	output: {
		filename: "step_script.js",
		publicPath: "/JS/",
		path: path.join(__dirname, "JS"),
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			loader: "ts-loader",
			exclude: /node_modules/,
		}, ],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
};