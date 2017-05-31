var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var SalesAccount = require('../models/salesAccount');

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25) }
			SalesAccount.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ salesAccounts: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/:id', function(req, res) {
		if(req.curveUser.clientId) {
			SalesAccount.findById(req.params.id, function(err, salesAccount) {
				if(!salesAccount) {
					res.status(404).json({ message: "Could not find SalesAccount with ID " + req.params.id });
				} else if(salesAccount.userForbidden(req.curveUser)) {
					res.status(403).json({ message: "Forbidden" });
				} else if(salesAccount) {
					res.status(200).json(salesAccount);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.put('/:id', function(req, res) {
		SalesAccount.findById(req.params.id, function(err, foundSalesAccount) {
			if(!foundSalesAccount) {
				res.status(404).json({ message: "Could not find SalesAccount with ID " + req.params.id });
			} else if(foundSalesAccount.userForbidden(req.curveUser)) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundSalesAccount) {
				delete req.body.clientId;
				SalesAccount.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, salesAccount) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(salesAccount);
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
			SalesAccount.findByIdAndRemove(req.params.id, function(e, salesAccount) {
				if(!salesAccount) {
					res.status(404).json({ message: "Could not find SalesAccount with ID " + req.params.id })					
				} else if(salesAccount) {
					res.status(200).json(salesAccount);
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
			var salesAccount = new SalesAccount(req.body);
			salesAccount.save(function(err, salesAccount) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(salesAccount);
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