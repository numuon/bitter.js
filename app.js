(function() {
    'use strict';
    var fs = require('fs');
    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('bitter.db');
    var bcrypt = require('bcrypt');
    var express = require('express');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser')
    var jwt = require('jsonwebtoken');
    var app = express();

    app.use(express.static('public'));
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    // token debugger
    app.route('/api/tokenDebug')
        .get(function(request, response) {
            var token = request.cookies.token;
            var decoded = jwt.verify(token, 'secret', function(err, data) {
                response.json(data);
            });
        });

    app.route('/api/authenticate')
        .post(function(request, response) {
            var user = request.body.user;
            var pass = request.body.pass;
            db.get("SELECT password FROM users WHERE username = $user;", {'$user': user}, function(err, row) {
                if (err) {
                    console.log("Error: "+err);
                    response.json(false);
                    return err;
                } else if (!row) {
                    console.log("No user "+user);
                    response.json(false);
                    return;
                }
                bcrypt.compare(pass, row.password, function(err, res) {
                    if (err) return err;
                    if (res) {
                        if (request.query.remember) {
                            jwt.sign({user: user}, 'secret', {expiresIn: "30d"}, function(token) {
                                response.cookie('token', token, {maxAge: 1000*60*60*24*30});
                                response.json(true);
                            });
                        } else {
                            jwt.sign({user: user}, 'secret', {expiresIn: "1h"}, function(token) {
                                response.cookie('token', token);
                                response.json(true);
                            });
                        }
                    } else {
                        console.log("Incorrect password");
                        response.json(false);
                    }
                });
            });
        });

    app.route('/api/current')
        .get(function(request, response) {
            jwt.verify(request.cookies.token, 'secret', function(err, data) {
                if (err) {
                    response.json(false);
                    return err;
                }
                response.json(data.user);
            });
        })

    app.route('/api/bleat/')
        .post(function(request, response) {
            var token = request.cookies.token;
            jwt.verify(token, 'secret', function(err, data) {
                if (err) {
                    response.sendStatus(401);
                    return err;
                }
                var bleat = request.query.bleat;
                // write bleat to db
            });
        });

    app.route('/api/bleat/:id')
        .get(function(request, response) {
            var id = request.params.id;
            getBleat(id, function(data) {
                response.json(data);
            });
        })
        .delete(function(request, response) {
            var id = request.params.id;
            var token = request.cookies.token;
            jwt.verify(token, 'secret', function(err, data) {
                if (err) {
                    response.sendStatus(401);
                    return err;
                }
                var user = data.user;
                // if user owns bleat, mark as deleted
                // else 401
                response.sendStatus(401);
            });
        })
        .put(function(request, response) {
            var id = request.params.id;
            var user = request.query.user;
            var token = request.query.token;
            var bleat = request.query.bleat; // object
            // if user is valid and owns bleat, update bleat
        })
        .patch(function(request, response) {
            var id = request.params.id;
            var user = request.query.user;
            var token = request.query.token;
            var bleat = request.query.bleat; // object containing changes
            // if user is valid and owns bleat, update bleat
        });

    app.route('/api/bleat/:id/replies')
        .get(function(request, response) {
            var curr_id = request.params.id;
            var path = __dirname + '\\dataset-medium\\bleats\\';
            var replies = [];
            var checked = 0;
            fs.readdir(path, function(err, list) {
                for (var i in list) {
                    getBleat(list[i], function(data) {
                        if (data.in_reply_to === curr_id) {
                            replies.push(data.id);
                            console.log(data.id);
                        }
                        checked++;
                        if (checked === list.length) {
                            response.json(replies);
                            console.log('done');
                        }
                    });
                }
            });
        });

    app.route('/api/bleat/:id/conversation')
        .get(function(request, response) {
            var id = request.params.id;
            var conversation = [];
            var getPrecursor = function getPrecursor(data) {
                if (!data.in_reply_to) {
                    response.json(conversation);
                } else {
                    conversation.push(data.in_reply_to);
                    getBleat(data.in_reply_to, getPrecursor);
                }
            }
            getBleat(id, getPrecursor);
        });

    function getBleat(id, callback) {
        db.get("SELECT * FROM bleats WHERE id = $id;", {'$id': id}, function(err, row) {
            callback(row);
        });
    }

    app.route('/api/user/:username/details')
        .all(function(request, response, next) {
            request.username = request.params.username.toLowerCase();
            next();
        })
        .get(function(request, response) {
            var username = request.username;
            var path = __dirname + '\\dataset-medium\\users\\' + username + '\\details.txt';
            fs.readFile(path, function(err, data) {
                if (err) {
                    response.status(404).json('No user with that username');
                    return;
                }
                data = data.toString();
                data = data.replace(/([^:]+): (.+)\n/g, function(a, b, c) {
                    return '"'+b+'": ' + '"'+c+'",';
                })
                data = data.slice(0, -1);
                data = '{' + data + '}';
                data = JSON.parse(data);
                if (data.listens) {
                    data.listens = data.listens.split(' ');
                }
                response.json(data);
            });
        });

    app.route('/api/user/:username/bleats')
        .all(function(request, response, next) {
            request.username = request.params.username.toLowerCase();
            next();
        })
        .get(function(request, response) {
            var username = request.username;
            var page = request.query.page;
            var per_page = 16;
            var path = __dirname + '\\dataset-medium\\users\\' + username + '\\bleats.txt';
            fs.readFile(path, function(err, data) {
                if (err) {
                    response.status(404).json('No bleats found for that username');
                    return;
                }
                data = data.toString();
                data = data.split('\n');
                data = data.filter(function(id) {
                    return id;
                });
                data.reverse();
                if (page) {
                    if (page >= 1) {
                        data = data.slice((page-1)*per_page,page*per_page);
                        if (data.length === 0) {
                            response.status(404).json('No bleats on this page');
                        } else {
                            response.json(data);
                        }
                    } else {
                        response.status(400).json('Invalid page number');
                    }
                } else {
                    response.json(data);
                }
            });
        });

    app.route('/api/user/:username/picture')
        .all(function(request, response, next) {
            request.username = request.params.username.toLowerCase();
            next();
        })
        .get(function(request, response) {
            var username = request.username;
            var path = __dirname + '\\dataset-medium\\users\\' + username + '\\profile.jpg';
            var placeholder = __dirname + '\\public\\placeholder.png';
            fs.exists(path, function(exists) {
                if (exists)
                    response.sendFile(path);
                else
                    response.sendFile(placeholder);
            });
        })
        .put(function(request, response) {
            var id = request.params.id;
            var user = request.query.user;
            var token = request.query.token;
            var bleat = request.query.pic;
            // if user is valid, update pic
        });

    app.listen(8080);
})();
