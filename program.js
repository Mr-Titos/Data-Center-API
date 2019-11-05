var http = require('http');
var fs = require('fs');

var tabData;

http.createServer(function (req, res) {
    var indexM = req.rawHeaders.indexOf("method");
    var indexF = req.rawHeaders.indexOf("file");
    if(indexM != -1){
        if(indexF != -1) {
            loadFile(req.rawHeaders[indexF + 1]).then(() => {
                res.write(responseJson(tabData,req.rawHeaders[indexM + 1],req.rawHeaders[indexF + 1]));
                console.log("request " + req.rawHeaders[indexM + 1] + " on the file : " + req.rawHeaders[indexF + 1]);
                res.end();
            }).catch(err => {
                res.write(err);
                res.end();
            })
        } else {
            res.write("Error, No File name found");
            res.end();
        }
    } else {
        res.write("Error, No Method found");
        res.end();
    }
}).listen(4242); 

function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min +1)) + min;
}

function loadFile(name) {
    return new Promise(function(res,rej) {
        fs.readFile("data/" + name, 'utf8', (err, jsonString) => {
            if (err) {
                rej(name + " file read failed:" + err.message);
            } else {
                try {
                    tabData = JSON.parse(jsonString)
                    res();
            } catch(err) {
                    rej('Error parsing ' + name + ' JSON string:' + err.message + "\nBe sure its a JSON file");
                } 
            }
        });
    })
}

function responseJson(tablal, method, name) {
    switch(name) {
        case 'jokes.json' :
            switch(method) {
                case 'all' :
                    return JSON.stringify(tablal);
                case 'random':
                    return JSON.stringify(tablal.jokes[getRandom(0,tablal.jokes.length)]);
                default:
                    return "An error has been found in the method";
            }
        case 'score.json' :
                switch(method) {
                    case 'all' :
                        return JSON.stringify(tablal); 
                    default:
                        return "An error has been found in the method";
                }
        default:
            return "An error has been found in the file name";
    }
}