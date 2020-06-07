const http = require('http');
const fs = require('fs');
const url = require('url');

var tabIP = new Array();
var tabData;
var reqBody = [];

setInterval(stackTraceIP, 3600000); // 3600000 ms = 1 hour

http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'method, file');

    var indexMethod = req.rawHeaders.indexOf("method");
    var indexFile = req.rawHeaders.indexOf("file");
    var paramRequest = url.parse(req.url, true).query;

    if (indexMethod === -1) {
        console.log("Error, No Method found");
        res.write("Error, No Method found");
        res.end();
        return;
    }
    if (indexFile === -1) {
        console.log("Error, No File name found");
        res.write("Error, No File name found");
        res.end();
        return;
    }

    processRequest(req, res, indexMethod, indexFile, paramRequest).then(responseBody => {
        stackTraceReq(req.rawHeaders[indexMethod + 1], req.rawHeaders[indexFile + 1], req.connection.remoteAddress);
        res.write(responseBody ? responseBody : "");
        res.end();
    });
}).listen(4242);

async function stackTraceIP() {
    loadFile("Ip.txt", false).then(ipArr => {
        writeToFile("Ip.txt", ipArr.concat(tabIP)).then(() => {
            tabIP = new Array();
            console.log("Ip file updated");
        });
    });
}

function processRequest(req, res, indexMethod, indexFile, paramRequest) {
    return new Promise((resolve, reject) => {
        let methodName = req.rawHeaders[indexMethod + 1];
        let fileName = req.rawHeaders[indexFile + 1];
        if (req.method === 'POST') { // Method POST
            switch (methodName) {
                case 'save':
                    req.on('data', (chunk) => {
                        reqBody.push(chunk);
                    }).on('end', () => {
                        addToGoboueArray(fileName, Buffer.concat(reqBody).toString()).then(updatedArr => {
                            reqBody = [];
                            resolve(responseJson(updatedArr, methodName, fileName, null));
                        })
                    });
                case 'mute':
                    req.on('data', (chunk) => {
                        reqBody.push(chunk);
                    }).on('end', () => {
                        addToMuteList(fileName, Buffer.concat(reqBody).toString()).then(updatedArr => {
                            reqBody = [];
                            resolve(responseJson(updatedArr, methodName, fileName, null));
                        })
                    });
                case 'jail':
                    req.on('data', (chunk) => {
                        reqBody.push(chunk);
                    }).on('end', () => {
                        addToJailList(fileName, Buffer.concat(reqBody).toString()).then(updatedArr => {
                            reqBody = [];
                            resolve(responseJson(updatedArr, methodName, fileName, null));
                        })
                    });
                default:
                    resolve();
            }
        } else { // Method GET
            if (Object.keys(paramRequest).indexOf('name') !== -1) {
                // only goboue.json for now
                loadFile(req.rawHeaders[indexFile + 1], true).then(() => {
                    resolve(responseJson(tabData, methodName, fileName, paramRequest.name));
                }).catch(err => {
                    console.log(err);
                    res.write("An error has occured");
                    res.end();
                });
            } else if (Object.keys(paramRequest).indexOf('idUser') !== -1) {
                loadFile(req.rawHeaders[indexFile + 1], true).then(() => {
                    resolve(responseJson(tabData, methodName, fileName, paramRequest.idUser));
                }).catch(err => {
                    console.log(err);
                    res.write("An error has occured in unMute function");
                    res.end();
                });
            } else {
                loadFile(req.rawHeaders[indexFile + 1], true).then(() => {
                    resolve(responseJson(tabData, methodName, fileName, null));
                }).catch(err => {
                    res.write(err);
                    res.end();
                });
            }
        }
    });

}

async function stackTraceReq(method, file, ip) {
    var ipParsed = ip.split(':');
    var dateNow = new Date();
    var stg;
    stg = "Request " + method + " on the file : " + file;
    stg += " / " + dateNow.toLocaleDateString() + " - " + dateNow.toLocaleTimeString();
    console.log(stg + " / " + ipParsed[ipParsed.length - 1]);
    if (ipParsed[ipParsed.length - 1] != "1")
        tabIP.push(ipParsed[ipParsed.length - 1] + '\n');
}

function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function loadFile(name, isJSON) {
    return new Promise(function (res, rej) {
        fs.readFile("data/" + name, 'utf8', (err, stg) => {
            if (err) {
                rej(name + " file read failed:" + err.message);
            } else {
                try {
                    if (isJSON) {
                        tabData = JSON.parse(stg);
                        res(tabData);
                    } else {
                        res(stg.split(','));
                    }
                } catch (err) {
                    rej('Error parsing ' + name + ' JSON string : ' + err.message + "\nBe sure its a JSON file");
                }
            }
        });
    })
}

function addToGoboueArray(fileName, element) {
    return new Promise(resolve => {
        loadFile(fileName, true).then(data => {
            data.scoreChannels.push(JSON.parse(element));
            resolve(data);
        });
    })
}

function addToMuteList(fileName, element) {
    return new Promise(resolve => {
        loadFile(fileName, true).then(data => {
            data.muteList.push(JSON.parse(element));
            resolve(data);
        });
    })
}

function addToJailList(fileName, element) {
    return new Promise(resolve => {
        loadFile(fileName, true).then(data => {
            data.jailList.push(JSON.parse(element));
            resolve(data);
        });
    })
}

function writeToFile(name, data) {
    return new Promise(function (res, rej) {
        fs.writeFile("data/" + name, data, (err) => {
            if (err) {
                rej(name + " file writing failed:" + err.message);
            } else
                res();
        });
    })
}

function responseJson(tablal, method, name, params) {
    if (method === 'save') {
        return save(tablal, name);
    }

    switch (name) {
        case 'muteList.json':
            switch (method) {
                case 'all':
                    return JSON.stringify(tablal);
                case 'mute':
                    return save(tablal, name);
                case 'unMute':
                    tablal.muteList = Array.from(tablal.muteList).filter(member => member.id !== params);
                    return save(tablal, name);
                default:
                    return "An error has been found in the method";
            }
            break;
        case 'jailList.json':
            switch (method) {
                case 'all':
                    return JSON.stringify(tablal);
                case 'jail':
                    return save(tablal, name);
                case 'unJail':
                    tablal.jailList = Array.from(tablal.jailList).filter(member => member.id !== params);
                    return save(tablal, name);
                default:
                    return "An error has been found in the method";
            }
            break;
        case 'jokes.json':
            switch (method) {
                case 'all':
                    return JSON.stringify(tablal);
                case 'random':
                    return JSON.stringify(tablal.jokes[getRandom(0, tablal.jokes.length)]);
                default:
                    return "An error has been found in the method";
            }
            break;
        case 'birthday.json':
            switch (method) {
                case 'all':
                    return JSON.stringify(tablal);
                default:
                    return "An error has been found in the method";
            }
            break;
        case 'score.json':
            switch (method) {
                case 'all':
                    return JSON.stringify(tablal);

                default:
                    return "An error has been found in the method";
            }
            break;
        case 'goboue.json':
            switch (method) {
                case 'nameIsUnique':
                    for (let indexChannel in tablal.scoreChannels) {
                        if (tablal.scoreChannels[indexChannel].name.toLowerCase() === params.toLowerCase()) {
                            return JSON.stringify(false);
                        }
                    }
                    return JSON.stringify(true);
                case 'findByNom':
                    for (let indexChannel in tablal.scoreChannels) {
                        if (tablal.scoreChannels[indexChannel].name.toLowerCase() === params.toLowerCase()) {
                            return JSON.stringify(tablal.scoreChannels[indexChannel]);
                        }
                    }
                    return null;
                case 'removeByNom':
                    let updatedArr = [];
                    for (let indexChannel in tablal.scoreChannels) {
                        if (tablal.scoreChannels[indexChannel].name.toLowerCase() !== params.toLowerCase()) {
                            updatedArr.push(tablal.scoreChannels[indexChannel]);
                        }
                    }
                    tablal.scoreChannels = updatedArr;
                    return save(tablal, name);
                default:
                    return "An error has been found in the file name";
            }
            break;
    }
}

function save(tablal, name) {
    writeToFile(name, JSON.stringify(tablal, null, 2)).then(() => {
        console.log("Written success on " + name);
        return JSON.stringify(true);
    }).catch(err => {
        console.log("Err Write" + err);
        return JSON.stringify(false);;
    });
}