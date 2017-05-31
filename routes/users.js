var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var jsonBodyParser = bodyParser.json();
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var User = require('../models/user');

router
	.get('/', function(req, res) {
		var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25) }
		User.paginate(paramsToFilterField(req.query), paginationParams, function(err, result) {
			if(err) { 
				console.log(err)
				res.status(500).json({ message: "Internal error, please try again" });
			} else {
				res.status(200).json({ users: result.docs, meta: { current_page: paginationParams.page, pages: result.pages } });
			}
		});
	})

	.get('/:id', function(req, res) {
		User.findById(req.params.id, function(err, user) {
			if(err) {
				res.status(500).json({ message: "Internal error, please try again" });
			} else if(user) {
				res.status(200).json(user);
			} else {
				res.status(404).json({ message: "Could not find User with ID " + req.params.id });
			}
		});
	})

	.put('/:id', parseUrlencoded, function(req, res) {
		User.findByIdAndUpdate(req.params.id, req.query, { new: true }, function(err, user) {
			if(err) {
				res.status(500).json({ message: "Internal error, please try again" });
			} else if(user) {
				res.status(200).json(user);
			} else {
				res.status(404).json({ message: "Could not find User with ID " + req.params.id });
			}
		});
	})

	.delete('/:id', function(req, res) {
		User.findByIdAndRemove(req.params.id, function(err, user) {
	  	if(err) {
				res.status(500).json({ message: "Internal error, please try again" });
			} else if(user) {
				res.status(200).json({ message: "User successfully deleted" });
			} else {
				res.status(404).json({ message: "Could not find User with ID " + req.params.id });
			}
	  });
	})

	.post('/', parseUrlencoded, function(req, res) {
		console.log(req.body);
		req.body.password = User.hashPassword(req.body.password);
		var user = new User(req.body);
		user.save(function(err, user) {
			if(err) {
				res.status(500).json({ message: "Internal error, please try again" });
			} else {
				res.status(200).json(user);
			}
		});
	});

function paramsToFilterField() {
	params = {};
	return params;
}

module.exports = router;