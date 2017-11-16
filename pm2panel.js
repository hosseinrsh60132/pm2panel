
//##############################################################################
//                             config panel
//##############################################################################
const PORT = 3001;
const USER = 'admin';
const PASS = 'admin';
const SESSTION_AGE = 10 * 60000; // 10 minutes

//##############################################################################
//                             inital packages
//##############################################################################

const path = require('path');
const express = require('express');
const app = express();
const exec = require("child_process").exec;
const fs = require('fs');

var session = require('express-session');

// Use the session middleware
app.use(session({secret: 'keyboard cat', cookie: {maxAge: SESSTION_AGE}}));

// add assets path
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// for parse post
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies
//
//##############################################################################
//                             rounting urls
//##############################################################################

app.get('/', function (req, res) {
    // check is login
    if (req.session.islogin) {
        // show index page
        res.sendFile(path.join(__dirname, 'www/index.html'));
    } else {
        // redirect to login page
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();
    }

});

app.get('/login', function (req, res) {

    // render login page
    res.sendFile(path.join(__dirname, 'www/login.html'));
});

app.post('/loginCheck', function (req, res) {
    // check username and password 
    if (req.body.username === USER && req.body.passwd == PASS) {
        // login process
        req.session.islogin = true;
        // redirect to panel
        res.writeHead(302, {
            'Location': '/'
        });
    } else {
        // user or password incrrect go back to login
        res.writeHead(302, {
            'Location': '/login'

        });
    }
    res.end();
});



app.get('/getProccess', function (req, res) {
    // check is user logined
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {
        // send json header
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        // get json list from the json
        exec("pm2 jlist", (error, stdout, stderr) => {
            //do whatever here
            res.write(stdout);
            res.end();
        });
    }
});
app.post('/addProccess', function (req, res) {
    // check is user logined
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {

        // get json list from the json
        if (req.body.path === undefined) {
            res.writeHead(302, {
                'Location': '/'
            });
            res.end();
            return false;
        }
        
        // check is file exists
        if (fs.existsSync(req.body.path)) {
            // add process
            exec('pm2 start "' + req.body.path + '"', (error, stdout, stderr) => {
                // save notificarion
                req.session.notication = error + '\n--------\n' + stdout + '\n--------\n' + stderr;
                res.writeHead(302, {
                    'Location': '/'
                });
                res.end();
                return true;
            });
        } else {
            
            // go back
            res.writeHead(302, {
                'Location': '/'
            });
            res.end();
            return false;
        }

    }
});

app.get('/restart', function (req, res) {
    // send json header
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {
        // check id exits 
        if (req.query.id) {
            // restart the process
            exec("pm2 restart " + req.query.id, (error, stdout, stderr) => {
                res.writeHead(302, {
                    'Location': '/'
                });
                req.session.notication = error + '\n--------\n' + stdout + '\n--------\n' + stderr;
                res.end();
            });

        }

    }
});

app.get('/delete', function (req, res) {
    // send json header
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {
        // check id exits 
        if (req.query.id) {
            // delete the process
            exec("pm2 delete " + req.query.id, (error, stdout, stderr) => {
                res.writeHead(302, {
                    'Location': '/'
                });
                req.session.notication = error + '\n--------\n' + stdout + '\n--------\n' + stderr;
                res.end();
            });

        }

    }
});

app.get('/dump', function (req, res) {
    // send json header
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {
        // save process
        exec("pm2 save", (error, stdout, stderr) => {
            res.writeHead(302, {
                'Location': '/'
            });
            req.session.notication = error + '\n--------\n' + stdout + '\n--------\n' + stderr;
            res.end();
        });


    }
});

app.get('/notification', function (req, res) {
    // send json header
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();
        return false;
    } else {
        if (!req.session.notication) {
            res.write('-');
        } else {
            var message = req.session.notication ;
            delete req.session.notication;
            res.write(message);
        }
        res.end();
    }
});



/// get folder list
app.get('/folder', function (req, res) {

    // check is login ?
    if (!req.session.islogin) {
        res.writeHead(302, {
            'Location': '/login'
        });
        res.end();

    } else {
        // check path and set default tab
        if (req.query.path === undefined) {
            var chossedPath = '/';
        } else {
            var chossedPath = req.query.path;
        }
        // send json header
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        // check choosed is exists
        if (fs.existsSync(chossedPath)) {
            // read folder
            fs.readdir(chossedPath, (err, files) => {
                
                // creat list
                var lst = [];
                chossedPath = chossedPath + '/';
                chossedPath = chossedPath.replace('//', '/');
                // set back folder in list
                var e = path.join(chossedPath, '..');
                lst.push({'name': '..', 'path': e});
                files.forEach(file => {
                    var tmp = {'name': file, 'path': chossedPath + file};
                    lst.push(tmp);
                });
                // send buffer
                res.write(JSON.stringify(lst));
                res.end();
            });

        } else {

            res.write('[]');
            res.end();

        }
    }

});



app.get('/logout', function (req, res) {

    // remover session
    delete req.session.islogin;
    // redirect to login page
    res.writeHead(302, {
        'Location': '/login'
    });
    res.end();
});



//##############################################################################
//                              finazle
//##############################################################################

app.listen(PORT, function () {
    console.log('pm2panel app listening on port ' + PORT + '!');
});