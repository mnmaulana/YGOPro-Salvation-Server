/* jslint node : true */
/* jslint browser : true */
/* global ygopro, $, isChecked, alert, Primus, console, process, applySettings, prompt, confirm */
/* exported joinGamelist, leaveGamelist, hostGame, connectgamelist, enterGame, setHostSettings, gui*/
console.log('loading server launcher js');
applySettings();
/* jslint node : true */
var developmentstage = {
    "production": "http://ygopro.us/launcher.html",
    "stage": "http://dev.ygopro.us/launcher.html",
    "development": "http://127.0.0.1:8080/launcher.html"
};
var sitelocationdir = {
    "production": "http://ygopro.us",
    "stage": "http://dev.ygopro.us",
    "development": "http://127.0.0.1:8080/"
};
var mode = "production";
var gamelistcache;

if (mode === 'development') {
    try {
        require('nw.gui').Window.get().showDevTools();
    } catch (error) {}
}
var siteLocation = sitelocationdir[mode];
var os = require('os');
process.on('uncaughtException', function (err) {
    console.log(err);
    screenMessage.text(randomErrors[Math.floor(Math.random() * (6 - 0))]);
});
var http = require('http');
var fs = require('fs');
var gui = require('nw.gui');
//var unzip = require('unzip');

var randomErrors = ['Error: My face is up here buddy!',
                   'Error: My boobies hurt!',
                   'Error: I want icecream!',
                   'Error: The cards stole my heart.',
                   'Error: Are you cheating on me with another Sim?',
                   'Error: You never listen to me!'];

var randomWarnings = ['Warning : Parent over shoulder',
                      'Warning : You are trying to hard.',
                      'Warning : Youre,... dirty...',
];

var manifest = '';

function createmanifest() {
    screenMessage.text('Downloading Manifest');
    var dlattempt = $.getJSON('http://ygopro.us/manifest/ygopro.json', function (data) {
        manifest = data;
        console.log(manifest);
        updateCheckFile(manifest, true);
    }).fail(function(){
        screenMessage.text('Failed to get mainfest');
    });
}


$(document).on('ready', function () {
    localStorage.lastip = '192.99.11.19';
    localStorage.serverport = '8911';
    localStorage.lastport = '8911';
    locallogin(true);
    createmanifest();

});


process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
var completeList = [];


function updateCheckFile(file, initial) {
    screenMessage.text('Processing manifest');
    if (file.type !== 'folder') {

        completeList.push(file);
    } else if (file.type === 'folder') {
        for (var i = 0; file.subfolder.length > i; i++) {
            try {
                fs.mkdirSync(file.path);
            } catch (e) {}
            updateCheckFile(file.subfolder[i], false);
        }

    }
    if (initial) {
        console.log(completeList);
        hashcheck();
    }
}
var screenMessage = $('#servermessages');

var downloadList = [];

function hashcheck() {
    if (completeList.length === 0) {
        download();
    }
    var target = completeList[0];
    if (target) {
        if (target.path) {
            fs.stat(target.path, function (err, stats) {
                if (err) {
                    //bad file keep going and add it.
                    downloadList.push(target);
                    completeList.shift();
                    hashcheck();
                    return;
                }
                //screenMessage.text('Analysing...' + target.path);

                if (stats.size !== target.size) {
                    //console.log(stats.size, target.checksum, target.path);
                    downloadList.push(target);
                }
                completeList.shift();
                hashcheck();
            });
        }
    }
}

function download() {
    if (downloadList.length === 0) {
        screenMessage.text('Update Complete! System Messages will appear here.');
        if (os.platform() === 'linux') {
            fs.chmod('ygopro/application_ygopro', '0777', function (error) {
                if (error) console.log(error);
            }); // creates race condition requiring launcher restart.
        }
        return;
    }
    var target = downloadList[0];
    var additionaltext = '.';
    if (downloadList.length > 250) {
        additionaltext = ', this will take a while please be patient!';
    }
    screenMessage.text('Updating...' + target.path + ' and ' + downloadList.length + ' other files' + additionaltext);

    var file = fs.createWriteStream(target.path);
    var jqxhr = $.get('http://ygopro.us/' + target.path, function (filedata) {
            file.write(filedata);
            file.end();
            downloadList.shift();
            setTimeout(function () {
                download();
            }, 0);
        })
        .fail(function () {
            screenMessage.text('Unable to download and update '+target.path+', sorry.');
            file.end();
            downloadList.shift();
            setTimeout(function () {
                download();
            }, 1000);
        });
}

$('#servermessages').text('Server Messages will spawn here.');


var primus = Primus.connect('http://salvationdevelopment.com:24555');

function joinGamelist() {
    primus.write({
        action: 'join'
    });
}

function leaveGamelist() {
    primus.write({
        action: 'leave'
    });
}

function hostGame(parameters) {
    primus.write({
        serverEvent: 'hostgame',
        format: parameters
    });
}


function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomstring = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomstring += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomstring;
}

function getDuelRequest() {
    return {
        string: "" + $('#creategamecardpool').val() + $('#creategameduelmode').val() + $('#creategametimelimit').val(),
        prio: isChecked('#enableprio') ? ("F") : ("O"),
        checkd: isChecked('#discheckdeck') ? ("F") : ("O"),
        shuf: isChecked('#disshuffledeck') ? ("F") : ("O"),
        stnds: "," + $('#creategamebanlist').val() + ',5,1,U,',
        pass: randomString(5)
    };
}

function setHostSettings() {

    var duelRequest = getDuelRequest();
    localStorage.roompass =
        duelRequest.string + duelRequest.prio +
        duelRequest.checkd + duelRequest.shuf +
        $('#creategamelp').val() + duelRequest.stnds +
        duelRequest.pass;

    localStorage.lastip = '192.99.11.19';
    localStorage.serverport = '8911';
    localStorage.lastport = '8911';

    if (!secure(duelRequest.prio, duelRequest.checkd, duelRequest.shuf)) {
        return;
    }
    localStorage.lastdeck = $('#currentdeck').val();
    ygopro('-j');
}

function secure(prio, checkd, shuf) {
    if (prio + checkd + shuf !== "OOO" && $('input:radio[name=ranked]:checked').val() === 'R') {
        alert('You may not cheat here.');
        return false;
    }
    if ($('#creategamecardpool').val() === 2 && $('input:radio[name=ranked]:checked').val() === 'R') {
        alert('OCG/TCG is not a valid mode for ranked, please select a different mode for ranked play');
        return false;
    }
    return true;
}

function connectgamelist() {
    primus.write({
        action: 'join'
    });
}
primus.on('data', function (data) {
    console.log(data);
    if (!data.clientEvent) {
        gamelistcache= JSON.parse(data);
        renderList(gamelistcache);
        
    }
    switch (data.clientEvent) {
    case ('serverMessage'):
        {
            $('#servermessages').text(data.serverMessage);
        }
        break;

    case ('duelRequest'):
        {
            var accept = prompt('Take duel?');
            if (accept) {
                enterGame(data.clientEvent.room);
            }
        }
        break;

    case ('die'):
        {
            alert(data.clientEvent.message);
            $('body').html('');
        }
        break;

    }
});



function parseDuelOptions(duelOptions) {
    var duelOptionsParts = duelOptions.split(',');

    var settings = { //Determine time limit
        timeLimit: (duelOptionsParts[0][2] === '0') ? '3 minutes' : '5 minutes',
        //Use classic TCG rules?
        isTCGRuled: (duelOptionsParts[0][3] === 'O') ? 'OCG rules' : 'TCG Rules',

        //Check Deck for Illegal cards?
        isDeckChecked: (duelOptionsParts[0][4] === 'O') ? 'Check' : 'Dont Check',

        //Shuffle deck at start?
        isShuffled: (duelOptionsParts[0][5] === 'O') ? 'Shuffle' : 'Dont Shuffle',

        //Choose Starting Life Points
        lifePoints: duelOptionsParts[0].substring(6),

        //Determine Banlist
        banList: parseInt(duelOptionsParts[1], 10),

        //Select how many cards to draw on first hand
        openDraws: duelOptionsParts[2],

        //Select how many cards to draw each turn
        turnDraws: duelOptionsParts[3],

        //Choose whether duel is ranked
        isRanked: (duelOptionsParts[4] === 'U') ? 'Unranked' : 'Ranked',

        //Copy password
        password: duelOptionsParts[5],
    };

    

    //Determine allowed cards
    if (duelOptionsParts[0][0] === '0') {
        settings.allowedCards = 'tcg';
    }
    if (duelOptionsParts[0][0] === '1') {
        settings.allowedCards = 'ocg';
    }
    if (duelOptionsParts[0][0] === '2') {
        settings.allowedCards = 'tcg/ocg';
    }

    //Determine game mode
    if (duelOptionsParts[0][1] === '0') {
        settings.gameMode = 'single';
    }
    if (duelOptionsParts[0][1] === '1') {
        settings.gameMode = 'match';
    }
    if (duelOptionsParts[0][1] === '2') {
        settings.gameMode = 'tag';
    }

    if (settings.gameMode === 'single' ||
        settings.gameMode === 'match') {

    }

    return settings;

}
//$('#filercardpool option:selected').val()


function parseFilters() {

    var settings = { 
        //timeLimit: ($('#filtertimelimit option:selected').val() == 3) ? '3 minutes' : '5 minutes',

        //Determine Banlist
        banList: parseInt($('#filterbanlist option:selected').val()),

        //Choose whether duel is ranked
        //isRanked: (duelOptionsParts[4] === 'U') ? 'Unranked' : 'Ranked',

    };

    //Determine time limit
    if ($('#filtertimelimit option:selected').val() == '0') {
        settings.timeLimit = 'All';
    }
    if ($('#filtertimelimit option:selected').val() == '3') {
        settings.timeLimit = '3 minutes';
    }
    if ($('#filtertimelimitoption:selected').val() == '5') {
        settings.timeLimit = '5 minutes';
        
    }
    
    //Determine allowed cards
    if ($('#filercardpool option:selected').val() == '0') {
        settings.allowedCards = 'tcg';
    }
    if ($('#filercardpool option:selected').val() == '1') {
        settings.allowedCards = 'ocg';
    }
    if ($('#filercardpool option:selected').val() == '2') {
        settings.allowedCards = 'tcg/ocg';
        
    }
    if ($('#filercardpool option:selected').val() == '3') {
        settings.allowedCards = 'anime';
    }
    if ($('#filercardpool option:selected').val() == '4') {
        settings.allowedCards = 'All';
    }

    //Determine game mode
    if ($('#filterroundtype option:selected').val() == '0'){
        settings.gameMode = 'single';
    }
    if ($('#filterroundtype option:selected').val() == '1') {
        settings.gameMode = 'match';
    }
    if ($('#filterroundtype option:selected').val() == '2') {
        settings.gameMode = 'tag';
    }
    if ($('#filterroundtype option:selected').val() == '3') {
        settings.gameMode = 'All';
    }
    settings.userName = $('#filterusername').val();


    return settings;

}

function setfilter() {
    renderList(gamelistcache);
    
}


var openid = '';

function closeAllScreens() {
    $('#salvationdevelopment').css('display', 'block');
    $('#staticbar section').css('display', 'none');
    openid = '';
}

function openScreen(id) {
    if (id === openid) {
        closeAllScreens();
        return;
    }
    closeAllScreens();
    $('#salvationdevelopment').css('display', 'none');
    $(id).toggle();
    id = openid;
    return;
}
//{"200OOO8000,0,5,1,U,PaS5w":{"port":8000,"players":[],"started":false}}

function enterGame(string) {
    localStorage.lastdeck = $('#currentdeck').val();
    localStorage.roompass = string;
    ygopro('-j');
}
//primus.write({
//    action: 'join'
//});
var banlist_names = ['TCG-Current', 'OCG-Current', 'Something older'];

function renderList(JSONdata) {
    var filterm = parseFilters();
    $('#gamelist').html('');
    for (var rooms in JSONdata) {
        if (JSONdata.hasOwnProperty(rooms)) {
            var OK = true;
            var player1 = JSONdata[rooms].players[0] || '___';
            var player2 = JSONdata[rooms].players[2] || '___';
            var player3 = JSONdata[rooms].players[3] || '___';
            var player4 = JSONdata[rooms].players[4] || '___';
            var duelist;
            var translated = parseDuelOptions(rooms);
            var players= [player1,player2,player3,player4];
            
            if (translated.gameMode != filterm.gameMode && filterm.gameMode != 'All'){
                OK=false;
            }
            if (translated.allowedCards != filterm.allowedCards && filterm.allowedCards != 'All'){
                OK=false;
            }
            if (translated.timeLimit != filterm.timeLimit && filterm.timeLimit != 'All'){
                OK=false;

            }
            if (translated.banList != filterm.banList && filterm.banList != '20'){
                OK=false;
            }
            if (players.searchFor(filterm.userName) === -1){
                OK=false;
            }
            if(OK){
                if (translated.gameMode === 'single' ||
                    translated.gameMode === 'match') {
                    duelist = player1 + ' vs ' + player2;
                } else {
                    duelist = player1 + '&amp' + player2 + ' vs ' + player3 + '&amp' + player4;
                }
                console.log(translated);
                var content = '<div class="game" onclick=enterGame("' + rooms + '")>' +
                    duelist + '<span class="subtext" style="font-size:.5em"><br>' + translated.allowedCards + '  ' +        translated.gameMode +
                    ' ' + banlist_names[translated.banlist] + '</span></div>';

                $('#gamelist').append(content);
            }
        }
    }
}

function set(list) {
    var filter = {
        banlist: $('#creategamebanlist').val()
    };
}



function populatealllist() {
    fs.readdir('./ygopro/deck', function (error, deckfilenames) {
        $('#currentdeck').html('');
        for (var dfiles = 0; deckfilenames.length > dfiles; dfiles++) {
            var deck = deckfilenames[dfiles].replace('.ydk', '');
            $('#currentdeck').append('<option value="' + deck + '">' + deck + '</option>');
        }
    });
    fs.readdir('./ygopro/skins', function (error, skinfilenames) {
        $('#skinlist').html('');
        for (var sfiles = 0; skinfilenames.length > sfiles; sfiles++) {
            $('#skinlist').append('<option value="' + skinfilenames[sfiles] + '">' + skinfilenames[sfiles] + '</option>');
        }
    });
}

function locallogin(init) {
    localStorage.nickname = localStorage.nickname || '';
    if (localStorage.nickname) {
        if (localStorage.nickname.length < 1 || init === true) {
            var username = prompt('Username: ', localStorage.nickname);
            while (!username) {
                username = prompt('Username: ', localStorage.nickname);
            }
            localStorage.nickname = username;
        }
    }
}

Array.prototype.searchFor = function(candid) {
    for (var i=0; i<this.length; i++)
        if (this[i].toLowerCase().indexOf(candid.toLowerCase()) == '0')
            return i;
    return -1;
};

populatealllist();