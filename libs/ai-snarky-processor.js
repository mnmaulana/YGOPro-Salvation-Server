/*jslint plusplus : true*/
/*global console*/

var duel = {};
console.log('loaded');
var actionables;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function cleanstate(ygopro) {
    'use strict';
    ygopro.duel = {
        deckcheck: 0,
        draw_count: 0,
        lflist: 0,
        mode: 0,
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
            },
            2: {
                name: '',
                ready: false
            },
            3: {
                name: '',
                ready: false
            }
        },
        spectators: 0,
        turn: 0,
        turnOfPlayer: 0,
        phase: 0
    };
    ygopro.field = {
        0: {},
        1: {}
    };
}

function cardCollections(player) {
    'use strict';
    return {
        DECK: $('.p' + player + '.DECK').length,
        HAND: $('.p' + player + '.HAND').length,
        EXTRA: $('.p' + player + '.EXTRA').not('.overlayunit').length,
        GRAVE: $('.p' + player + '.GRAVE').length,
        REMOVED: $('.p' + player + '.REMOVED').length,
        SPELLZONE: 8,
        MONSTERZONE: 5
    };
}

function initiateNetwork_STOC(ygopro) {
    'use strict';
    ygopro.on('STOC_ERROR_MSG', function (data) {

    });
    ygopro.on('STOC_SELECT_HAND', function (data) {
        //Trigger RPS Prompt

    });
    ygopro.on('STOC_SELECT_TP', function (data) {

    });
    ygopro.on('STOC_SELECT_RESULT', function (data) {

    });
    ygopro.on('STOC_HAND_RESULT', function (data) {
        //Sissors = 1
        //Rock = 2
        //Paper = 3

    });
    ygopro.on('STOC_HS_WATCH_SIDE', function (data) {

    });
    ygopro.on('STOC_TP_RESULT', function (data) {

    });
    ygopro.on('STOC_CHANGE_SIDE', function (data) {

    });
    ygopro.on('STOC_WAITING_SIDE', function (data) {

    });
    ygopro.on('STOC_JOIN_GAME', function (data) {
        duel.banlist = data.banlist;
        duel.rule = data.rule;
        duel.mode = data.mode;
        duel.prio = data.prio;
        duel.deckcheck = data.deckcheck;
        duel.noshuffle = data.noshuffle;
        duel.startLP = data.startLP;
        duel.starthand = data.starthand;
        duel.drawcount = data.drawcount;
        duel.timelimit = data.timelimit;
        console.log(duel);
        //fire handbars to render the view.


    });
    ygopro.on('STOC_TYPE_CHANGE', function (data) {
        //remember who is the host, use this data to rotate the field properly.
        duel.ishost = data.ishost;
    });
    ygopro.on('STOC_DUEL_START', function (STOC_DUEL_START) {
        window.singlesitenav('duelscreen');
        //switch view from duel to duel field.
    });
    ygopro.on('STOC_DUEL_END', function (STOC_DUEL_START) {
        window.ws.close();
    });

    ygopro.on('STOC_REPLAY', function (data) {

    });
    ygopro.on('STOC_TIME_LIMIT', function (data) {

    });
    ygopro.on('STOC_CHAT', function (data) {
        var idmap = {
                0: window.duel.player[0].name,
                1: window.duel.player[1].name,
                2: window.duel.player[2].name,
                3: window.duel.player[3].name,
                //4: window.duel.player[4].name,
                //5: window.duel.player[5].name,
                7: 'Spectator',
                11: 'SYSTEM',
                12: 'SYSTEM',
                13: 'SYSTEM',
                14: 'SYSTEM',
                15: 'SYSTEM',
                16: '', //named spectator
                17: 'SYSTEM',
                18: 'SYSTEM'
            },
            n = (idmap[data.from] !== undefined) ? idmap[data.from] : '---';


    });
    ygopro.on('STOC_HS_PLAYER_ENTER', function (data) {
        //someone entered the duel lobby as a challenger.
        //slot them into the avaliable open duel slots.
        var i;
        for (i = 0; 3 > i; i++) {
            if (!duel.player[i].name) {
                duel.player[i].name = data.person;

                return;
            }
        }
    });
    ygopro.on('STOC_HS_WATCH_CHANGE', function (data) {
        //update the number of spectators.
        data.spectators = duel.spectators;
    });
    ygopro.on('STOC_HS_PLAYER_CHANGE', function (data) {
        //update to the names in the slots,
        //signals leaving also.
        var state = data.state,
            stateText = data.stateText,
            pos = data.changepos,
            previousName;
        if (data.pos > 3) {
            return;
        }
        if (data.state < 8) {
            previousName = String(duel.player[pos].name); //copy then delete...
            duel.player[state].name = previousName;
            duel.player[pos].name = '';
            duel.player[pos].ready = false;
            console.log('???');
        } else if (stateText === 'PLAYERCHANGE_READY') {
            duel.player[pos].ready = true;

        } else if (stateText === 'PLAYERCHANGE_NOTREADY') {
            duel.player[pos].ready = false;
        } else if (stateText === 'PLAYERCHANGE_LEAVE') {
            duel.player[pos].name = '';
            duel.player[pos].ready = false;
        } else if (stateText === 'PLAYERCHANGE_OBSERVE') {
            duel.player[pos].name = '';
            duel.player[pos].ready = false;
            duel.spectators++;
        }
    });

}

function initiateNetwork_MSG(ygopro) {
    'use strict';
    ygopro.on('MSG_RETRY', function (data) {
        //???
        console.log('An Error Occured');
        console.log('An error occured, no shit...');
    });
    ygopro.on('MSG_HINT', function (data) {
        //???
    });

    ygopro.on('MSG_WIN', function (data) {
        //???
        if (data.won) {
            console.log('You won!');
        } else {
            console.log('You lost');
        }
    });
    ygopro.on('MSG_START', function (data) {
        //set the LP.
        duel.isFirst = data.isFirst;
        duel.player[0].lifepoints = data.lifepoints1;
        duel.player[1].lifepoints = data.lifepoints2;

        //set the size of each deck
        //gui.StartDuel(data.lifepoints[0], data.lifepoints[1], data.deck[0], data.deck[1], data.extra[0], data.extra[0]);

        //double check that the screen is cleared.


    });
    ygopro.on('MSG_WAITING', function (data) {

    });
    ygopro.on('MSG_UPDATE_DATA', function (data) {
        //gui.UpdateData(data.player, data.fieldlocation, data.cards);
        //ygopro-core sent information about the state of a collection of related cards.
        //field[data.player][data.fieldmodel] = ???;
        //reimage field;
    });

    ygopro.on('MSG_UPDATE_CARD', function (data) {
        //ygopro-core sent information about the state of one specific card.
        //gui.UpdateCard(data.player, data.fieldlocation, data.index, data.card);
        //field[data.player][data.fieldmodel][data.index] = data.card;
        //redraw field;
    });
    ygopro.on('MSG_SELECT_BATTLECMD', function (data) {
        var list,
            i;
        window.actionables = {};
        window.idlecmd = data;
        window.idlelookup = [];
        for (list in data) {
            if (data.hasOwnProperty(list) && data[list] instanceof Array) {
                console.log('ok', data[list].length);
                for (i = 0; data[list].length > i; i++) {
                    console.log(data[list][i].code, list);
                    if (!window.actionables[data[list][i].code]) {
                        window.actionables[data[list][i].code] = [];
                    }
                    window.idlecmd[list][i].index = i;
                    window.actionables[data[list][i].code].push({
                        list: list,
                        index: i
                    });
                }
            }
        }
        if (!data.ep) {
            i++;
        }
        if (data.bp) {
            i++;
        }
    });
    ygopro.on('MSG_SELECT_IDLECMD', function (data) {
        var list,
            i;
        window.actionables = {};
        window.idlecmd = data;
        window.idlelookup = [];
        for (list in data) {
            if (data.hasOwnProperty(list) && data[list] instanceof Array) {
                console.log('ok', data[list].length);
                for (i = 0; data[list].length > i; i++) {
                    console.log(data[list][i].code, list);
                    if (!window.actionables[data[list][i].code]) {
                        window.actionables[data[list][i].code] = [];
                    }
                    window.idlecmd[list][i].index = i;
                    window.actionables[data[list][i].code].push({
                        list: list,
                        index: i
                    });
                }
            }
        }
        if (!data.ep) {
            $('#endphi').addClass('avaliable');
        }
        if (data.bp) {
            $('#battlephi').addClass('avaliable');
        }
    });
    ygopro.on('MSG_SELECT_EFFECTYN', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_YESNO', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_OPTION', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_CARD', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_CHAIN', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_PLACE', function (data) {
        var servermessage;
        if (data.respbuf) { //replace with if auto_placement = on;
            servermessage = makeCTOS('CTOS_RESPONSE', data.respbuf);
        } // else show field selector;

        window.ws.send(servermessage);
    });
    ygopro.on('MSG_SELECT_DISFIELD', function (data) {
        var servermessage;
        if (data.respbuf) { //replace with if auto_placement = on;
            servermessage = makeCTOS('CTOS_RESPONSE', data.respbuf);
        } // else show field selector;

        window.ws.send(servermessage);
    });
    ygopro.on('MSG_SELECT_POSITION', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_TRIBUTE', function (data) {
        //???
    });

    ygopro.on('MSG_SELECT_COUNTER', function (data) {
        //???
    });
    ygopro.on('MSG_SELECT_SUM', function (data) {
        //???
    });
    ygopro.on('MSG_SORT_CARD', function (data) {
        //???
    });
    ygopro.on('MSG_SORT_CHAIN', function (data) {
        //???
    });
    ygopro.on('MSG_CONFIRM_DECKTOP', function (data) {
        //???
    });
    ygopro.on('MSG_CONFIRM_CARDS', function (data) {
        //???
    });
    ygopro.on('MSG_SHUFFLE_DECK', function (data) {

    });
    ygopro.on('MSG_SHUFFLE_HAND', function (data) {
        //???
    });
    ygopro.on('MSG_REFRESH_DECK', function (data) {
        //???
    });
    ygopro.on('MSG_SWAP_GRAVE_DECK', function (data) {
        //gui.SwapGraveDeck();
    });
    ygopro.on('MSG_REVERSE_DECK', function (data) {
        //???
    });
    ygopro.on('MSG_DECK_TOP', function (data) {
        //???
    });
    ygopro.on('MSG_SHUFFLE_SET_CARD', function (data) {
        //???
    });
    ygopro.on('MSG_NEW_TURN', function (data) {
        //new turn, 
        duel.turn++;
        duel.turnOfPlayer = data.player;
        //refresh field
    });
    ygopro.on('MSG_NEW_PHASE', function (data) {
        duel.phase = data.phase;

        actionables = {};
    });
    ygopro.on('MSG_MOVE', function (data) {
        //use animation system in gui.js
        //gui.MoveCard(data.code, data.pc, data.pl, data.ps, data.pp, data.cc, data.cl, data.cs, data.cp);

    });
    ygopro.on('MSG_POS_CHANGE', function (data) {
        //??? might be extention of move command?
    });
    ygopro.on('MSG_SET', function (data) {
        //???
    });
    ygopro.on('MSG_SWAP', function (data) {
        //???
    });
    ygopro.on('MSG_FIELD_DISABLED', function (data) {
        //???
    });
    ygopro.on('MSG_SUMMONING', function (data) {
        //attempting to summon animation
        //data.code give the id of the card
    });
    ygopro.on('MSG_SUMMONED', function (data) {
        //???
    });
    ygopro.on('MSG_SPSUMMONING', function (data) {
        //special summoning animation with data
    });
    ygopro.on('MSG_SPSUMMONED', function (data) {
        //???
    });
    ygopro.on('MSG_FLIPSUMMONING', function (data) {
        //???
    });
    ygopro.on('MSG_FLIPSUMMONED', function (data) {
        //???
    });
    ygopro.on('MSG_CHAINING', function (data) {
        //gives a card location and card
    });
    ygopro.on('MSG_CHAINED', function (data) {
        //???
    });
    ygopro.on('MSG_CHAIN_SOLVING', function (data) {
        //???
    });
    ygopro.on('MSG_CHAIN_SOLVED', function (data) {
        //???
    });

    ygopro.on('MSG_CHAIN_END', function (data) {
        //???
    });
    ygopro.on('MSG_CHAIN_NEGATED', function (data) {
        //???
    });
    ygopro.on('MSG_CHAIN_DISABLED', function (data) {
        //???
    });
    ygopro.on('MSG_CARD_SELECTED', function (data) {
        //???
    });
    ygopro.on('MSG_RANDOM_SELECTED', function (data) {
        //???
    });
    ygopro.on('MSG_BECOME_TARGET', function (data) {
        //???
    });
    ygopro.on('MSG_DRAW', function (data) {
        var i = 0;
        //gui.DrawCard(data.player, data.count, data.cardslist);

        //due draw animation/update
    });
    ygopro.on('MSG_DAMAGE', function (data) {
        //???
    });
    ygopro.on('MSG_RECOVER', function (data) {
        //???
    });
    ygopro.on('MSG_EQUIP', function (data) {
        //???
    });
    ygopro.on('MSG_LPUPDATE', function (data) {
        //???
    });
    ygopro.on('MSG_UNEQUIP', function (data) {
        //???
    });
    ygopro.on('MSG_CARD_TARGET', function (data) {
        //???
    });
    ygopro.on('MSG_CANCEL_TARGET', function (data) {
        //???
    });
    ygopro.on('MSG_PAY_LPCOST', function (data) {
        //???
    });
    ygopro.on('MSG_ADD_COUNTER', function (data) {
        //???
    });
    ygopro.on('MSG_REMOVE_COUNTER', function (data) {
        //???
    });
    ygopro.on('MSG_ATTACK', function (data) {
        //???
    });
    ygopro.on('MSG_BATTLE', function (data) {
        //???
    });
    ygopro.on('MSG_ATTACK_DISABLED', function (data) {
        //???
    });
    ygopro.on('MSG_DAMAGE_STEP_START', function (data) {
        //???
    });
    ygopro.on('MSG_DAMAGE_STEP_END', function (data) {
        //???
    });
    ygopro.on('MSG_MISSED_EFFECT', function (data) {
        //???
    });
    ygopro.on('MSG_TOSS_COIN', function (data) {
        //???
    });
    ygopro.on('MSG_TOSS_DICE', function (data) {
        //???
    });
    ygopro.on('MSG_ANNOUNCE_RACE', function (data) {
        //???
    });
    ygopro.on('MSG_ANNOUNCE_ATTRIB', function (data) {
        //???
    });
    ygopro.on('MSG_ANNOUNCE_CARD', function (data) {
        //???
    });
    ygopro.on('MSG_ANNOUNCE_NUMBER', function (data) {
        //???
    });
    ygopro.on('MSG_CARD_HINT', function (data) {
        //???
    });
    ygopro.on('MSG_MATCH_KILL', function (data) {
        //???
    });
    ygopro.on('MSG_TAG_SWAP', function (data) {
        //???
    });
    ygopro.on('MSG_RELOAD_FIELD', function (data) {

    });








    ygopro.on('ERRMSG_DECKERROR', function (data) {
        //something is wrong with the deck you asked the server to validate!
        console.log(data.error);
        //gui.displayRPSSelector();
    });

}

module.exports = function (emmiter) {
    cleanstate(emmiter);
    initiateNetwork_STOC(emmiter)
    initiateNetwork_MSG(emmiter);
};