var config = module.exports;

/*config["My tests"] = {
    environment: "browser", // or "node"
    sources: [
        "build/javascript/main.min.js"
    ],
    tests: [
        "public/javascript/tests/*-test.js"
    ]
}*/
config["My tests"] = {
  rootPath: "public/javascript/",
  libs: [
    "vendor/require.js",
    "config.js"
  ],
  environment: "browser",
  sources: ["**/*.js"],
  tests: ["tests/*-test.js"],
  extensions: [require("buster-amd")],
}