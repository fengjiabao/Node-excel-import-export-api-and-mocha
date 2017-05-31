var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var salesAccountSchema = new Schema({
	clientId: String,
	name: String,
	type: String
}, { 
	timestamps: true 
});

salesAccountSchema.plugin(mongoosePaginate);

salesAccountSchema.methods.userForbidden = function(user) {
	if(user.clientId == this.clientId && !user.payeeId) {
		// Only available to a client
		return false;
	} else {
		return true;
	}
}

var SalesAccount = mongoose.model('SalesAccount', salesAccountSchema);

module.exports = SalesAccount;