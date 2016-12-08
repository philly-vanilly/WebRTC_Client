// var connect = require('connect');
// var serveStatic = require('serve-static');
//
// // __dirname is a global object !!!!!!!!!!!!
// connect().use(serveStatic(__dirname)).listen(1337, function(){
//     console.log('Webserver running on port 1337.');
// });

//WEBSERVER
var express = require('express');
var app = express();
// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;
// set the view engine to ejs
app.set('view engine', 'ejs');
// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname));
// set the home page route
app.get('/', function(req, res) {
    // ejs render automatically looks in the views folder
    res.render('index');
});
app.listen(port, function() {
    console.log('Our web server is running on http://localhost:' + port);
});


//SIGNALLING SERVER
var WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port:1337 });

var users = {}; //hashmap (js-object) of user-id-key and connection-value (containing name of other participant)

wss.on('listening', function () {
    console.log("Signalling server started on port " + 1337);
});

wss.on('connection', function (connection) {
    //FROM THIS POINT USER CONSIDERED CONNECTED (and "connected PRESS CTRL+C to quit" message sent to him)

    console.log("User " + connection.name + " connected"); //displayed on websocket server console
    //console.log(simpleStringify(connection)); //without simple, circular references in DOM structure possible
    //console.dir(connection);

    //================== HANDLERS ==================================
    connection.on('message', function (message) {
        var data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error("Error parsing JSON: " + error);
            data = {};
        }

        switch (data.type) {
            case "login":
                console.log("User " + connection.name + " logged in as ", data.name);
                if (users[data.name]) { //somebody already logged in with that name?
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    users[data.name] = connection;
                    connection.name = data.name;
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });
                }
                break;
            case "offer": //SDP offer
                console.log("User " + connection.name + " sending offer to ", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            case "answer": //SDP answer
                console.log("User " + connection.name + " sending answer to ", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate from " + connection.name + " to ", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;
            case "leave":
                console.log("Disconnecting user " + connection.name + " from ", data.name);
                var conn = users[data.name];
                conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized command: " + data.type
                });
                break;
        }
    });

    connection.on('close', function () {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                console.log("Disconnecting user " + connection.name + " from ", connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });
    // connection.send('Response From WebSocket Server'); //user with established connection receives the message and wscat displays it on his console
});

function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}

function simpleStringify(object){
    var simpleObject = {};
    for (var prop in object ){
        if (!object.hasOwnProperty(prop)){
            continue;
        }
        if (typeof(object[prop]) == 'object'){
            continue;
        }
        if (typeof(object[prop]) == 'function'){
            continue;
        }
        simpleObject[prop] = object[prop];
    }
    return JSON.stringify(simpleObject, null, 4); // returns cleaned up JSON
}