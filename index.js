var express = require('express');
var app = express();

require('./routes/index');

app.use(express.static(__dirname + '/public'));
app.use(require('./routes'));

app.listen(8081);

module.exports = app;