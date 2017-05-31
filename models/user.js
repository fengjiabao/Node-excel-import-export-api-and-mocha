var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var bcrypt = require('bcrypt');

var userSchema = new Schema({
	internal: Boolean,
	clientId: String,
	parentId: String,
	payeeId: String,
	email: String,
	status: String,
	password: String,
	forgotPasswordToken: String,
	forgotPasswordDate: Date
}, { 
	timestamps: true 
});

userSchema.plugin(mongoosePaginate);

var hashPassword = function(password) {
	if(password) {
		var salt = bcrypt.genSaltSync(10);
		return bcrypt.hashSync(password, salt);
	}
}

userSchema.methods.forgotPassword = function(callback) {
	var salt = bcrypt.genSaltSync(10);
	this.forgotPasswordToken = salt;
	this.forgotPasswordDate = Date.now();
	this.save(function(err, user) {
		callback(salt);
	});
}

userSchema.methods.setNewPassword = function(password, callback) {
	this.forgotPasswordToken = null;
	this.forgotPasswordDate = null;
	this.password = hashPassword(password);
	callback();
}

userSchema.methods.authenticate = function(password) {
	if(bcrypt.compareSync(password, this.password) && this.status == "Active") {
		return {
			response: true,
			message: 'Authentication passed.'
		};
	} else if(bcrypt.compareSync(password, this.password) && this.status != "Active") {
		return {
			response: false,
			message: 'User access is restricted.'
		};
	} else {
		return {
			response: false,
			message: 'Password is incorrect. Please try again.'
		};
	}
}

userSchema.methods.type = function() {
	if(this.payeeId) {
		return "payee";
	} else if(this.internal) {
		return "internal";
	} else if(this.parentId) {
		return "parent";
	} else if(this.clientId) {
		return "client";
	}
}

userSchema.methods.getType = function(callback) {
	if(this.payeeId) {
		callback("payee");
	} else if(this.internal) {
		callback("internal");
	} else if(this.parentId) {
		callback("parent");
	} else if(this.clientId) {
		callback("client");
	}
}

var User = mongoose.model('User', userSchema);
module.exports = User;
module.exports.hashPassword = hashPassword;