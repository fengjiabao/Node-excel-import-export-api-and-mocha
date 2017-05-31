var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Release = require('../models/release');
var appRootDir = require('app-root-dir').get();
var config = require('../config.json');
var createXlsx = require('../libs/createXlsx');
var importXlsx = require('../libs/importXlsx');
var multer  = require('multer');
var upload = multer({ dest: appRootDir + '/tmp/' });

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) }
			Release.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ releases: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/export', function(req, res) {
	  if(req.curveUser.clientId) {
	    Release.find(paramsToFilterField(req.query, req.curveUser), function(err, releases) {
	      if(err) {
	        console.log(err)
	        res.status(500).json({ message: "Internal error, please try again" });
	      } else {
	        Release.multipleReleasesForXlsx(releases, function(err, data) {
	        	createXlsx.createInTemplate([data], appRootDir + config.exportTemplates.release, function(err, filePath) {
	        		if(err) {
	        			console.log(err)
	        			res.status(500).json({ message: "Internal error, please try again" });
	        		} else {
	        			createXlsx.deliverFile(filePath, res);
	        		}
	        	});
	        });
	      }
	    });
	  } else {
	    res.status(403).json({ message: "Forbidden" });
	  }
	})

	.get('/:id', function(req, res) {
		if(req.curveUser.clientId) {
			Release.findById(req.params.id, function(err, release) {
				if(!release) {
					res.status(404).json({ message: "Could not find Release with ID " + req.params.id });
				} else if(release.userForbidden(req.curveUser, "read")) {
					res.status(403).json({ message: "Forbidden" });
				} else if(release) {
					res.status(200).json(release);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})
	
	.put('/:id', function(req, res) {
		Release.findById(req.params.id, function(err, foundRelease) {
			if(!foundRelease) {
				res.status(404).json({ message: "Could not find Release with ID " + req.params.id });
			} else if(foundRelease.userForbidden(req.curveUser, "write")) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundRelease) {
				delete req.body.clientId;
				Release.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, release) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(release);
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
			Release.findByIdAndRemove(req.params.id, function(e, release) {
				if(!release) {
					res.status(404).json({ message: "Could not find Release with ID " + req.params.id })					
				} else if(release) {
					res.status(200).json(release);
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
			req.body.clientId = req.curveUser.clientId;
			var release = new Release(req.body);
			release.save(function(err, release) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(release);
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.post('/import', upload.single('file'), function(req, res) {
	  if(req.curveUser.clientId && req.file) {
	    importXlsx.getDataByTemplate(req.file.path, config.importTemplates.release, 0, function(err, data) {
	      if(err) { 
	        console.error(err);
	        res.status(400).json({ errors: [err] });    
	      } else {
	        Release.importReleases(data, req.curveUser.clientId, function(errors, releases) {
	          if(errors && errors.length > 0) {
	            res.status(400).json({ errors: errors });    
	          } else {
	            res.status(200).json({ message: "All successfully imported", releases: releases });
	          }
	        });
	      }
	    });
	  } else if(req.curveUser.clientId && !req.file) { 
	    res.status(400).json({ errors: ["Requires a file to be uploaded"] });
	  } else {
	  	res.status(403).json({ message: "Forbidden" });
	  }
	});

function paramsToFilterField(inputParams, user) {
	params = {};
	if(user.payeeId && user.contractIds && user.contractIds.length > 0) {
		params = { $and: [{ clientId: user.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: user.contractIds } }, { 'costsRights.contractId': { $in: user.contractIds } }] }] };
	} else if(user.clientId) { 
		params = { clientId: user.clientId };
	}
	if(inputParams.text) { params["$text"] = { "$search": inputParams.text } }
	return params;
}

module.exports = router;