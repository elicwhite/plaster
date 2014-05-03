var config = module.exports;

config["My tests"] = {
  rootPath: "public/javascript/",
  libs: [
    "vendor/require.js",
    "config.js"
  ],
  environment: "browser",
  sources: ["**/*.js"],
  tests: ["tests/*-test.js"],
  extensions: [require("buster-amd"), require("buster-html-doc")],
}