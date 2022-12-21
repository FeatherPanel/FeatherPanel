let first = true;
let defaultDisabled = false;

let greetings =
'=================================\r\n' +
'[[gb;yellow;black] ' + title + ']\r\n' +
' Powered by Feather Panel v' + version + '\r\n' +
'=================================\r\n' +
'\r\n' +
'Type [[;#fff;]"help"] to see the list of commands.\r\n'

let terminal = $('body').terminal({
    help: function() {
        if (first) return;
        if (defaultDisabled) return;
        this.echo();
        this.echo('[[bu;;]Available commands:]');
        this.echo('[[b;#fff;]help] - Show this help message');
        this.echo('[[b;#fff;]cls] - Clear the terminal');
        this.echo('[[b;#fff;]stop] - Stop the server');
        this.echo('[[b;#fff;]start] - Start the server');
        this.echo('[[b;#fff;]restart] - Restart the server');
        this.echo();
    },
    cls: async function() {
        if (first) return;
        if (defaultDisabled) return;
        await this.clear();
        this.echo(greetings);
    },
    stop: function() {
        if (first) return;
        if (server.status == 'stopped') {
            terminal.echo(`[[b;red;]&#91;${conf.title}&#93; Le serveur est déjà hors ligne]`);
            return;
        }
        this.echo(`[[b;red;]&#91;${conf.title}&#93; Arrêt du serveur...]`);
        $.ajax({
            type: 'POST',
            url: '/server/' + server.id + '/stop',
            success: function(data) {
                terminal.echo(data);
            }
        });
    },
    start: function() {
        if (first) return;
        if (server.status == 'running' || server.status == 'starting') {
            terminal.echo(`[[b;red;]&#91;${conf.title}&#93; Le serveur est déjà en ligne]`);
            return;
        }
        if (defaultDisabled) return;

        defaultDisabled = true;
        this.echo(`[[b;lightgreen;]&#91;${conf.title}&#93; Démarrage du serveur...]`);
        $.ajax({
            type: 'POST',
            url: '/server/' + server.id + '/start',
            data: {
                token: token
            },
            contentType: 'application/x-www-form-urlencoded',
            success: function(data) {
                if (typeof data.error !== 'undefined') {
                    defaultDisabled = false;
                }
            },
            error: function() {
                defaultDisabled = false;
            }
        });
    },
    restart: function() {
        if (first) return;
        this.echo(`[[b;orange;]&#91;${conf.title}&#93; Redémarrage du serveur...]`);
        $.ajax({
            type: 'POST',
            url: '/server/' + server.id + '/restart',
            success: function(data) {
                terminal.echo(data);
            }
        });
    },
    '*': function(command) {
        if (first) return;
        if (!defaultDisabled) {
            this.echo(`[[b;red;]&#91;${conf.title}&#93; Commande inconnue: ${command}]`);
            return;
        }
    }
},
{
    greetings,
    name: 'feather',
    prompt: 'container:~$ '
});

const socket = io.connect('http://localhost:3000', {
    transports: ['websocket', 'polling']
});

socket.on("connect", () => {
    socket.emit("history", token); 
});

socket.on("history", (data) => {
    if (data.error) {
        console.error(data.error);
        if (!!data.display)
            terminal.echo(`[[b;red;]${data.error}]`);
    } else {
        terminal.echo(data.data);
    }
});

socket.on('info', (data) => {
    if (data.error) {
        if (!!data.display || first) {
            defaultDisabled = false;
            terminal.echo(`[[b;red;]${data.error}]`);
            window.parent.postMessage(data, '*');
        }
    } else {
        if (data.data.State.Running) defaultDisabled = true;
        else defaultDisabled = false;
        window.parent.postMessage(data.data, '*');
    }
});

socket.emit("info", token);
setInterval(() => {
    first = false;
    socket.emit("info", token);
}, 1500);
