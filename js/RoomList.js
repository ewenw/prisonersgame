/**
 * # RoomList widget for nodeGame
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

    node.widgets.register('RoomList', RoomList);

    var JSUS = node.JSUS,
        Table = node.window.Table;

    // ## Meta-data

    RoomList.version = '0.1.0';
    RoomList.description = 'Visually display all rooms in a channel.';

    RoomList.title = 'Rooms';
    RoomList.className = 'roomlist';

    // ## Dependencies

    RoomList.dependencies = {
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
                text = content.name;
                break;

            case 1:
                text = content.id;
                break;

            case 2:
                text = '' + content.nClients;
                break;
            
            case 3:
                text = '' + content.nPlayers;
                break;
            
            case 4:
                text = '' + content.nAdmins;
                break;

            default:
                text = 'N/A';
                break;
            }

            if (o.x === 0) {
                textElem.innerHTML = '<a class="ng_clickable">' + text + '</a>';

                textElem.onclick = function() {
                    // Signal the ClientList to switch rooms:
                    node.emit('USEROOM', {
                        id: content.id,
                        name: content.name
                    });
                };
            }
            else {
                textElem.innerHTML = text;
            }
        }
        else {
            textElem = document.createTextNode(content);
        }

        return textElem;
    }

    function RoomList(options) {
        this.id = options.id;

        this.channelName = options.channel || null;
        this.table = new Table({
            render: {
                pipeline: renderCell,
                returnAt: 'first'
            }
        });

        // Create header:
        this.table.setHeader(['Name', 'ID',
                              'Clients', 'Players', 'Admins']);
    }

    RoomList.prototype.setChannel = function(channelName) {
        this.channelName = channelName;
    };

    RoomList.prototype.refresh = function() {
        if ('string' !== typeof this.channelName) return;

        // Ask server for room list:
        node.socket.send(node.msg.create({
            target: 'SERVERCOMMAND',
            text:   'INFO',
            data: {
                type:    'ROOMS',
                channel: this.channelName
            }
        }));

        this.table.parse();
    };

    RoomList.prototype.append = function() {
        // Hide the panel initially:
        this.panelDiv.style.display = 'none';

        this.bodyDiv.appendChild(this.table.table);

        // Query server:
        this.refresh();
    };

    RoomList.prototype.listeners = function() {
        var that;

        that = this;

        // Listen for server reply:
        node.on.data('INFO_ROOMS', function(msg) {
            // Update the contents:
            that.writeRooms(msg.data);
            that.updateTitle();

            // Show the panel:
            that.panelDiv.style.display = '';
        });

        // Listen for events from ChannelList saying to switch channels:
        node.on('USECHANNEL', function(channel) {
            that.setChannel(channel);

            // Query server:
            that.refresh();
        });
    };

    RoomList.prototype.writeRooms = function(rooms) {
        var roomName, roomObj;

        this.table.clear(true);

        // Create a row for each room:
        for (roomName in rooms) {
            if (rooms.hasOwnProperty(roomName)) {
                roomObj = rooms[roomName];

                this.table.addRow(
                        [roomObj, roomObj, roomObj, roomObj, roomObj]);
            }
        }

        this.table.parse();
    };

    RoomList.prototype.updateTitle = function() {
        var ol, li;

        // Use breadcrumbs of the form "<channelname> / Rooms".
        ol = document.createElement('ol');
        ol.className = 'breadcrumb';

        li = document.createElement('li');
        li.innerHTML = this.channelName;
        li.className = 'active';
        ol.appendChild(li);

        li = document.createElement('li');
        li.innerHTML = 'Rooms';
        ol.appendChild(li);

        this.setTitle(ol);
    };

})(node);
