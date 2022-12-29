const colors = require('colors');
const { Confirm, Form, Input, Password, NumberPrompt } = require('enquirer');
const fs = require('fs');
const path = require('path');
const Docker  = require('dockerode');
const docker = new Docker();
const { spawn, spawnSync } = require('child_process');
const os = require('os');
const https = require('https');
const util = require('util');
const crypto = require('crypto');
const mysql = require('mysql');

const args = process.argv.slice(2);

let prefix = (isCmd()) ? '' : './';
function isCmd() {
    if (os.platform() !== 'win32') {
        return false;
    }
  
    try {
        const result = spawnSync(`ls`, {
            stdio: 'pipe',
        });
  
        return result.error !== undefined
    } catch (err) {
        return true
    }
}

let executablePath = (os.platform() === 'win32') ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
if (os.platform() === 'darwin') executablePath = '/Applications/Docker.app/Contents/MacOS/Docker';
if (fs.existsSync(path.join(__dirname, 'config.json')) && typeof JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'))).docker.executablePath !== 'undefined') {
    executablePath = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'))).docker.executablePath;
}

// check if docker is installed and running
let dockerCheck = spawnSync(`"${executablePath}" version`, { shell: true, stdio: 'pipe' });
if (dockerCheck.stdout.toString().includes('Server')) {
    console.log(colors.green('Docker est installé et fonctionne correctement.'));
} else {
    if (fs.existsSync(executablePath)) {
        console.log(colors.red('Docker n\'est pas lancé. Veuillez le lancer avant de continuer.'));
        process.exit(1);
    } else {
        console.log(colors.red('Docker n\'a pas été trouvé dans C:\\Program Files\\Docker\\Docker\\. Veuillez l\'installer avant de continuer.'));
        const confirm = new Confirm({
            name: 'confirm',
            message: 'Docker est installé dans un autre répertoire ?'
        });

        confirm.run().then(answer => {
            if (answer) {
                const form = new Form({
                    name: 'docker',
                    message: 'Veuillez entrer le chemin d\'accès à docker.exe',
                    choices: [
                        {
                            name: 'path',
                            message: 'Chemin d\'accès',
                            initial: 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'
                        }
                    ]
                });

                form.run().then(answer => {
                    if (fs.existsSync(answer.path)) {
                        console.log(colors.green('Docker est installé et fonctionne correctement.'));
                        fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({
                            docker: {
                                executablePath: answer.path
                            }
                        }));

                        process.exit(1);
                    } else {
                        console.log(colors.red('Docker n\'est pas installé ou n\'est pas lancé. Veuillez l\'installer et le lancer avant de continuer.'));
                    }
                }).catch(console.error);
            } else {
                console.log(colors.red('Docker n\'est pas installé ou n\'est pas lancé. Veuillez l\'installer et le lancer avant de continuer.'));
            }
        }).catch(console.error);

        process.exit(1);
    }
}

(async () => {
    // INIT
    if (!fs.existsSync(path.join(__dirname, 'config.json'))) {
        if (args[0] === 'init') {
            const titleEntry = await new Input({
                name: 'title',
                message: 'Titre du panel',
                initial: 'Feather'
            }).run();

            const contactEntry = await new Input({
                name: 'contact',
                message: 'Adresse de contact',
                initial: 'contact@example.com',
                validate: (value) => {
                    if (!value.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/) || value.length < 1) {
                        return 'Veuillez entrer une adresse email valide.';
                    }
                    return true;
                }
            }).run();

            const portEntry = await new NumberPrompt({
                name: 'port',
                message: 'Port du panel (80 pour http, 443 pour https)',
                initial: 80,
                validate: (value) => {
                    if (value < 1 || value > 65535) {
                        return 'Veuillez entrer un port valide.';
                    }
                    return true;
                }
            }).run();

            const mysqlEntries = await new Form({
                  name: 'mysql',
                  message: 'Information sur la base de données mysql:',
                  choices: [
                    { name: 'host', message: 'Host', initial: 'localhost' },
                    { name: 'user', message: 'Utilisateur', initial: 'root' },
                    { name: 'password', message: 'Mot de passe', initial: '' },
                    { name: 'database', message: 'Nom de la base de données', initial: 'feather' },
                    { name: 'port', message: 'Port', initial: '3306' }
                  ]
            }).run();

            let dockerExecutablePath = (os.platform() === 'win32') ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
            if (os.platform() === 'darwin') executablePath = '/Applications/Docker.app/Contents/MacOS/Docker';

            if (fs.existsSync(path.join(__dirname, 'config.json'))) {
                if (fs.existsSync(path.join(__dirname, 'config.json')) && typeof JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'))).docker.executablePath !== 'undefined') {
                    dockerExecutablePath = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'))).docker.executablePath;
                }
            }

            let connection = mysql.createConnection(mysqlEntries);
            connection.connect(function(err) {
                if (err) {
                    console.log(colors.red('Impossible de se connecter à la base de données. Veuillez vérifier vos informations.'));
                    process.exit(1);
                }

                let config = {
                    title: titleEntry.toString(),
                    contact: contactEntry.toString(),
                    cookie_secret: genCookie(),
                    port: portEntry,
                    commands: {
                        help: {
                            command: "help",
                            description: "Shows this help message",
                            usage: "help",
                            permission: "default"
                        },
                        version: {
                            command: "version",
                            description: "Shows the version of the panel",
                            usage: "version",
                            permission: "default"
                        },
                        cls: {
                            command: "cls",
                            description: "Clears the console",
                            usage: "cls",
                            permission: "default"
                        },
                        whoami: {
                            command: "whoami",
                            description: "Shows your username",
                            usage: "whoami",
                            permission: "default"
                        },
                        start: {
                            command: "start",
                            description: "Starts the server",
                            usage: "start",
                            permission: "admin"
                        },
                        stop: {
                            command: "stop",
                            description: "Stops the server",
                            usage: "stop",
                            permission: "admin"
                        },
                        restart: {
                            command: "restart",
                            description: "Restarts the server",
                            usage: "restart",
                            permission: "admin"
                        },
                        status: {
                            command: "status",
                            description: "Shows the server status",
                            usage: "status",
                            permission: "default"
                        }
                    },
                    mysql: mysqlEntries,
                    docker: {
                        executablePath: executablePath,
                    },
                    version: "1.0.0"
                }
    
                fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 4));
                console.log(colors.green('Le fichier de configuration a été créé avec succès !'));

                connection.query("DROP TABLE IF EXISTS `permissions`", function (err) {
                    if (err) {
                        console.error(err);
                        fs.unlinkSync(path.join(__dirname, 'config.json'));
                        process.exit(1);
                    }

                    let sql = "CREATE TABLE IF NOT EXISTS `permissions` (";
                    sql += "`default` tinyint(1) NOT NULL DEFAULT '1',";
                    sql += "`power` tinyint(1) NOT NULL DEFAULT '0'";
                    sql += ") ENGINE=MyISAM DEFAULT CHARSET=latin1";

                    connection.query(sql, function (err) {
                        if (err) {
                            console.error(err);
                            fs.unlinkSync(path.join(__dirname, 'config.json'));
                            process.exit(1);
                        }

                        connection.query('DROP TABLE IF EXISTS `servers`', function (err) {
                            if (err) {
                                console.error(err);
                                fs.unlinkSync(path.join(__dirname, 'config.json'));
                                process.exit(1);
                            }

                            let sql = "CREATE TABLE IF NOT EXISTS `servers` (";
                            sql += "`id` varchar(6) NOT NULL,";
                            sql += "`name` varchar(255) NOT NULL,";
                            sql += "`host` varchar(255) NOT NULL,";
                            sql += "`port` int(5) NOT NULL,";
                            sql += "`container` varchar(255) NOT NULL,";
                            sql += "`ram` varchar(255) NOT NULL DEFAULT '0B / 0B',";
                            sql += "`ram_perc` varchar(255) NOT NULL DEFAULT '0%',";
                            sql += "`disk` int(11) NOT NULL DEFAULT '0',";
                            sql += "`disk_max` int(11) NOT NULL DEFAULT '0',";
                            sql += "`cpu` varchar(255) NOT NULL DEFAULT '0%',";
                            sql += "`status` varchar(255) NOT NULL DEFAULT 'off',";
                            sql += "`sftp_username` varchar(255) NOT NULL,";
                            sql += "`sftp_password` varchar(255) NOT NULL";
                            sql += ") ENGINE=MyISAM DEFAULT CHARSET=latin1";

                            connection.query(sql, function (err) {
                                if (err) {
                                    console.error(err);
                                    fs.unlinkSync(path.join(__dirname, 'config.json'));
                                    process.exit(1);
                                }

                                connection.query('DROP TABLE IF EXISTS `servers_users`', function (err) {
                                    if (err) {
                                        console.error(err);
                                        fs.unlinkSync(path.join(__dirname, 'config.json'));
                                        process.exit(1);
                                    }

                                    let sql = "CREATE TABLE IF NOT EXISTS `servers_users` (";
                                    sql += "`server_id` varchar(6) NOT NULL,";
                                    sql += "`user_id` int(11) NOT NULL,";
                                    sql += "`permissions_id` int(11) NOT NULL,";
                                    sql += "`user_status` varchar(255) NOT NULL DEFAULT 'user'";
                                    sql += ") ENGINE=MyISAM DEFAULT CHARSET=latin1";

                                    connection.query(sql, function (err) {
                                        if (err) {
                                            console.error(err);
                                            fs.unlinkSync(path.join(__dirname, 'config.json'));
                                            process.exit(1);
                                        }

                                        connection.query('DROP TABLE IF EXISTS `users`', function (err) {
                                            if (err) {
                                                console.error(err);
                                                fs.unlinkSync(path.join(__dirname, 'config.json'));
                                                process.exit(1);
                                            }

                                            let sql = "CREATE TABLE IF NOT EXISTS `users` (";
                                            sql += "`id` int(11) NOT NULL AUTO_INCREMENT,";
                                            sql += "`username` varchar(255) NOT NULL,";
                                            sql += "`email` varchar(255) NOT NULL,";
                                            sql += "`password` varchar(255) NOT NULL,";
                                            sql += "PRIMARY KEY (`id`)";
                                            sql += ") ENGINE=MyISAM DEFAULT CHARSET=latin1";

                                            connection.query(sql, function (err) {
                                                if (err) {
                                                    console.error(err);
                                                    fs.unlinkSync(path.join(__dirname, 'config.json'));
                                                    process.exit(1);
                                                }

                                                connection.query('DROP TABLE IF EXISTS `users_permissions`', async function (err) {
                                                    if (err) {
                                                        console.error(err);
                                                        fs.unlinkSync(path.join(__dirname, 'config.json'));
                                                        process.exit(1);
                                                    }

                                                    let sql = "CREATE TABLE IF NOT EXISTS `users_permissions` (";
                                                    sql += "`user_id` int(11) NOT NULL,";
                                                    sql += "`permissions_id` int(11) NOT NULL";
                                                    sql += ") ENGINE=MyISAM DEFAULT CHARSET=latin1";

                                                    console.log(colors.green('La base de données a été créée avec succès !'));
    
                                                    const confirm = await new Confirm({
                                                        name: 'confirm',
                                                        message: 'Voulez-vous créer un compte administrateur ?'
                                                    }).run();
                                    
                                                    if (confirm) {
                                                        const username = await new Input({
                                                            name: 'username',
                                                            message: 'Entrez le nom d\'utilisateur de l\'administrateur'
                                                        }).run();
                                    
                                                        const email = await new Input({
                                                            name: 'email',
                                                            message: 'Entrez l\'adresse email de l\'administrateur'
                                                        }).run();
                                    
                                                        const password = await new Password({
                                                            name: 'password',
                                                            message: 'Entrez le mot de passe de l\'administrateur'
                                                        }).run();
                                    
                                                        let sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
                                                        connection.query(sql, [username, email, crypto.createHash('md5').update(password).digest('hex')], function (err, result) {
                                                            if (err) throw err;
                                                            console.log(colors.green('Le compte administrateur a été créé avec succès !'));
                                    
                                                            console.log(colors.green('Feather a été installé avec succès !'));
                                                            console.log(colors.yellow('Pour démarrer Feather, exécutez la commande suivante:'));
                                                            console.log(colors.yellow(`\t${colors.blue(prefix+'feather')} start`));
                                                            process.exit(0);
                                                        });
                                                    } else {
                                                        console.log(colors.green('Feather a été installé avec succès !'));
                                                        console.log(colors.yellow('Pour démarrer Feather, exécutez la commande suivante:'));
                                                        console.log(colors.yellow(`\t${colors.blue(prefix+'feather')} start`));
                                                        process.exit(0);
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            console.log(colors.bgBlue('\t\t\t== Feather =='));
            console.log(colors.yellow('Bienvenue sur Feather, le panel de gestion de serveurs Minecraft !'));
            console.log(colors.yellow('Pour commencer, veuillez exécuter la commande suivante:'));
            console.log(colors.yellow(`\t${colors.blue(prefix+'feather')} ${colors.cyan('init')}`));
            process.exit(0);
        }
    } else {
        const conf = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        let connection = mysql.createConnection(conf.mysql);

        if (args[0] === 'start') {
            connection.connect(function (err) {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                
                console.log(colors.green('Connexion à la base de données réussie !'));
                console.log(colors.green('Démarrage de Feather...'));

                // start node index.js in current terminal
                const child = spawn('node', ['index.js'], {
                    stdio: 'inherit'
                });

                child.on('close', function (code) {
                    if (code !== 0) {
                        console.log(colors.red('Feather a été arrêté avec une erreur !'));
                        process.exit(1);
                    }

                    console.log(colors.green('Feather a été arrêté avec succès !'));
                    process.exit(0);
                });

                child.on('error', function (err) {
                    console.error(err);
                    process.exit(1);
                });

                process.on('SIGINT', function () {
                    child.kill('SIGINT');

                    console.log(colors.green('Feather a été arrêté avec succès !'));
                    process.exit(0);
                });
            });
        } else if (args[0] === 'create') {
            if (args[1] === 'server') {
                let port = await genPort(connection);
                let id = await genServerId(connection);
                let name = 'Serveur sans nom';
                let host = await getIp();
                let owner = '';
                let minecraft_version = 'latest';
                // 1 MB = 1000000 bytes
                let max_ram = 2 * 1000 * 1000000; // 2GB
                let max_disk = 10 * 1000 * 1000000 + 6 * 1000 * 1000000; // 10GB + 6GB (server files) 
                let cpu = 1;

                7 * 1000000 // 7MB

                args.forEach(async (arg, index) => {
                    if (arg === '--name') {
                        name = args[index + 1];
                    } else if (arg === '--port') {
                        port = await genPort(connection, args[index + 1]);
                    } else if (arg === '--owner') {
                        owner = args[index + 1];
                    } else if (arg === '--version') {
                        minecraft_version = args[index + 1];
                    } else if (arg === '--ram') {
                        if (parseFloat(args[index + 1]) > 0) {
                            if (args[index + 1].toLowerCase().includes('gb')) {
                                max_ram = parseFloat(args[index + 1]) * 10 * 1000000;
                            } else if (args[index + 1].toLowerCase().includes('mb')) {
                                max_ram = parseFloat(args[index + 1]) * 1000000;
                            } else {
                                console.log(colors.red('Veuillez spécifier une unité de mémoire (GB ou MB).'));
                                console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')} ${colors.blue('--ram')} ${colors.cyan('"2GB"')}`));
                                process.exit(0);
                            }
                        } else {
                            console.log(colors.red('Veuillez spécifier une quantité de mémoire valide.'));
                            console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')} ${colors.blue('--ram')} ${colors.cyan('"2GB"')}`));
                            process.exit(0);
                        }
                    } else if (arg === '--disk') {
                        if (parseFloat(args[index + 1]) > 0) {
                            if (args[index + 1].toLowerCase().includes('gb')) {
                                max_disk = parseFloat(args[index + 1]) * 10 * 1000000;
                                console.log(parseFloat(args[index + 1]));
                            } else if (args[index + 1].toLowerCase().includes('mb')) {
                                max_disk = parseFloat(args[index + 1]) * 1000000;
                            } else {
                                console.log(colors.red('Veuillez spécifier une unité de mémoire (GB ou MB).'));
                                console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')} ${colors.blue('--disk')} ${colors.cyan('"10GB"')}`));
                                process.exit(0);
                            }
                        } else {
                            console.log(colors.red('Veuillez spécifier une quantité de mémoire valide.'));
                            console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')} ${colors.blue('--disk')} ${colors.cyan('"10GB"')}`));
                            process.exit(0);
                        }
                        max_disk += 6 * 10 * 1000000; // 6GB (server files)
                    } else if (arg === '--cpu') {
                        if (parseFloat(args[index + 1]) <= 0) {
                            console.log(colors.red('Veuillez spécifier une quantité de CPU valide.'));
                            console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')} ${colors.blue('--cpu')} ${colors.cyan('"1"')}`));
                            process.exit(0);
                        }

                        cpu = parseFloat(args[index + 1]);
                    }
                });
        
                if (owner.length < 1) {
                    console.log(colors.red('Veuillez spécifier un propriétaire.'));
                    console.log((`Exemple: ${colors.yellow(prefix+'feather')} add server ${colors.blue('--owner')} ${colors.cyan('"Pseudo"')}`));
                    process.exit(0);
                }
        
                connection.query('SELECT * FROM users WHERE id = ? OR username = ? OR email = ?', [owner, owner, owner], function(err, user) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    } else if (user.length === 0) {
                        console.log(colors.red('Cet utilisateur n\'existe pas.'));
                        process.exit(0);
                    }
                    user = user[0];

                    let sftp_user = user.username + '_' + id;
                    let sftp_password = crypto.randomBytes(16).toString('hex');

                    // disk size + 5638500

                    docker.createContainer({
                        Image: 'featherpanel/minecraft',
                        name: 'minecraft_' + id,
                        Env: [
                            'SFTP_USER=' + sftp_user,
                            'SFTP_PASSWORD=' + sftp_password,
                            'MINECRAFT_VERSION=' + minecraft_version,
                        ],
                        HostConfig: {
                            Memory: max_ram,
                            MemorySwap: max_ram,
                            MemoryReservation: max_ram,
                            BlkioWeight: 1000,
                            BlkioWeightDevice: [
                                {
                                    Path: '/dev/sda',
                                    Weight: 1000
                                }
                            ],
                            BlkioDeviceReadBps: [
                                {
                                    Path: '/dev/sda',
                                    Rate: max_disk
                                }
                            ],
                            BlkioDeviceWriteBps: [
                                {
                                    Path: '/dev/sda',
                                    Rate: max_disk
                                }
                            ],
                            // CpuShares: cpu,
                            PortBindings: {
                                '25565/tcp': [
                                    {
                                        HostPort: port.toString()
                                    }
                                ],
                                '22/tcp': [
                                    {
                                        HostPort: (port + 1).toString()
                                    }
                                ]
                            }
                        }       
                    }, function (err, container) {
                        if (err) {
                            console.error(err);
                            if (err.code == 'ENOENT') {
                                console.error(colors.red('Docker n\'est pas installé ou n\'est pas lancé.'));
                            }
                            process.exit(0);
                        } else {
                            connection.query('INSERT INTO servers (id, name, host, port, container, disk_max, sftp_username, sftp_password) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, host, port, container.id, max_disk, sftp_user, sftp_password], async function(err) {
                                if (err) {
                                    console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                                    await docker.getContainer(container.id).remove({ force: true });
                                    process.exit(0);
                                }
                
                                connection.query('INSERT INTO servers_users (user_id, server_id, user_status) VALUES (?, ?, "owner")', [user.id, id], async function(err) {
                                    if (err) {
                                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                                        connection.query('DELETE FROM servers WHERE id = ?', [id]);
                                        await docker.getContainer(container.id).remove({ force: true });
                                        process.exit(0);
                                    }

                                    connection.query('INSERT INTO permissions (server_id, user_id, permissions_id) VALUES (?, ?, 0)', [id, user.id], async function(err) {
                                        if (err) {
                                            console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                                            connection.query('DELETE FROM servers WHERE id = ?', [id]);
                                            connection.query('DELETE FROM servers_users WHERE server_id = ?', [id]);
                                            await docker.getContainer(container.id).remove({ force: true });
                                            process.exit(0);
                                        }
                
                                        fs.mkdirSync(path.join(__dirname, 'servers', id.toString()), { recursive: true });
                                        console.log(colors.green(`Le serveur "${name}" (#${id}) a été créé à l'adresse ${host}:${port} avec comme propriétaire ${owner} !`));
                                        process.exit(0);
                                    });
                                });
                            });
                        }
                    });
                });
            } else if (args[1] === 'user') {
                let username;
                let password;
                let email;

                args.forEach(async (arg, index) => {
                    if (arg === '--username') {
                        username = args[index + 1];
                    } else if (arg === '--password') {
                        password = crypto.createHash('md5').update(args[index + 1]).digest('hex');
                    } else if (arg === '--email') {
                        email = args[index + 1];
                    }
                });

                if (typeof username == 'undefined' || typeof password == 'undefined' || typeof email == 'undefined') {
                    console.log(colors.red('Veuillez spécifier un nom d\'utilisateur, un mot de passe et une adresse email.'));
                    console.log(`Exemple: ${colors.yellow(prefix+'feather')} add user ${colors.blue('--username')} ${colors.cyan('"Pseudo"')} ${colors.blue('--password')} ${colors.cyan('"Mot de passe"')} ${colors.blue('--email')} ${colors.cyan('"Adresse email"')}`)
                    process.exit(0);
                }

                if (!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
                    console.log(colors.red('L\'adresse email est invalide.'));
                    process.exit(0);
                }
                if (username.length < 3) {
                    console.log(colors.red('Le nom d\'utilisateur doit contenir au moins 3 caractères.'));
                    process.exit(0);
                }
                if (password.length < 6) {
                    console.log(colors.red('Le mot de passe doit contenir au moins 6 caractères.'));
                    process.exit(0);
                }
                if (username.length > 255) {
                    console.log(colors.red('Le nom d\'utilisateur doit contenir au maximum 255 caractères.'));
                    process.exit(0);
                }

                connection.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], function(err, user) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    } else if (user.length > 0) {
                        if (user[0].username == username) {
                            console.log(colors.red('Ce nom d\'utilisateur existe déjà.'));
                        } else {
                            console.log(colors.red('Cette adresse email est déjà utilisée.'));
                        }
                        process.exit(0);
                    }

                    connection.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email], function(err) {
                        if (err) {
                            console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                            process.exit(0);
                        }

                        console.log(colors.green(`L'utilisateur "${username}" a été créé avec succès !`));
                        process.exit(0);
                    });
                });
            } else {
                unknownCommand();
            }
        } else if (args[0] === 'remove') {
            if (args[1] === 'server') {
                let id = args[2];
        
                if (typeof id == 'undefined') {
                    console.log(colors.red('Veuillez spécifier un identifiant de serveur.'));
                    console.log(`Exemple: ${colors.yellow(prefix+'feather')} remove server ${colors.cyan('123456')}`);
                    process.exit(0);
                }

                connection.query('SELECT * FROM servers WHERE id = ?', [id], async function(err, server) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    } else if (server.length === 0) {
                        console.log(colors.red('Ce serveur n\'existe pas.'));
                        process.exit(0);
                    }
                    server = server[0];

                    if (args[3] === '--force') {
                        removeServer(connection, server);
                    } else {
                        new Confirm({
                              name: 'confirmation',
                              message: 'Êtes-vous sûr de vouloir supprimer ce serveur ? (utilisez --force pour supprimer sans confirmation)'
                        }).run().then(async answer => {
                            if (answer) {
                                removeServer(connection, server);
                            } else {
                                console.log(colors.red('Annulation de la suppression du serveur.'));
                                process.exit(0);
                            }
                        });
                    }
                });
            } else if (args[1] === 'user') {
                let id = args[2];
        
                if (typeof id == 'undefined') {
                    console.log(colors.red('Veuillez spécifier un identifiant d\'utilisateur.'));
                    console.log(`Exemple: ${colors.yellow(prefix+'feather')} remove user ${colors.cyan('"Pseudo"')}`);
                    process.exit(0);
                }

                connection.query('SELECT * FROM users WHERE id = ? OR username = ? OR email = ?', [id, id, id], async function(err, user) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    } else if (user.length === 0) {
                        console.log(colors.red('Cet utilisateur n\'existe pas.'));
                        process.exit(0);
                    }
                    user = user[0];

                    if (args[3] === '--force') {
                        removeUser(connection, user);
                    } else {
                        new Confirm({
                              name: 'confirmation',
                              message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? (utilisez --force pour supprimer sans confirmation)'
                        }).run().then(async answer => {
                            if (answer) {
                                removeUser(connection, user);
                            } else {
                                console.log(colors.red('Annulation de la suppression de l\'utilisateur.'));
                                process.exit(0);
                            }
                        });
                    }
                });
            } else {
                unknownCommand();
            }
        } else if (args[0] === 'get') {
            if (args[1] === 'servers') {
                connection.query('SELECT * FROM servers', function(err, servers) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    }

                    console.log(colors.green('Liste des serveurs:'));
                    servers.forEach(server => {
                        console.log(`- ${colors.cyan(server.name)} (${server.id})`);
                    });
                    process.exit(0);
                });
            } else if (args[1] === 'users') {
                connection.query('SELECT * FROM users', function(err, users) {
                    if (err) {
                        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                        process.exit(0);
                    }

                    console.log(colors.green('Liste des utilisateurs:'));
                    users.forEach(user => {
                        console.log(`- ${colors.cyan(user.username)} (${user.id})`);
                    });
                    process.exit(0);
                });
            } else {
                unknownCommand();
            }
        } else if (args[0] === 'config') {
            let config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

            if (args[1] === 'set') {
                if (args[2] === 'title') {
                    if (typeof args[3] == 'undefined') {
                        console.log(colors.red('Veuillez spécifier un titre.'));
                        console.log(`Exemple: ${colors.yellow(prefix+'feather')} config set title ${colors.cyan('"Nom du panel"')}`);
                        process.exit(0);
                    }

                    config.title = args[3];
                } else if (args[2] === 'contact') {
                    if (typeof args[3] == 'undefined') {
                        console.log(colors.red('Veuillez spécifier une adresse email.'));
                        console.log(`Exemple: ${colors.yellow(prefix+'feather')} config set contact ${colors.cyan('contact@example.com')}`);
                        process.exit(0);
                    }

                    if (!args[3].match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/) || args[3].length > 255) {
                        console.log(colors.red('L\'adresse email spécifiée est invalide.'));
                        process.exit(0);
                    }

                    config.contact = args[3];
                } else if (args[2] === 'port') {
                    if (typeof args[3] == 'undefined') {
                        console.log(colors.red('Veuillez spécifier un port.'));
                        console.log(`Exemple: ${colors.yellow(prefix+'feather')} config set port ${colors.cyan('80')}`);
                        process.exit(0);
                    }

                    if (isNaN(args[3]) || args[3] < 1 || args[3] > 65535) {
                        console.log(colors.red('Le port spécifié est invalide.'));
                        process.exit(0);
                    }

                    config.port = args[3];
                } else if (args[2] === 'mysql') {
                    args.forEach(arg => {
                        if (arg === '--host') {
                            config.mysql.host = args[args.indexOf(arg) + 1];
                        } else if (arg === '--user') {
                            config.mysql.user = args[args.indexOf(arg) + 1];
                        } else if (arg === '--password') {
                            config.mysql.password = args[args.indexOf(arg) + 1];
                        } else if (arg === '--database') {
                            config.mysql.database = args[args.indexOf(arg) + 1];
                        } else if (arg === '--port') {
                            config.mysql.port = args[args.indexOf(arg) + 1];
                        }
                    });
                } else {
                    unknownCommand();
                }

                fs.writeFile('./config.json', JSON.stringify(config, null, 4), function(err) {
                    if (err) {
                        console.log(colors.red('Échec lors de l\'écriture du fichier de configuration.'));
                        process.exit(0);
                    } else {
                        console.log(colors.green('Fichier de configuration mis à jour.'));
                        process.exit(0);
                    }
                });
            } else if (args[1] === 'reset') {
                if (args[2] === 'cookie') {
                    config.cookie = genCookie();
                    fs.writeFile('./config.json', JSON.stringify(config, null, 4), function(err) {
                        if (err) {
                            console.log(colors.red('Échec lors de l\'écriture du fichier de configuration.'));
                            process.exit(0);
                        } else {
                            console.log(colors.green('Fichier de configuration mis à jour.'));
                            process.exit(0);
                        }
                    });
                } else {
                    unknownCommand();
                }
            } else {
                unknownCommand();
            }
        } else if (args[0] === 'help') {
            console.log(colors.yellow('Feather - Commandes'));
            console.log('');
            console.log(colors.yellow('Créer un serveur:'));
            console.log(`${prefix}feather create server ${colors.blue('--owner')} ${colors.cyan('<pseudo>')} ${colors.blue('--name')} ${colors.cyan('[nom]')} ${colors.blue('--port')} ${colors.cyan('[port]')} ${colors.blue('--ram')} ${colors.cyan('[ram maximale]')} ${colors.blue('--disk')} ${colors.cyan('[espace disque maximum]')}`);
            console.log('');
            console.log(colors.yellow('Créer un utilisateur:'));
            console.log(`${prefix}feather create user ${colors.blue('--username')} ${colors.cyan('<pseudo>')} ${colors.blue('--password')} ${colors.cyan('<mot de passe>')} ${colors.blue('--email')} ${colors.cyan('<email>')}`);
            console.log('');
            console.log(colors.yellow('Supprimer un serveur:'));
            console.log(`${prefix}feather remove server ${colors.cyan('<id>')} [--force]`);
            console.log('');
            console.log(colors.yellow('Supprimer un utilisateur:'));
            console.log(`${prefix}feather remove user ${colors.cyan('<pseudo/email/id>')} [--force]`);
            console.log('');
            console.log(colors.yellow('Lister les serveurs:'));
            console.log(`${prefix}feather get servers`);
            console.log('');
            console.log(colors.yellow('Lister les utilisateurs:'));
            console.log(`${prefix}feather get users`);
            console.log(colors.yellow('Modifier la configuration:'));
            console.log(colors.yellow('\t - Modifier le titre du panel:'));
            console.log(`\t${prefix}feather config set title ${colors.cyan('<titre>')}`);
            console.log('');
            console.log(colors.yellow('\t - Modifier l\'adresse email de contact:'));
            console.log(`\t${prefix}feather config set contact ${colors.cyan('<email>')}`);
            console.log('');
            console.log(colors.yellow('\t - Modifier le port du panel:'));
            console.log(`\t${prefix}feather config set port ${colors.cyan('<port>')}`);
            console.log('');
            console.log(colors.yellow('\t - Modifier les paramètres de connexion à la base de données MySQL:'));
            console.log(`\t${prefix}feather config set mysql ${colors.blue('--host')} ${colors.cyan('[localhost]')} ${colors.blue('--user')} ${colors.cyan('[root]')} ${colors.blue('--password')} ${colors.cyan('[mot de passe]')} ${colors.blue('--database')} ${colors.cyan('[feather]')} ${colors.blue('--port')} ${colors.cyan('[3306]')}`);
            console.log('');
            console.log(colors.yellow('Afficher l\'aide:'));
            console.log(`${prefix}feather help`);
            console.log('');
            process.exit(0);
        } else {
            unknownCommand();
        }
    }
})();

async function removeUser(connection, user) {
    connection.query('DELETE FROM users WHERE id = ?', [user.id], async function(err) {
        if (err) {
            console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
            process.exit(0);
        }

        connection.query('DELETE FROM servers_users WHERE user_id = ?', [user.id], async function(err) {
            if (err) {
                console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                process.exit(0);
            }

            console.log(colors.green(`L'utilisateur "${user.username}" a été supprimé avec succès !`));
            process.exit(0);
        });
    });
}

async function removeServer(connection, server) {
    connection.query('DELETE FROM servers WHERE id = ?', [server.id], async function(err) {
        if (err) {
            console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
            process.exit(0);
        }

        connection.query('DELETE FROM servers_users WHERE server_id = ?', [server.id], async function(err) {
            if (err) {
                console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
                process.exit(0);
            }

            await docker.getContainer(server.container).remove({ force: true });
            fs.rmdirSync(path.join(__dirname, 'servers', server.id.toString()), { recursive: true });
            console.log(colors.green(`Le serveur #${server.id} a été supprimé !`));
            process.exit(0);
        });
    });
}

async function genPort(connection, port = undefined) {
    if (typeof port === 'undefined')
        port = Math.floor(Math.random() * (65535 - 25565 + 1)) + 25565;
    
    try {
        let server = await util.promisify(connection.query).bind(connection)('SELECT * FROM servers WHERE port = ? OR port = ?', [port, port - 1]);
        if (server.length > 0) {
            return genPort(connection);
        } else {
            return port;
        }
    } catch(e) {
        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
        process.exit(0);
    }
}

async function genServerId(connection) {
    let id = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    try {
        let server = await util.promisify(connection.query).bind(connection)('SELECT * FROM servers WHERE id = ?', [id]);
        if (server.length > 0) {
            genServerId(connection);
        } else {
            return id;
        }
    } catch(e) {
        console.log(colors.red('Échec lors de la connexion à la base de données. Veuillez réessayer.'));
        process.exit(0);
    }
}

function genCookie() {
    return crypto.randomBytes(16).toString('hex');
}

async function getIp() {
    return new Promise((resolve, reject) => {
        https.get('https://checkip.amazonaws.com/', (res) => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', (data) => {
                body += data;
            });
            res.on('end', () => {
                resolve(body);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

function unknownCommand() {
    console.log(colors.red(`Commande inconnue. Utilisez "${prefix}feather help" pour afficher l'aide.`));
    process.exit(0);
}
