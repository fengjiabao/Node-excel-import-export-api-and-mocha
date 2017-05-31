var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var SalesTemplate = require('../models/salesTemplate');

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25) }
			SalesTemplate.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ salesTemplates: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/:id', function(req, res) {
		if(req.curveUser.clientId) {
			SalesTemplate.findById(req.params.id, function(err, salesTemplate) {
				if(!salesTemplate) {
					res.status(404).json({ message: "Could not find SalesTemplate with ID " + req.params.id });
				} else if(salesTemplate.userForbidden(req.curveUser)) {
					res.status(403).json({ message: "Forbidden" });
				} else if(salesTemplate) {
					res.status(200).json(salesTemplate);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.put('/:id', function(req, res) {
		SalesTemplate.findById(req.params.id, function(err, foundSalesTemplate) {
			if(!foundSalesTemplate) {
				res.status(404).json({ message: "Could not find SalesTemplate with ID " + req.params.id });
			} else if(foundSalesTemplate.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundSalesTemplate) {
				delete req.body.clientId;
				SalesTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, salesTemplate) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(salesTemplate);
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
			SalesTemplate.findByIdAndRemove(req.params.id, function(e, salesTemplate) {
				if(!salesTemplate) {
					res.status(404).json({ message: "Could not find SalesTemplate with ID " + req.params.id })					
				} else if(salesTemplate) {
					res.status(200).json(salesTemplate);
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
			var salesTemplate = new SalesTemplate(req.body);
			salesTemplate.save(function(err, salesTemplate) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(salesTemplate);
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