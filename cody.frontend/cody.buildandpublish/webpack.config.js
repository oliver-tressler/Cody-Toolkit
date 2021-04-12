//@ts-check

"use strict";

const path = require("path");
const nodeExternals = require("webpack-node-externals");
/**@type {import('webpack').Configuration}*/
module.exports = {
	target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
	entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, "dist"),
		filename: "extension.js",
		libraryTarget: "commonjs2",
	},
	devtool: "nosources-source-map",
	externals: ["vscode", nodeExternals({ allowlist: ["axios", "follow-redirects"] })],
	resolve: {
		// support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: [/\.ts$/, /\.js$/],
				exclude: /node_modules/,
				loader: require.resolve("ts-loader"),
				options: {
					transpileOnly: true,
				},
			},
		],
	},
};
