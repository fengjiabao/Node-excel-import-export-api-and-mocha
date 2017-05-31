var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var async = require('async');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Contract = require('../models/contract');
var appRootDir = require('app-root-dir').get();
var config = require('../config.json');
var createXlsx = require('../libs/createXlsx');
var importXlsx = require('../libs/importXlsx');
var multer  = require('multer');
var upload = multer({ dest: appRootDir + '/tmp/' });

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) }
			Contract.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ contracts: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/export', function(req, res) {
	  if(req.curveUser.clientId) {
	    Contract.find(paramsToFilterField(req.query, req.curveUser), function(err, contracts) {
	      if(err) {
	        console.log(err)
	        res.status(500).json({ message: "Internal error, please try again" });
	      } else {
	        Contract.multipleContractsForXlsx(contracts, function(err, data) {
	        	createXlsx.createInTemplate(data, appRootDir + config.exportTemplates.contract, function(err, filePath) {
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
			Contract.findById(req.params.id, function(err, contract) {
				if(!contract) {
					res.status(404).json({ message: "Could not find Contract with ID " + req.params.id });
				} else if(contract.userForbidden(req.curveUser, "read")) {
					res.status(403).json({ message: "Forbidden" });
				} else if(contract) {
					res.status(200).json(contract);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.put('/:id', function(req, res) {
		Contract.findById(req.params.id, function(err, foundContract) {
			if(!foundContract) {
				res.status(404).json({ message: "Could not find Contract with ID " + req.params.id });
			} else if(foundContract.userForbidden(req.curveUser, "write")) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundContract) {
				delete req.body.clientId;
				Contract.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, contract) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(contract);
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
			Contract.findByIdAndRemove(req.params.id, function(e, contract) {
				if(!contract) {
					res.status(404).json({ message: "Could not find Contract with ID " + req.params.id })					
				} else if(contract) {
					res.status(200).json(contract);
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
			var contract = new Contract(req.body);
			contract.save(function(err, contract) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(contract);
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.post('/import', upload.single('file'), function(req, res) {
	  if(req.curveUser.clientId && req.file) {
	  	var oContracts = [];
	  	var oTabData = {
	  		sales: [],
	  		returns: [],
	  		costs: [],
	  		mechanicals: [],
	  		reserves: []
	  	};

	  	var asyncArrs = [];

	  	asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.contract, 0, function(err, data) {
	    		oContracts = data;
	    		cb();
	    	});	    	
	    });
	    asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.sale, 1, function(err, sales) {
	    		oTabData.sales = sales;
	    		cb();
	    	});	    	
	    });
	    asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.return, 2, function(err, returns) {
	    		oTabData.returns = returns;
	    		cb();
	    	});
	    });
	    asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.cost, 3, function(err, costs) {
	    		oTabData.costs = costs;
	    		cb();
	    	});
	    });
	    asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.mechanical, 4, function(err, mechanicals) {
	    		oTabData.mechanicals = mechanicals;
	    		cb();
	    	});
	    });
	    asyncArrs.push(function (cb) {
	    	importXlsx.getDataByTemplate(req.file.path, config.importTemplates.reserve, 5, function(err, reserves) {
	    		oTabData.reserves = reserves;
	    		cb();
	    	});
	    });

	    async.parallel(asyncArrs, function(err, data) {
	        if(err) {
	        	console.error(err);
			    res.status(400).json({ errors: [err] });
	        } else {
	          	Contract.importContracts(oContracts, oTabData, req.curveUser.clientId, function(errors, contracts) {
		          if(errors && errors.length > 0) {
		            res.status(400).json({ errors: errors });    
		          } else {
		            res.status(200).json({ message: "All successfully imported", contracts: contracts });
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
	if(user.clientId) { params = { clientId: user.clientId }; }
	if(inputParams.text) { params["$text"] = { "$search": inputParams.text } }
	return params;
}

module.exports = router;