const { Server } = require("socket.io");
const eiows = require("eiows");
const { decrypt } = require("./utils/crypto");
const mysql = require("mysql");
const { exec } = require("child_process");

const conf = require("./config.json");
let connection = mysql.createConnection(conf.mysql);

module.exports.initSocket = () => {
    const io = new Server(3000, {
        wsEngine: eiows.Server
    });

    io.on("connection", (socket) => {
        socket.on('history', (token) => {
            let data;
            try {
                data = JSON.parse(decrypt(token, 'aes-256-ctr', conf.cookie_secret));
            } catch (e) {
                console.log(e);
                return socket.emit('history', { error: 'Invalid token' });
            }

            connection.query('SELECT * FROM users WHERE id = ? AND password = ?', [data.user.id, data.user.password], function(err, user) {
                if (err) {
                    return socket.emit('history', { error: 'Internal server error' });
                }
                if (user.length === 0) {
                    return socket.emit('history', { error: 'Invalid token' });
                }
                user = user[0];

                connection.query('SELECT * FROM servers WHERE id = ? AND port = ?', [data.server.id, data.server.port], function(err, server) {
                    if (err) {
                        return socket.emit('history', { error: 'Internal server error' });
                    }
                    if (server.length === 0) {
                        return socket.emit('history', { error: 'Invalid token' });
                    }
                    server = server[0];

                    connection.query('SELECT * FROM servers_users WHERE server_id = ? AND user_id = ?', [server.id, user.id], function(err, server_user) {
                        if (err) {
                            return socket.emit('history', { error: 'Internal server error' });
                        }
                        if (server_user.length === 0) {
                            return socket.emit('history', { error: 'Invalid token' });
                        }

                        exec(`docker.exe logs ${server.container}`, (error, stdout, stderr) => {
                            if (error) {
                                console.log(`error: ${error.message}`);
                                return socket.emit('history', { error: 'Internal server error' });
                            }
                            socket.emit('history', { data: stdout });
                        });
                    });
                });
            });
        });

        socket.on('info', (token, requested_server = null) => {
            let data;
            try {
                data = JSON.parse(decrypt(token, 'aes-256-ctr', conf.cookie_secret));
            } catch (e) {
                console.log(e);
                return socket.emit('info', { error: 'Invalid token' });
            }

            requested_server = requested_server || data.server;
        
            connection.query('SELECT * FROM users WHERE id = ? AND password = ?', [data.user.id, data.user.password], function(err, user) {
                if (err) {
                    return socket.emit('info', { error: 'Internal server error' });
                }
                if (user.length === 0) {
                    return socket.emit('info', { error: 'Invalid token' });
                }
                user = user[0];

                connection.query('SELECT * FROM servers WHERE id = ? AND port = ?', [requested_server.id, requested_server.port], function(err, server) {
                    if (err) {
                        return socket.emit('info', { error: 'Internal server error' });
                    }
                    if (server.length === 0) {
                        return socket.emit('info', { error: 'Invalid token' });
                    }
                    server = server[0];
        
                    exec(`docker.exe inspect ${server.container}`, (error, stdout, stderr) => {
                        if (error) {
                            console.log(`error: ${error.message}`);
                            return socket.emit('info', { error: 'Internal server error' });
                        }
                        parsedOut = JSON.parse(stdout)[0];
                        if (!parsedOut.State.Running && server.status !== 'stopped') {
                            connection.query('UPDATE servers SET status = ?, ram = ?, ram_perc = ?, cpu = ? WHERE id = ?', ['stopped', '0MB', '0%', '0%', server.id]);
                            return socket.emit('info', { error: 'Server is not running' });
                        } else if (!parsedOut.State.Running && server.status === 'stopped') {
                            return socket.emit('info', { error: 'Server is not running', display: false });
                        }
                        if (parsedOut.State.Status !== server.status)
                            connection.query('UPDATE servers SET status = ? WHERE id = ?', [parsedOut.State.Status, server.id]);
                        exec(`docker.exe stats ${server.container} --no-stream --format "{{ json . }}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.log(`error: ${error.message}`);
                                return socket.emit('info', { error: 'Internal server error' });
                            }
                            parsedOut.Stats = JSON.parse(stdout);
                            exec(`docker ps --size -f "id=${server.container}" --format "{{ json . }}"`, (error, stdout, stderr) => {
                                if (error) {
                                    console.log(`error: ${error.message}`);
                                    return socket.emit('info', { error: 'Internal server error' });
                                }
                                let size;
                                try {
                                    size = JSON.parse(stdout).Size.split(' ')[0].toLowerCase();
                                    if (size.includes('gb')) {
                                        size = parseFloat(size.replace('gb', '')) * 1000;
                                    } else if (size.includes('mb')) {
                                        size = parseFloat(size.replace('mb', ''));
                                    } else if (size.includes('kb')) {
                                        size = parseFloat(size.replace('kb', '')) / 1000;
                                    } else if (size.includes('b')) {
                                        size = parseFloat(size.replace('b', '')) / 1000000;
                                    }
                                } catch {
                                    return socket.emit('info', { error: 'Internal server error' });
                                }
                                
                                parsedOut.Size = size * 1000000; // size in bytes (float)
                                parsedOut.Server = server;
                                if (typeof parsedOut !== 'undefined' && typeof parsedOut.Stats !== 'undefined' && typeof parsedOut.Stats.MemUsage !== 'undefined' && typeof parsedOut.Stats.MemPerc !== 'undefined' && typeof parsedOut.Size !== 'undefined' && typeof parsedOut.Stats.CPUPerc !== 'undefined') {
                                    connection.query('UPDATE servers SET ram = ?, ram_perc = ?, disk = ?, cpu = ? WHERE id = ?', [parsedOut.Stats.MemUsage, parsedOut.Stats.MemPerc, parsedOut.Size, parsedOut.Stats.CPUPerc, server.id]);
                                    socket.emit('info', { data: parsedOut });
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}
