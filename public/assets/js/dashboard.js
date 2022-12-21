// chart

const chart_ram = new Chart(document.getElementById('chart_ram'), {
    "type": "line",
    "data": {
        "labels": [],
        "datasets": [
            {
                "label": "RAM",
                "backgroundColor": "rgba(78, 115, 223, 0.05)",
                "borderColor": "#1cc88a",
                "pointRadius": 3,
                "pointBackgroundColor": "#1cc88a",
                "pointBorderColor": "#1cc88a",
                "pointHoverRadius": 3,
                "pointHoverBackgroundColor": "#1cc88a",
                "pointHoverBorderColor": "#1cc88a",
                "pointHitRadius": 10,
                "pointBorderWidth": 2,
                "data": []
            }
        ]
    },
    "options": {
        "maintainAspectRatio": false,
        "layout": {
            "padding": {
                "left": 10,
                "right": 25,
                "top": 25,
                "bottom": 0
            }
        },
        "scales": {
            "xAxes": [
                {
                    "time": {
                        "unit": "date"
                    },
                    "gridLines": {
                        "display": false,
                        "drawBorder": false
                    },
                    "ticks": {
                        "maxTicksLimit": 7
                    }
                }
            ],
            "yAxes": [
                {
                    "ticks": {
                        "maxTicksLimit": 5,
                        "padding": 10,
                        "callback": (value, index, values) => {
                            return value + '%';
                        }
                    },
                    "gridLines": {
                        "color": "rgb(234, 236, 244)",
                        "zeroLineColor": "rgb(234, 236, 244)",
                        "drawBorder": false,
                        "borderDash": [
                            2
                        ],
                        "zeroLineBorderDash": [
                            2
                        ]
                    }
                }
            ]
        },
        "legend": {
            "display": false
        },
        "tooltips": {
            "enabled": true,
            "intersect": true,
            "mode": "index",
            "bodySpacing": 5,
            "titleMarginBottom": 10,
            "titleFontColor": "#6e707e",
            "titleFontSize": 14,
            "backgroundColor": "rgb(255,255,255)",
            "bodyFontColor": "#858796",
            "bodyFontSize": 12,
            "footerMarginTop": 6,
            "footerFontColor": "#6e707e",
            "footerFontSize": 12,
            "xPadding": 10,
            "yPadding": 7,
            "caretPadding": 10,
            "displayColors": false,
            "caretSize": 8,
            "cornerRadius": 5,
            "multiKeyBackground": "#fff",
            "callbacks": {
                "label": (tooltipItem, data) => {
                    return data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] + '%';
                }
            }
        }
    }
});

const chart_cpu = new Chart(document.getElementById('chart_cpu'), {
    "type": "line",
    "data": {
        "labels": [],
        "datasets": [
            {
                "label": "RAM",
                "backgroundColor": "rgba(78, 115, 223, 0.05)",
                "borderColor": "#F6C23E",
                "pointRadius": 3,
                "pointBackgroundColor": "#F6C23E",
                "pointBorderColor": "#F6C23E",
                "pointHoverRadius": 3,
                "pointHoverBackgroundColor": "#F6C23E",
                "pointHoverBorderColor": "#F6C23E",
                "pointHitRadius": 10,
                "pointBorderWidth": 2,
                "data": []
            }
        ]
    },
    "options": {
        "maintainAspectRatio": false,
        "layout": {
            "padding": {
                "left": 10,
                "right": 25,
                "top": 25,
                "bottom": 0
            }
        },
        "scales": {
            "xAxes": [
                {
                    "time": {
                        "unit": "date"
                    },
                    "gridLines": {
                        "display": false,
                        "drawBorder": false
                    },
                    "ticks": {
                        "maxTicksLimit": 7
                    }
                }
            ],
            "yAxes": [
                {
                    "ticks": {
                        "maxTicksLimit": 5,
                        "padding": 10,
                        "callback": (value, index, values) => {
                            return value + '%';
                        }
                    },
                    "gridLines": {
                        "color": "rgb(234, 236, 244)",
                        "zeroLineColor": "rgb(234, 236, 244)",
                        "drawBorder": false,
                        "borderDash": [
                            2
                        ],
                        "zeroLineBorderDash": [
                            2
                        ]
                    }
                }
            ]
        },
        "legend": {
            "display": false
        },
        "tooltips": {
            "enabled": true,
            "intersect": true,
            "mode": "index",
            "bodySpacing": 5,
            "titleMarginBottom": 10,
            "titleFontColor": "#6e707e",
            "titleFontSize": 14,
            "backgroundColor": "rgb(255,255,255)",
            "bodyFontColor": "#858796",
            "bodyFontSize": 12,
            "footerMarginTop": 6,
            "footerFontColor": "#6e707e",
            "footerFontSize": 12,
            "xPadding": 10,
            "yPadding": 7,
            "caretPadding": 10,
            "displayColors": false,
            "caretSize": 8,
            "cornerRadius": 5,
            "multiKeyBackground": "#fff",
            "callbacks": {
                "label": (tooltipItem, data) => {
                    return data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] + '%';
                }
            }
        }
    }
});

const chart_size = new Chart(document.getElementById('chart_size'), {
    "type": "doughnut",
    "data": {
        "labels": [
            "Utilisé",
            "Non utilisé"
        ],
        "datasets": [
            {
                "label": "",
                "backgroundColor": [
                    "#4e73df",
                    "#858796"
                ],
                "borderColor": [
                    "#ffffff",
                    "#ffffff"
                ],
                "data": [
                    server.disk / 1000000,
                    server.disk_max / 1000000 - server.disk / 1000000
                ]
            }
        ]
        },
        "options": {
        "maintainAspectRatio": false,
        "legend": {
            "display": false,
            "labels": {
                "fontStyle": "normal"
            }
        },
        "title": {
            "fontStyle": "normal",
            "display": false
        },
        "tooltips": {
            "enabled": true,
            "intersect": true,
            "mode": "index",
            "bodySpacing": 5,
            "yPadding": 10,
            "xPadding": 10,
            "caretPadding": 0,
            "displayColors": false,
            "backgroundColor": "rgba(255,255,255,0.95)",
            "titleFontColor": "#333",
            "bodyFontColor": "#666",
            "borderColor": "#dddfeb",
            "borderWidth": 1,
            "cornerRadius": 2,
            "footerSpacing": 0,
            "titleSpacing": 0,
            "callbacks": {
                "label": (tooltipItem, data) => {
                    return data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] + ' MB';
                },
            }
        },
        "animation": {
            "animateScale": true,
            "animateRotate": true
        }
    }
});

window.addEventListener('message', (event) => {
    if (event.data.error) {
        console.error(event.data.error);
        if (event.data.error.toLowerCase().includes('not running')) {
            document.getElementById('status').innerHTML = serverStatus['stopped'];
            document.getElementById('status_circle').style.color = serverStatusColor['stopped'];
        }
        return;
    }

    document.getElementById('disk').innerHTML = event.data.Size / 1000000;
    document.getElementById('diskperc').setAttribute('aria-valuenow', event.data.Size * 100 / server.disk_max);
    document.getElementById('diskperc').style.width = event.data.Size * 100 / server.disk_max + '%';
    document.getElementById('diskperc').innerHTML = event.data.Size * 100 / server.disk_max + '%';
    document.getElementById('mem').innerHTML = event.data.Stats.MemUsage;
    document.getElementById('memperc').setAttribute('aria-valuenow', event.data.Stats.MemPerc.split('%')[0]);
    document.getElementById('memperc').style.width = event.data.Stats.MemPerc;
    document.getElementById('memperc').innerHTML = event.data.Stats.MemPerc;
    document.getElementById('cpu').innerHTML = event.data.Stats.CPUPerc;
    document.getElementById('cpuperc').setAttribute('aria-valuenow', event.data.Stats.CPUPerc.split('%')[0]);
    document.getElementById('cpuperc').style.width = event.data.Stats.CPUPerc;
    document.getElementById('cpuperc').innerHTML = event.data.Stats.CPUPerc;
    document.getElementById('status').innerHTML = serverStatus[event.data.Server.status];
    document.getElementById('status_circle').style.color = serverStatusColor[event.data.Server.status];

    // RAM
    if (chart_ram.data.labels.length > 0) {
        const last = chart_ram.data.labels[chart_ram.data.labels.length - 1].split(':');
        const current = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).toString().split(':');
        if (last[0] === current[0] && last[1] === current[1]) {
            chart_ram.data.labels.pop();
            chart_ram.data.datasets[0].data.pop();
        }
    }

    if (chart_ram.data.labels.length > 10) {
        chart_ram.data.labels.shift();
        chart_ram.data.datasets[0].data.shift();
    }
    
    chart_ram.data.labels.push(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).toString());
    chart_ram.data.datasets[0].data.push(event.data.Stats.MemPerc.split('%')[0]);
    chart_ram.update();

    // CPU
    if (chart_cpu.data.labels.length > 0) {
        const last = chart_cpu.data.labels[chart_cpu.data.labels.length - 1].split(':');
        const current = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).toString().split(':');
        if (last[0] === current[0] && last[1] === current[1]) {
            chart_cpu.data.labels.pop();
            chart_cpu.data.datasets[0].data.pop();
        }
    }

    if (chart_cpu.data.labels.length > 10) {
        chart_cpu.data.labels.shift();
        chart_cpu.data.datasets[0].data.shift();
    }

    chart_cpu.data.labels.push(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).toString());
    chart_cpu.data.datasets[0].data.push(event.data.Stats.CPUPerc.split('%')[0]);
    chart_cpu.update();

    // DISK
    chart_size.data.datasets[0].data[0] = event.data.Size / 1000000;
    chart_size.update();

    console.log(event.data);
});
