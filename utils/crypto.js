const crypto = require('crypto');

module.exports.encrypt = (text, algorithm, password) => {
    var cipher = crypto.createDecipheriv(algorithm, password, Buffer.alloc(16, 0));
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}
   
module.exports.decrypt = (text, algorithm, password) => {
    var decipher = crypto.createDecipheriv(algorithm, password, Buffer.alloc(16, 0));
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}
