process.env.NODE_ENV = 'development';
console.log(process.env.NODE_ENV);
require("./models/db");
var User = require("./models/user.js");
var Parent = require("./models/parent.js");
var Client = require("./models/client.js");
var Payee = require("./models/payee.js");

console.log('running');

// Internal
var user = new User({
	email: "internal@curveroyalties.com",
	password: User.hashPassword("Allen2009!"),
	internal: true,
	status: "Active"
});

user.save(function(err) {
	console.log(err);
	console.log(user);
});

// Parent
var parent = new Parent({
	name: "Test Parent"
});
parent.save(function(err) {
	console.log(parent);
	User.create({
		email: "parent@curveroyalties.com",
		password: User.hashPassword("Allen2009!"),
		internal: false,
		parentId: parent._id,
		status: "Active"
	});

	// Client
	var client = new Client({
		parentId: parent._id,
		name: "Test Client"
	});
	client.save(function(err) {
		console.log(client);
		User.create({
			email: "client@curveroyalties.com",
			password: User.hashPassword("Allen2009!"),
			internal: false,
			clientId: client._id,
			status: "Active"
		});

		// Payee
		var payee = new Payee({
			clientId: client._id,
			name: "Test Payee"
		});
		payee.save(function(err) {
			console.log(payee)
			User.create({
				email: "payee@curveroyalties.com",
				password: User.hashPassword("Allen2009!"),
				internal: false,
				clientId: client._id,
				payeeId: payee._id,
				status: "Active"
			});
			User.count({}, function(err, count) {
				console.log("Users Created: " + count);
			});
		});
	});

});
