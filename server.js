var express = require('express');
var app = express();

app.use(express.static(__dirname + "/build"));

var port = process.env.PORT || 8800;
app.listen(port);
console.log('Listening on port ' + port);