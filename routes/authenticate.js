var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var User = require('../models/user');
var jwt = require('jsonwebtoken');
var config = require('../config');

router
	.post('/', parseUrlencoded, function(req, res) {
		User.findOne({ email: req.body.email }, function(err, user) {
			if(err) { console.log(err); }
			if(!user) {
				// If no user found
	      res.status(200).json({ success: false, message: 'Email not found. Please check details and try again.' });
	    } else if(user) {
	    	// User found, check if password matches
	    	var auth = user.authenticate(req.body.password);
	    	if(!auth.response) {
	    		// Authentication fails
	    		res.status(200).json({ success: false, message: auth.message })
	    	} else {
	    		// Authentication passes - create token
	    		user.getType(function(type) {
	    			var token = jwt.sign({ id: user._id, type: type, internal: user.internal, parentId: user.parentId, clientId: user.clientId, payeeId: user.payeeId }, config.jsonSecretToken, { expiresIn: 86400 });
		    		res.status(200).json({
		    			success: true,
		    			userType: type,
		    			token: token
		    		});
	    		});
	    	}
	    }
		});
	})
	.get('/test_token', function(req, res) {
		if(req.query.token) {
			jwt.verify(req.query.token, config.jsonSecretToken, function(err, decoded) {
				if(err) {
					console.log(err);
					res.status(200).json({
						success: false
					});
				} else {
					res.status(200).json({
						success: true,
		  			userType: decoded.type,
		  			token: req.query.token
					});
				}
			});
		} else {
			res.status(200).json({
				success: false
			});
		}
	});

module.exports = router;