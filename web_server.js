var connect = require('connect');
var serveStatic = require('serve-static');

// __dirname is a global object !!!!!!!!!!!!
connect().use(serveStatic(__dirname)).listen(1337, function(){
    console.log('Webserver running on port 1337.');
});