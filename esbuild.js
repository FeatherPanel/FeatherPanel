require('esbuild').build({
	platform: "node",
	target: "esnext",
	entryPoints: ["./src/**/*.ts"],
	tsconfig: "./tsconfig.json",
	format: "cjs",
	outdir: "./dist/src",
	minify: true,
}).catch((e) => {
	console.error(e);
	process.exit(1);
});
