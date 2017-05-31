var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var salesFileSchema = new Schema({
	clientId: String,
	name: String,
	salesAccountName: String,
	salesAccountId: String,
	salesTemplateName: String,
	salesTemplateId: String,
	totalValue: Number,
	status: String,
	valid: Boolean,
	unmappedLines: Number,
	file: String
}, { 
	timestamps: true 
});

salesFileSchema.plugin(mongoosePaginate);

salesFileSchema.methods.userForbidden = function(user) {
	if(user.clientId == this.clientId && !user.payeeId) {
		// Only available to a client
		return false;
	} else {
		return true;
	}
}

var SalesFile = mongoose.model('SalesFile', salesFileSchema);

module.exports = SalesFile;