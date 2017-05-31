var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Client = require('../models/client');

router
	.get('/', function(req, res) {
		if(req.curveUser.parentId || req.curveUser.internal) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) }
			Client.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ clients: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/:id', function(req, res) {
		Client.findById(req.params.id, function(err, client) {
			if(!client) {
				res.status(404).json({ message: "Could not find Client with ID " + req.params.id });
			} else if(client.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(client) {
				res.status(200).json(client);
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.put('/:id', function(req, res) {
		Client.findById(req.params.id, function(err, foundClient) {
			if(!foundClient) {
				res.status(404).json({ message: "Could not find Client with ID " + req.params.id });
			} else if(foundClient && foundClient.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundClient) {
				delete req.body.parentId;
				Client.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(err, client) {
					if(err) {
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(client);
					}
				});
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.delete('/:id', function(req, res) {
	  Client.findById(req.params.id, function(err, foundClient) {
			if(!foundClient) {
				res.status(404).json({ message: "Could not find Client with ID " + req.params.id });
			} else if(foundClient.userForbidden(req.curveUser) || (!req.curveUser.internal && !req.curveUser.parentId && req.curveUser.clientId)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundClient) {
				Client.findByIdAndRemove(req.params.id, function(err, client) {
					if(err) {
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json({ message: "Client successfully deleted" });
					}
				});
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.post('/', parseUrlencoded, function(req, res) {
		if(!req.curveUser.internal && !req.curveUser.parentId && req.curveUser.clientId) {
			res.status(403).json({ message: "Forbidden" });
		} else {
			var client = new Client(req.body);
			if(req.curveUser.parentId) { client.parentId = req.curveUser.parentId; }
			client.save(function(err, client) {
				if(err) {
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(client);
				}
			});
		}		
	});

function paramsToFilterField(query, curveUser) {
	params = {};
	if(curveUser.parentId) { 
		params.parentId = curveUser.parentId; 
	} else if(curveUser.clientId) {
		params._id = curveUser.clientId; 
	}
	if(query.name) { params.name = new RegExp(query.name, "i") }
	console.log(params);
	return params;
}

module.exports = router;