/**
 * # ClientList widget for nodeGame
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Shows current, previous and next state.
 *
 * www.nodegame.org
 * ---
 */
(function(node) {

    "use strict";

    node.widgets.register('ClientList', ClientList);

    var JSUS = node.JSUS,
        Table = node.window.Table,
        GameStage = node.GameStage;

    // ## Meta-data

    ClientList.version = '0.1.0';
    ClientList.description = 'Visually display all clients in a room.';

    ClientList.title = 'Clients';
    ClientList.className = 'clientlist';

    // ## Dependencies

    ClientList.dependencies = {
        JSUS: {},
        Table: {}
    };

    function renderCell(o) {
        var content;
        var text, textElem;

        content = o.content;
        textElem = document.createElement('span');
        if ('object' === typeof content) {
            switch (o.x) {
            case 0:
                text = content.id;
                break;

            case 1:
                text = content.admin ? 'admin' : 'player';
                // Highlight this monitor.
                if (content.id === node.player.id) {
                    text += '*';
                    textElem.title = 'This is the monitor itself.';
                }
                break;
            
            case 2:
                text = GameStage.toHash(content.stage, 'S.s.r');
                break;
            
            case 3:
                text = content.disconnected ? 'disconnected' : 'connected';
                break;
            
            case 4:
                text = content.sid;
                break;

            default:
                text = 'N/A';
                break;
            }

            textElem.innerHTML = text;
        }
        else {
            textElem = document.createTextNode(content);
        }

        return textElem;
    }

    function ClientList(options) {
        this.id = options.id;

        this.channelName = options.channel || null;
        this.roomId = options.roomId || null;
        this.roomName = options.roomName || null;
        this.table = new Table({
            render: {
                pipeline: renderCell,
                returnAt: 'first'
            }
        });

        // Create header:
        this.table.setHeader(['ID', 'Type', 'Stage', 'Connection', 'SID']);
    }

    ClientList.prototype.setChannel = function(channelName) {
        // Hide this panel if the channel changed:
        if (!channelName || channelName !== this.channelName) {
            this.roomId = null;
            this.roomName = null;
            if (this.panelDiv) {
                this.panelDiv.style.display = 'none';
            }
        }

        this.channelName = channelName;
    };

    ClientList.prototype.setRoom = function(roomId, roomName) {
        this.roomId = roomId;
        this.roomName = roomName;
    };

    ClientList.prototype.refresh = function() {
        if ('string' !== typeof this.roomId) return;

        // Ask server for client list:
        node.socket.send(node.msg.create({
            target: 'SERVERCOMMAND',
            text:   'INFO',
            data: {
                type:   'CLIENTS',
                roomId: this.roomId
            }
        }));

        this.table.parse();
    };

    ClientList.prototype.append = function() {
        var that;
        var button;

        that = this;

        // Hide the panel initially:
        this.panelDiv.style.display = 'none';

        // Add client table:
        this.bodyDiv.appendChild(this.table.table);

        // Add buttons for setup/start/stop/pause/resume:
        button = document.createElement('button');
        button.innerHTML = 'Setup';
        button.onclick = function() {
            node.socket.send(node.msg.create({
                target: 'SERVERCOMMAND',
                text:   'ROOMCOMMAND',
                data: {
                    type:   'SETUP',
                    roomId: that.roomId
                }
            }));
        };
        this.bodyDiv.appendChild(button);

        button = document.createElement('button');
        button.innerHTML = 'Start';
        button.onclick = function() {
            //node.remoteCommand('start', 'ROOM_' + that.roomId);
            node.socket.send(node.msg.create({
                target: 'SERVERCOMMAND',
                text:   'ROOMCOMMAND',
                data: {
                    type:      'START',
                    roomId:    that.roomId,
                    doPlayers: false
                }
            }));
        };
        this.bodyDiv.appendChild(button);

        button = document.createElement('button');
        button.innerHTML = 'Stop';
        button.onclick = function() {
            //node.remoteCommand('stop', 'ROOM_' + that.roomId);
            node.socket.send(node.msg.create({
                target: 'SERVERCOMMAND',
                text:   'ROOMCOMMAND',
                data: {
                    type:      'STOP',
                    roomId:    that.roomId,
                    doPlayers: true
                }
            }));
        };
        this.bodyDiv.appendChild(button);

        button = document.createElement('button');
        button.innerHTML = 'Pause';
        button.onclick = function() {
            //node.remoteCommand('pause', 'ROOM_' + that.roomId);
            node.socket.send(node.msg.create({
                target: 'SERVERCOMMAND',
                text:   'ROOMCOMMAND',
                data: {
                    type:      'PAUSE',
                    roomId:    that.roomId,
                    doPlayers: true
                }
            }));
        };
        this.bodyDiv.appendChild(button);

        button = document.createElement('button');
        button.innerHTML = 'Resume';
        button.onclick = function() {
            //node.remoteCommand('resume', 'ROOM_' + that.roomId);
            node.socket.send(node.msg.create({
                target: 'SERVERCOMMAND',
                text:   'ROOMCOMMAND',
                data: {
                    type:      'RESUME',
                    roomId:    that.roomId,
                    doPlayers: true
                }
            }));
        };
        this.bodyDiv.appendChild(button);

        // Query server:
        this.refresh();
    };

    ClientList.prototype.listeners = function() {
        var that;

        that = this;

        // Listen for server reply:
        node.on.data('INFO_CLIENTS', function(msg) {
            // Update the contents:
            that.writeClients(msg.data);
            that.updateTitle();

            // Show the panel:
            that.panelDiv.style.display = '';
        });

        // Listen for events from ChannelList saying to switch channels:
        node.on('USECHANNEL', function(channel) {
            that.setChannel(channel);
        });

        // Listen for events from RoomList saying to switch rooms:
        node.on('USEROOM', function(roomInfo) {
            that.setRoom(roomInfo.id, roomInfo.name);

            // Query server:
            that.refresh();
        });
    };

    ClientList.prototype.writeClients = function(clients) {
        var clientName, clientObj;

        this.table.clear(true);

        // Create a row for each client:
        for (clientName in clients) {
            if (clients.hasOwnProperty(clientName)) {
                clientObj = clients[clientName];

                this.table.addRow(
                    [clientObj, clientObj, clientObj, clientObj, clientObj]);
            }
        }

        this.table.parse();
    };

    ClientList.prototype.updateTitle = function() {
        var ol, li;

        // Use breadcrumbs of the form "<channelname> / <roomname> / Clients".
        ol = document.createElement('ol');
        ol.className = 'breadcrumb';

        li = document.createElement('li');
        li.innerHTML = this.channelName;
        li.className = 'active';
        ol.appendChild(li);

        li = document.createElement('li');
        li.innerHTML = this.roomName;
        li.className = 'active';
        ol.appendChild(li);

        li = document.createElement('li');
        li.innerHTML = 'Clients';
        ol.appendChild(li);

        this.setTitle(ol);
    };

})(node);
