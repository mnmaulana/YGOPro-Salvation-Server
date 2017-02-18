/*jslint node:true, plusplus:true, bitwise : true, nomen:true*/
'use strict';




var validateDeck = require('./validate-Deck'),
    configParser = require('./ConfigParser.js'),
    database = require('../http/manifest/manifest_0-en-OCGTCG.json'),
    fs = require('fs'),
    banLists = {},
    databases = {};

/**
 * Update the banlist
 */
function banListUpdater() {
    var data = fs.readFileSync('../http/ygopro/lflist.conf', {
        encoding: "UTF-8"
    });
    banLists = configParser(data, {
        keyValueDelim: " ",
        blockRegexp: /^\s?\!(.*?)\s?$/
    });
    return banLists;
}

var banlist = banListUpdater();


/**
 * Create a new game object.
 * @returns {object} customized game object
 */
function newGame() {
    return {
        started: false,
        deckcheck: 0,
        draw_count: 0,
        lflist: 0,
        mode: 1,
        noshuffle: 0,
        prio: 0,
        rule: 0,
        startlp: 0,
        starthand: 0,
        timelimit: 0,
        player: {
            0: {
                name: '',
                ready: false
            },
            1: {
                name: '',
                ready: false
            }
            //            ,
            //            2: {
            //                name: '',
            //                ready: false
            //            },
            //            3: {
            //                name: '',
            //                ready: false
            //            }
        },
        spectators: [],
        delCount: 0
    };
}


var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: 8080
    }),
    stateSystem = require('./ygojs-core.js'),
    deckvalidator = require('./deckvalidator.js'),
    configParser = require('./configparser.js'),
    games = {},
    states = {},
    log = {};

/**
 * Create a function that sorts to the correct viewers.
 * @param   {Object} game 
 * @returns {function} binding function
 */
function socketBinding(game) {

    /**
     * response handler
     * @param {object}   view  view definition set
     * @param {Array} stack of cards
     */
    function gameResponse(view, stack) {
        if (stateSystem[game] && view !== undefined) {
            if (stateSystem[game].players) {
                if (stateSystem[game].players[0]) {
                    if (stateSystem[game].players[0].slot === 0) {
                        stateSystem[game].players[0].send(JSON.stringify(view[stateSystem[game].players[0].slot]));
                    }
                }
                if (stateSystem[game].players[1]) {
                    if (stateSystem[game].players[1].slot === 1) {
                        stateSystem[game].players[1].send(JSON.stringify(view[stateSystem[game].players[1].slot]));
                    }
                }
                Object.keys(stateSystem[game].spectators).forEach(function (username) {
                    var spectator = stateSystem[game].spectators[username];
                    spectator.send(JSON.stringify(view.spectators));
                });
            }
        }
    }
    return gameResponse;
}

function nameBinding(game) {
    return function (view, stack) {
        wss.clients.forEach(function each(client) {
            if (client.activeduel === game) {
                if (view.names[0] === client.username && client.slot === 0) {
                    client.send(JSON.stringify(view[0]));
                } else if (view.names[1] === client.username && client.slot === 1) {
                    client.send(JSON.stringify(view[1]));
                } else {
                    client.send(JSON.stringify(view.spectators));
                }
            }
        });
    };
}


/**
 * Return a random string.
 * @param   {Number} len Length of resulting string
 * @returns {String} random string
 */
function randomString(len) {
    var i,
        text = "",
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (i = 0; i < len; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}



wss.broadcast = function broadcast() {
    Object.keys(games).forEach(function (key) {
        if (games[key].player[0].name === '' && games[key].player[1].name === '') {
            games[key].delCount++;
        }
        if (games[key].delCount > 10) {
            delete games[key];
        }

    });
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify({
            action: 'broadcast',
            data: games,
            username: client.username
        }));
    });
};

function duelBroadcast(duel, message) {
    stateSystem[duel].players[0].send(JSON.stringify(message));
    stateSystem[duel].players[1].send(JSON.stringify(message));
}

function responseHandler(socket, message) {
    console.log(message);
    var generated,
        joined = false,
        player1,
        player2,
        ready,
        activeduel = socket.activeduel;
    if (!message.action) {
        return;
    }
    switch (message.action) {
    case "register":
        // need a registration system here.
        socket.username = message.name;
        break;
    case "host":
        generated = randomString(12);
        games[generated] = newGame();
        log[generated] = [];
        stateSystem[generated] = stateSystem(socketBinding(generated));
        games[generated].player[0].name = message.name;
        stateSystem[generated].players[0] = socket;
        stateSystem[generated].setNames(socket.username, 0);
        socket.activeduel = generated;
        wss.broadcast(games);
        socket.send(JSON.stringify({
            action: 'lobby',
            game: generated
        }));
        socket.slot = 0;

        setTimeout(function () {
            stateSystem[generated].duelistChat('Gamelist', 'Ending Duel');
            delete games[generated];
            delete stateSystem[generated];
        }, 5400000); // 90 mins.
        break;

    case "join":
        socket.slot = undefined;
        Object.keys(games[message.game].player).some(function (playerNo, index) {
            var player = games[message.game].player[playerNo];
            if (player.name !== '') {
                return false;
            }
            joined = true;
            player.name = message.name;
            stateSystem[message.game].players[index] = socket;
            stateSystem[message.game].setNames(socket.username, index);
            socket.slot = index;

            return true;
        });
        if (!joined) {
            stateSystem[message.game].spectators[message.name] = socket;
            if (games[message.game].started) {
                socket.send(JSON.stringify(stateSystem[message.game].generateView('start').spectators));
                socket.activeduel = message.game;
            }
        }
        games[message.game].delCount = 0;
        wss.broadcast(games);
        socket.send(JSON.stringify({
            action: 'lobby',
            game: message.game
        }));
        socket.activeduel = message.game;
        break;
    case "kick":
        if (socket.slot !== undefined) {
            if (socket.slot === 1) {
                games[activeduel].player[message.slot].name = '';
                games[activeduel].player[message.slot].ready = false;
                wss.broadcast(games);
            }
        }
        break;
    case "leave":
        socket.activeduel = undefined;
        if (socket.slot !== undefined) {
            games[activeduel].player[socket.slot].name = '';
            games[activeduel].player[socket.slot].ready = false;
        } else {
            message.game.spectators--;
            delete stateSystem[activeduel].spectators[message.name];
        }
        socket.slot = undefined;
        wss.broadcast(games);
        socket.send(JSON.stringify({
            action: 'leave'
        }));

        break;
    case "surrender":
        if (socket.slot !== undefined) {
            socket.send(JSON.stringify({
                action: 'surrender',
                by: socket.slot
            }));
            stateSystem[activeduel].surrender(games[activeduel].player[socket.slot].name);
            if (games[activeduel].mode === 1) {

                stateSystem[activeduel].players[0].send(JSON.stringify({
                    action: 'side',
                    deck: stateSystem[activeduel].decks[0]
                }));
                games[activeduel].player[0].ready = false;
                stateSystem[activeduel].players[1].send(JSON.stringify({
                    action: 'side',
                    deck: stateSystem[activeduel].decks[1]
                }));
                games[activeduel].player[1].ready = false;
            }

        }

        break;
    case "lock":
        if (socket.slot !== undefined) {
            //ready = deckvalidator(message.deck);

            try {

                message.validate = validateDeck(message.deck, banlist['2016.8.29 (TCG)'], database);
                if (message.validate) {
                    if (message.validate.error) {
                        console.log(message.validate.error);
                        socket.send(JSON.stringify({
                            action: 'error',
                            error: message.validate.error,
                            msg: message.validate.msg
                        }));
                        return;
                    }
                }
            } catch (error) {
                socket.send(JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    input: JSON.stringify(message)
                }));
            }

            console.log(message.validate);
            games[activeduel].player[socket.slot].ready = true;
            stateSystem[activeduel].lock[socket.slot] = true;

            stateSystem[activeduel].decks[socket.slot] = message.deck;
            socket.send(JSON.stringify({
                action: 'lock',
                result: 'success'
            }));
            wss.broadcast(games);
            if (games[activeduel].player[socket.slot].ready) {
                stateSystem[activeduel].duelistChat('Server', '<pre>' + games[activeduel].player[socket.slot].name + ' locked in deck.</pre>');
            }
            socket.send(JSON.stringify({
                action: 'slot',
                slot: socket.slot
            }));

        }

        break;
    case "start":
        if (socket.slot !== undefined) {
            player1 = stateSystem[activeduel].decks[0];
            player2 = stateSystem[activeduel].decks[1];
            stateSystem[activeduel].startDuel(player1, player2, true);
            games[activeduel].started = true;
            wss.broadcast(games);
        }
        break;
    case "moveCard":
        stateSystem[activeduel].setState(message.player, message.clocation, message.index, message.moveplayer, message.movelocation, message.moveindex, message.moveposition, message.overlayindex, message.uid);
        break;
    case "revealTop":
        stateSystem[activeduel].revealTop(socket.slot);
        break;
    case "revealBottom":
        stateSystem[activeduel].revealBottom(socket.slot);
        break;
    case "offsetDeck":
        stateSystem[activeduel].offsetZone(socket.slot, 'DECK');
        break;
    case "makeToken":
        stateSystem[activeduel].makeNewCard(message.location, message.player, message.index, message.position, message.id, message.index);
        break;
    case "removeToken":
        stateSystem[activeduel].removeCard(message.uid);
        break;
    case "revealDeck":
        stateSystem[activeduel].revealDeck(socket.slot);
        break;
    case "revealExcavated":
        stateSystem[activeduel].revealExcavated(socket.slot);
        break;
    case "revealExtra":
        stateSystem[activeduel].revealExtra(socket.slot);
        break;
    case "revealHand":
        stateSystem[activeduel].revealHand(socket.slot);
        break;
    case "viewDeck":
        stateSystem[activeduel].viewDeck(socket.slot, games[activeduel].player[socket.slot].name, socket.slot);
        break;
    case "viewExtra":
        stateSystem[activeduel].viewExtra(message.player, games[activeduel].player[socket.slot].name, socket.slot);
        break;
    case "viewExcavated":
        stateSystem[activeduel].viewExcavated(message.player, games[activeduel].player[socket.slot].name, socket.slot);
        break;
    case "viewGrave":
        stateSystem[activeduel].viewGrave(message.player, games[activeduel].player[socket.slot].name, socket.slot);
        break;
    case "viewBanished":
        stateSystem[activeduel].viewBanished(socket.slot, games[activeduel].player[socket.slot].name, socket.slot);
        break;
    case "viewXYZ":
        stateSystem[activeduel].viewXYZ(socket.slot, message.index, message.player);
        break;
    case "shuffleDeck":
        stateSystem[activeduel].shuffleDeck(socket.slot);
        break;
    case "shuffleHand":
        stateSystem[activeduel].shuffleHand(socket.slot);
        break;
    case "draw":
        stateSystem[activeduel].drawCard(socket.slot, 1);
        break;
    case "excavate":
        stateSystem[activeduel].excavateCard(socket.slot, 1);
        break;
    case "mill":
        stateSystem[activeduel].millCard(socket.slot, 1);
        break;
    case "millRemovedCard":
        stateSystem[activeduel].millRemovedCard(socket.slot, 1);
        break;
    case "millRemovedCardFaceDown":
        stateSystem[activeduel].millRemovedCardFaceDown(socket.slot, 1);
        break;
    case "addCounter":
        stateSystem[activeduel].addCounter(message.uid);
        break;
    case "flipDeck":
        stateSystem[activeduel].flipDeck(socket.slot);
        break;
    case "removeCounter":
        stateSystem[activeduel].removeCounter(message.uid);
        break;
    case "rollDie":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].rollDie(games[activeduel].player[socket.slot].name);
        } else {
            stateSystem[activeduel].rollDie(message.name);
        }
        break;
    case "flipCoin":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].flipCoin(games[activeduel].player[socket.slot].name);
        } else {
            stateSystem[activeduel].flipCoin(message.name);
        }
        break;
    case "chat":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].duelistChat(games[activeduel].player[socket.slot].name, message.chat);
        } else {
            stateSystem[activeduel].spectatorChat(message.name, message.chat);
        }
        break;
    case "nextPhase":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].nextPhase(message.phase);
        }
        break;
    case "nextTurn":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].nextTurn();
        }
        break;
    case "changeLifepoints":
        if (socket.slot !== undefined) {
            stateSystem[activeduel].changeLifepoints(socket.slot, message.amount);
        }
        break;
    case "revealHandSingle":
        stateSystem[activeduel].revealCallback([message.card], socket.slot, 'revealHandSingle');
        break;
    case "reveal":
        stateSystem[activeduel].revealCallback(stateSystem[activeduel].findUIDCollection(message.card.uid), socket.slot, 'revealHandSingle');
        break;
    case "getLog":
        if (stateSystem[activeduel]) {
            socket.send(JSON.stringify({
                action: 'log',
                log: log[activeduel]
            }));
        }
        break;
    case "attack":
        if (socket.slot !== undefined) {
            duelBroadcast(activeduel, {
                action: 'attack',
                source: message.source,
                target: message.target
            });
        }
        break;
    case "target":
        if (socket.slot !== undefined) {
            duelBroadcast(activeduel, {
                action: 'target',
                target: message.target
            });
        }
        break;

    default:
        break;
    }
    if (stateSystem[activeduel]) {
        log[activeduel].push(message);
    }
    if (socket.slot !== undefined && message.sound) {
        stateSystem[activeduel].players[0].send(JSON.stringify({
            action: 'sound',
            sound: message.sound
        }));
        stateSystem[activeduel].players[1].send(JSON.stringify({
            action: 'sound',
            sound: message.sound
        }));
    }

}


wss.on('connection', function (socket) {
    socket.send(JSON.stringify({
        action: 'broadcast',
        data: games
    }));
    socket.send(JSON.stringify({
        action: 'register'
    }));
    socket.on('message', function (message) {
        try {
            responseHandler(socket, JSON.parse(message));
        } catch (error) {
            console.log(error);
            socket.send(JSON.stringify({
                error: error.message,
                stack: error.stack,
                input: JSON.parse(message)
            }));
        }
    });
    socket.on('close', function (message) {
        try {
            responseHandler(socket, {
                action: 'leave'
            });
        } catch (error) {
            console.log(error);
        }
    });
});

var fs = require('fs');
fs.watch(__filename, function () {
    Object.keys(stateSystem).forEach(function (activeduel) {
        stateSystem[activeduel].duelistChat('Server', 'New Source Code detected, restarting server. Duel has ended.');
    });

    setTimeout(process.exit, 3000);
});

setInterval(wss.broadcast, 15000);