process.env.NODE_ENV = 'development';
require("./models/db");
var Client = require("./models/client.js");

for(var i = 1; i < 30; i++) {
	var client = new Client({
		name: "Pagination Client " + i
	});
	client.save();
}