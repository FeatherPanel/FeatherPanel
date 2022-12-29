const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const colors = require('colors');
const { encrypt, decrypt } = require('./utils/crypto');
const https = require('https');
const { initSocket } = require('./socket');
const { exec } = require('child_process');

let app = express();
let conf = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
let connection = mysql.createConnection(conf.mysql);

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
    secret: conf.cookie_secret,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.get('/', function(req, res) {
    if (typeof req.session.user === 'undefined') {
        return res.redirect('login');
    }

    connection.query('SELECT * FROM servers RIGHT JOIN permissions_user ON servers.id = permissions_user.server_id WHERE user_id = ?', [req.session.user.id], function(err, servers) {
        if (err) {
            return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
        }

        let token = encrypt(JSON.stringify({ user: req.session.user }), 'aes-256-ctr', conf.cookie_secret);

        res.render('selection', { user: req.session.user, servers, serversJSON: btoa(JSON.stringify(servers)), token });
    });
});

app.get('/server/:id', function(req, res) {
    if (typeof req.session.user === 'undefined') {
        return res.redirect('/login');
    }

    connection.query('SELECT * FROM servers WHERE id = ?', [req.params.id], function(err, server) {
        if (err) {
            return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
        }
        if (server.length === 0) {
            return res.render('error', { error: { code: '404', title: 'Serveur introuvable', message: 'Ce serveur n\'existe pas.' } });
        }
        server = server[0];
        connection.query('SELECT * FROM permissions_user WHERE server_id = ? AND user_id = ?', [server.id, req.session.user.id], function(err, server_user) {
            if (err) {
                return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            if (server_user.length === 0) {
                return res.render('error', { error: { code: '403', title: 'Accès refusé', message: 'Vous n\'avez pas accès à ce serveur.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            server_user = server_user[0];
            res.render('dashboard', { user: req.session.user, server, server_user, serverJSON: btoa(JSON.stringify(server)) });
        });
    });
});

app.get('/server/:id/terminal', function(req, res) {
    if (typeof req.session.user === 'undefined') {
        return res.redirect('/login');
    }

    connection.query('SELECT * FROM servers WHERE id = ?', [req.params.id], function(err, server) {
        if (err) {
            return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
        }
        if (server.length === 0) {
            return res.render('error', { error: { code: '404', title: 'Serveur introuvable', message: 'Ce serveur n\'existe pas.' } });
        }
        server = server[0];
        connection.query('SELECT * FROM permissions_user WHERE server_id = ? AND user_id = ?', [server.id, req.session.user.id], function(err, server_user) {
            if (err) {
                return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            if (server_user.length === 0) {
                return res.render('error', { error: { code: '403', title: 'Accès refusé', message: 'Vous n\'avez pas accès à ce serveur.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            server_user = server_user[0];

            let token = encrypt(JSON.stringify({ server, user: req.session.user, server_user }), 'aes-256-ctr', conf.cookie_secret);

            res.render('terminal', { conf, user: req.session.user, server, server_user, token, serverJSON: btoa(JSON.stringify(server)), userJSON: btoa(JSON.stringify(req.session.user)), confJSON: btoa(JSON.stringify(conf)) });
        });
    });
});

app.post('/server/:id/start', function(req, res) {
    if (typeof req.body.token === 'undefined') {
        return res.send({ error: { code: '403', title: 'Accès refusé', message: 'Vous devez être connecté pour effectuer cette action.' } });
    }

    let data;
    try {
        data = JSON.parse(decrypt(req.body.token, 'aes-256-ctr', conf.cookie_secret));
    } catch {
        return res.send({ error: { code: '403', title: 'Accès refusé', message: 'Vous devez être connecté pour effectuer cette action.' } });
    }

    connection.query('SELECT * FROM servers WHERE id = ?', [req.params.id], function(err, server) {
        if (err) {
            return res.send({ error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
        }
        if (server.length === 0) {
            return res.send({ error: { code: '404', title: 'Serveur introuvable', message: 'Ce serveur n\'existe pas.' } });
        }
        server = server[0];

        connection.query('SELECT *\
        FROM permissions_user\
        RIGHT JOIN permissions\
        ON permissions.id = permissions_user.permissions_id\
        WHERE permissions_user.server_id = 344834\
        AND permissions_user.user_id = 1\
        ', [server.id, data.user.id], function(err, server_user) {
            if (err) {
                return res.send({ error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            if (server_user.length === 0) {
                return res.send({ error: { code: '403', title: 'Accès refusé', message: 'Vous n\'avez pas accès à ce serveur.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
            server_user = server_user[0];

            if (server_user.power === 0) {
                return res.send({ error: { code: '403', title: 'Accès refusé', message: 'Vous n\'avez pas la permission de démarrer ce serveur.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }

            connection.query('UPDATE servers SET status = ? WHERE id = ?', ['starting', server.id], function(err) {
                if (err) {
                    return res.send({ error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
                }

                exec(`"${conf.docker.executablePath}" start ${server.container}`, function(err) {
                    if (err) {
                        connection.query('UPDATE servers SET status = ? WHERE id = ?', ['stopped', server.id]);
                        return res.send({ error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors du démarrage du serveur. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
                    }

                    connection.query('UPDATE servers SET status = ? WHERE id = ?', ['running', server.id], function(err) {
                        if (err) {
                            return res.send({ error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
                        }

                        res.send({ success: true });
                    });
                });
            });
        });
    });
});

app.get('/login', function(req, res) {
    if (typeof req.cookies.user !== 'undefined') {
        try {
            req.session.user = JSON.parse(decrypt(req.cookies.user, 'aes-256-ctr', conf.cookie_secret));
        } catch {
            res.clearCookie('user');
        }
        return res.redirect('/');
    }
    res.render('login', { conf });
});

app.post('/login', async function(req, res) {
    if (typeof req.body !== 'undefined' && typeof req.body.username !== 'undefined' && typeof req.body.password !== 'undefined') {
        let username = req.body.username;
        let password = crypto.createHash('md5').update(req.body.password).digest('hex');
        let stayConnected = req.body.stayConnected;

        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (error) {
                console.error(error);
                return res.render('error', { error: { code: '500', title: 'Erreur interne du serveur', message: 'Échec lors de la connexion à la base de données. Veuillez réessayer.', details: `Si le problème persiste, envoyez un mail à ${conf.contact}.` } });
            }
			if (results.length > 0) {
				req.session.user = results[0];
                req.session.user.avatar = 'https://www.gravatar.com/avatar/' + crypto.createHash('md5').update(req.session.user.email).digest('hex');
                if (stayConnected === 'on') {
                    res.cookie('user', encrypt(JSON.stringify(req.session.user), 'aes-256-ctr', conf.cookie_secret), { maxAge: 1000 * 365 * 60 * 60 * 24 });
                }
				return res.redirect('/');
			} else {
				connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [username, password], function(error, results, fields) {
                    if (error) console.error(error);
                    if (results.length > 0) {
                        req.session.user = results[0];
                        req.session.user.avatar = 'https://www.gravatar.com/avatar/' + crypto.createHash('md5').update(req.session.user.email).digest('hex');
                        if (stayConnected === 'on') {
                            res.cookie('user', encrypt(JSON.stringify(req.session.user), 'aes-256-ctr', conf.cookie_secret), { maxAge: 1000 * 365 * 60 * 60 * 24 });
                        }
                        return res.redirect('/');
                    } else {
                        return res.redirect('/login');
                    }
                });
			}
		});
    } else {
        res.redirect('login');
    }
});

app.get('/logout', function(req, res) {
    req.session.destroy();
    res.clearCookie('user');
    res.redirect('login');
});

app.get('*', function(req, res) {
    res.render('error', { error: { code: '404', title: 'Page Non Trouvée', message: 'Page Non Trouvée' } });
});

try {
    var privateKey = fs.readFileSync(path.join(__dirname, 'cert', 'key.txt'));
    var certificate = fs.readFileSync(path.join(__dirname, 'cert', 'cert.txt'));
    https.createServer({
        key: privateKey,
        cert: certificate
    }, app).listen(conf.port);
    console.log(colors.green(`${conf.title} a été démarré sur le port ${conf.port} en https !`));
} catch (e) {
    app.listen(conf.port);
    console.log(colors.green(`${conf.title} a été démarré sur le port ${conf.port} !`));
}

initSocket();
