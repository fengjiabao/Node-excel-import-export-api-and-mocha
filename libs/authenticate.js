var jwt = require('jsonwebtoken');
var config = require('../config.json');

var decodeToken = function(token, callback) {
	if(token) {
		jwt.verify(token, config.jsonSecretToken, function(err, decoded) {
			if(err) {
				callback();
			} else {
				callback(decoded);
			}
		});
	} else {
		callback();
	}
}

module.exports.decodeToken = decodeToken;