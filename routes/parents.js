var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Parent = require('../models/parent');

router
	.get('/', function(req, res) {
		if(req.curveUser.internal) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25) }
			Parent.paginate(paramsToFilterField(req.query), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ parents: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/:id', function(req, res) {
		Parent.findById(req.params.id, function(err, parent) {
			if(!parent) {
				res.status(404).json({ message: "Could not find Parent with ID " + req.params.id });
			} else if(parent.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(parent) {
				res.status(200).json(parent);
			} else {
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.put('/:id', function(req, res) {
		Parent.findById(req.params.id, function(err, foundParent) {
			if(!foundParent) {
				res.status(404).json({ message: "Could not find Parent with ID " + req.params.id });
			} else if(foundParent.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundParent) {
				Parent.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, parent) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(parent);
					}
				});
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.delete('/:id', function(req, res) {
		if(!req.curveUser.internal) {
			res.status(403).json({ message: "Forbidden" });
		} else {
			Parent.findByIdAndRemove(req.params.id, function(e, parent) {
				if(!parent) {
					res.status(404).json({ message: "Could not find Parent with ID " + req.params.id })					
				} else if(parent) {
					res.status(200).json(parent);
				} else {
					console.log(e);
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		}
		
	})

	.post('/', parseUrlencoded, function(req, res) {
		if(!req.curveUser.internal) {
			res.status(403).json({ message: "Forbidden" });
		} else {
			var parent = new Parent(req.body);
			parent.save(function(err, parent) {
				if(err) {
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(parent);
				}
			});
			}
	});

function paramsToFilterField() {
	params = {};
	return params;
}

module.exports = router;