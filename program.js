var http = require('http');
var fs = require('fs');

var tabIP = new Array();
var tabData;
var reqBody = "";

setInterval(stackTraceIP, 3600000);// 3600000 ms = 1 hour

http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'method, file');
    var indexM = req.rawHeaders.indexOf("method");
    var indexF = req.rawHeaders.indexOf("file");
    if(indexM != -1){
        if(indexF != -1) {
            if (req.method === 'POST' && req.rawHeaders[indexM + 1] == "save") {
                req.on('data', chunk => {
                    reqBody = chunk.toString(); // convert Buffer to string
                });
                req.on('end', () => {
                    res.write(responseJson(JSON.parse(reqBody),req.rawHeaders[indexM + 1],req.rawHeaders[indexF + 1]));
                    stackTraceReq(req.rawHeaders[indexM + 1], req.rawHeaders[indexF + 1], req.connection.remoteAddress);
                    res.end();
                });
            } else {
                loadFile(req.rawHeaders[indexF + 1], true).then(() => {
                    res.write(responseJson(tabData,req.rawHeaders[indexM + 1],req.rawHeaders[indexF + 1]));
                    stackTraceReq(req.rawHeaders[indexM + 1], req.rawHeaders[indexF + 1], req.connection.remoteAddress);
                    res.end();
                }).catch(err => {
                    res.write(err);
                    res.end();
                })
            }
        } else {
            res.write("Error, No File name found");
            res.end();
        }
    } else {
        res.write("Error, No Method found");
        res.end();
    }
}).listen(4242); 

async function stackTraceIP() {
    loadFile("Ip.txt", false).then(resolve => {
        writeToFile("Ip.txt", resolve.concat(tabIP)).then(() => {
            tabIP = new Array();
            console.log("Ip file updated");
        });
    });
}

async function stackTraceReq(method,file,ip) {
    var ipParsed = ip.split(':');
    var dateNow = new Date();
    var stg;
    stg = "Request " + method + " on the file : " + file;
    stg += " / " + dateNow.toLocaleDateString() + " - " + dateNow.toLocaleTimeString();
    console.log(stg + " / " + ipParsed[ipParsed.length - 1]);
    if(ipParsed[ipParsed.length - 1] != "1")
        tabIP.push(ipParsed[ipParsed.length - 1] + '\n');//if i need to automatise the firewall \n will be removed
}

function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min +1)) + min;
}

function loadFile(name, isJSON) {
    return new Promise(function(res,rej) {
        fs.readFile("data/" + name, 'utf8', (err, stg) => {
            if (err) {
                rej(name + " file read failed:" + err.message);
            } else {
                try {
                    if(isJSON) {
                        tabData = JSON.parse(stg);
                        res();
                    }
                    else {
                        console.log(stg.split(',')[0]);
                        res(stg.split(','));
                    }
            } catch(err) {
                    rej('Error parsing ' + name + ' JSON string : ' + err.message + "\nBe sure its a JSON file");
                } 
            }
        });
    })
}

function writeToFile(name, tablal) {
    return new Promise(function(res,rej) {
        fs.writeFile("data/" + name, tablal, (err) => {
            if (err) {
                rej(name + " file writing failed:" + err.message);
            } else 
                res();
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
        case 'birthday.json' :
            switch(method) {
                case 'all' :
                    return JSON.stringify(tablal);
                default:
                    return "An error has been found in the method";
            }
        case 'score.json' :
            switch(method) {
                case 'all' :
                    return JSON.stringify(tablal); 
                case 'save' :
                    writeToFile("score.json", JSON.stringify(tablal, null, 2)).then(() => {
                        console.log("Written success");
                        return "Succesfully written !";
                    }).catch(err => { 
                        console.log("Err Write" + err);
                        return "Error in the writing of file !";
                    });
                default:
                    return "An error has been found in the method";
                }
        default:
            return "An error has been found in the file name";
    }
}