var fs = require('fs');
var express = require('express');
var app = express();

app.route('/bleat/:id')
    .get(function(request, response) {
        var id = request.params.id;
        var path = __dirname + '\\dataset-medium\\bleats\\' + id;
        fs.readFile(path, function(err, data) {
            if (err) {
                response.status(404).json('No bleat with that id');
                return;
            }
            response.send(data.toString());
        });
    });

app.listen(8080);
