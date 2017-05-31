var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var SalesFile = require('../models/salesFile');

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25) }
			SalesFile.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/:id', function(req, res) {
		if(req.curveUser.clientId) {
			SalesFile.findById(req.params.id, function(err, salesFile) {
				if(!salesFile) {
					res.status(404).json({ message: "Could not find SalesFile with ID " + req.params.id });
				} else if(salesFile.userForbidden(req.curveUser)) {
					res.status(403).json({ message: "Forbidden" });
				} else if(salesFile) {
					res.status(200).json(salesFile);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.put('/:id', function(req, res) {
		SalesFile.findById(req.params.id, function(err, foundSalesFile) {
			if(!foundSalesFile) {
				res.status(404).json({ message: "Could not find SalesFile with ID " + req.params.id });
			} else if(foundSalesFile.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundSalesFile) {
				delete req.body.clientId;
				SalesFile.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, salesFile) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(salesFile);
					}
				});
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.delete('/:id', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			SalesFile.findByIdAndRemove(req.params.id, function(e, salesFile) {
				if(!salesFile) {
					res.status(404).json({ message: "Could not find SalesFile with ID " + req.params.id })					
				} else if(salesFile) {
					res.status(200).json(salesFile);
				} else {
					console.log(e);
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
		
	})

	.post('/', parseUrlencoded, function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			var salesFile = new SalesFile(req.body);
			salesFile.save(function(err, salesFile) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(salesFile);
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	});

function paramsToFilterField(params, user) {
	params = {};
	if(user.payeeId && user.contractIds && user.contractIds.length > 0) {
		params = { $and: [{ clientId: user.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: user.contractIds } }, { 'costsRights.contractId': { $in: user.contractIds } }] }] };
	} else if(user.clientId) { 
		params = { clientId: user.clientId };
	}
	console.log(params);
	return params;
}

module.exports = router;