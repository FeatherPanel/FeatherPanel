const socket = io.connect('http://localhost:3000', {
    transports: ['websocket', 'polling']
});

socket.on('info', (data) => {
    if (data.error) {
        if (!!data.display) {
            console.error(data.error);
            document.querySelector(`.id${data.data.Server.id} #status`).innerHTML = serverStatus['stopped'];
        }
    } else {
        document.querySelector(`.id${data.data.Server.id} #memperc`).innerHTML = data.data.Stats.MemPerc;
        document.querySelector(`.id${data.data.Server.id} #cpuperc`).innerHTML = data.data.Stats.CPUPerc;
        document.querySelector(`.id${data.data.Server.id} #diskperc`).innerHTML = data.data.Size * 100 / data.data.Server.disk_max + '%';
        document.querySelector(`.id${data.data.Server.id} #status`).innerHTML = serverStatus[data.data.Server.status];
    }
});

getAllServers();
setInterval(() => {
    getAllServers();
}, 5000);

function getAllServers() {
    servers.forEach(server => {
        socket.emit('info', token, server);
    });
}