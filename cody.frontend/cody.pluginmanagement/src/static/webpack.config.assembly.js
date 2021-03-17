const path = require("path");

module.exports = {
	entry: path.join(__dirname, "TS", "assembly_script.ts"),
	mode: "production",
	devtool: "eval-source-map",
	context: path.resolve(
		"C:\\Users\\Oliver.Tressler\\source\\repos\\cody-toolkit\\cody.frontend\\cody.pluginmanagement\\src\\static"
	),
	output: {
		filename: "assembly_script.js",
		publicPath: "/JS/",
		path: path.join(__dirname, "..", "..", "dist", "static", "JS"),
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
	resolve: {
		extensions: [".ts"],
	},
};
