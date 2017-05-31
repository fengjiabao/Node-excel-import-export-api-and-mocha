var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var costSchema = new Schema({
	clientId: String,
	name: String,
	type: String,
	invoiceNo: String,
	description: String,
	file: String,
	amount: Number,
	releases: Array,
	tracks: Array,
	works: Array,
	contracts: Array,
	associatedContractIds: Array
}, { 
	timestamps: true 
});

costSchema.plugin(mongoosePaginate);

costSchema.methods.userForbidden = function(user, readWrite) {
	var containsContractIds = false;
	this.containsContractIds(user.contractIds, function(contains) {
		containsContractIds = contains;
	});
	if(user.clientId == this.clientId && !user.payeeId) {
		// Write only should be client only
		return false;
	} else if(readWrite == "read" && user.clientId == this.clientId && user.payeeId && containsContractIds) {
		// Payee allowed to read
		return false;
	} else {
		return true;
	}
}

costSchema.methods.containsContractIds = function(passedContractIds, callback) {
	if(passedContractIds) {
		var value = false;
		var cost = this;
		passedContractIds.forEach(function(passedContractId, cb) {
			if(cost.associatedContractIds.indexOf(passedContractId) != -1) { 
				value = true;
			}
			if(passedContractId == passedContractIds[passedContractIds.length - 1]) { 
				callback(value);
			}
		});
	} else {
		callback(false);
	}
}

var Cost = mongoose.model('Cost', costSchema);

module.exports = Cost;