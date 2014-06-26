var fs = require('fs');
var should = require('should');

var SummonerPreferences = require('../lib/index');

var validFile = fs.readFileSync('test/summoner-preferences-valid-file.properties');
var validFileItemSets = {
    'itemSets':[
    {
        'uid':'LOL_7962AA86-44CC-5D6F-4959-B68C8B1D0888',
        'type':'custom',
        'associatedChampions':[],
        'mode':'any',
        'sortrank':0,
        'associatedMaps':[],
        'map':'any',
        'title':'Custom Item Set 1',
        'blocks':[
        {
            'items':[],
            'type':'starting'
        }
        ],
        'isGlobalForMaps':true,
        'priority':false,
        'isGlobalForChampions':true
    }
    ],
    'timeStamp':1402018653132
};

describe('SummonerPreferences', function() {
    describe('getItemSets(Buffer fileData)', function() {
        it('throws an error if it does not receive a Buffer', function() {
            (function() {
                SummonerPreferences.getItemSets('hi');
            }).should.throw('Parsing the properties file requires a Buffer');
        });

        it('returns the JSON of the item sets', function() {
            var itemSets = SummonerPreferences.getItemSets(validFile);
            itemSets.should.containEql(validFileItemSets);
        });

        it('throws an error if the item sets cannot be found', function() {
            (function() {
                SummonerPreferences.getItemSets(new Buffer('hi'));
            }).should.throw('Could not find any item sets. Please add one to use as a starting point');
        });

        it('throws an error if it detects two or more possible item sets', function() {
            // Start(0x06), Checksum (0x88 0x88), {}, then find a random open and closing bracket
            var data = [0x06, 0x88, 0x88, 0x7b, 0x7d, 0x7b, 0x7d];

            (function() {
                SummonerPreferences.getItemSets(new Buffer(data));
            }).should.throw('Found an unexpected number of custom item sets.  Aborting');
        });

        it('ignores random closing brackets read prior to the item sets', function() {
            // Random Closing Bracket, Start(0x06), Checksum (0x88 0x88), {}, Unrelated Info(0x88)
            var data = [0x7d, 0x06, 0x88, 0x88, 0x7b, 0x7d, 0x88];
            var itemSetBuffer = new Buffer([0x7b, 0x7d]);
            var expectedItemSets = JSON.parse(itemSetBuffer.toString());

            var itemSets = SummonerPreferences.getItemSets(new Buffer(data));
            itemSets.should.containEql(expectedItemSets);
        });

        it('returns the JSON of the item sets even if the checksum has 0x7b (open curly bracket) as a value');
        it('returns the JSON of the item sets even if they are completely blank');
    });

    describe('calculateChecksum(itemSetsJson)', function() {
        it('returns a 1 byte Buffer representing 83 for an empty item set', function() {
            var checksum = SummonerPreferences.calculateChecksum(getBaseItemSet());
            checksum.should.match(new Buffer([0x53]));
        });

        it('increases the checksum by 0x8000 once a 2nd byte is required (aka immediately)', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33843));
        });

        it('increases by 608 for the 1st empty custom item set', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33843));
        });

        it('increases by 610 for an empty custom item set', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addCustomItemSet(itemSets, '');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34837));
        });

        it('increases by 44 for the 1st block', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addBlockToItemSet(itemSets.itemSets[0], '');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33887));
        });

        it('increases by 2 per character in the block type', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addBlockToItemSet(itemSets.itemSets[0], '1');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33889));
        });

        it('increases by 2 per character in the item set title', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, 'Custom');

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33855));
        });

        it('increases by 128 for every 256th value after 32896 (assumming the first 83 and 0x8000 increase were already implemented', function() {
            var itemSets = getBaseItemSet();

            addCustomItemSet(itemSets, 'Custom Item Set 1');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33877));

            addCustomItemSet(itemSets, 'Custom Item Set 2');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34905));

            addCustomItemSet(itemSets, 'Custom Item Set 3');
            addCustomItemSet(itemSets, 'Custom Item Set 4');
            addCustomItemSet(itemSets, 'Custom Item Set 5');
            addCustomItemSet(itemSets, 'Custom Item Set 6');
            addCustomItemSet(itemSets, 'Custom Item Set 7');
            addCustomItemSet(itemSets, 'Custom Item Set 8');
            addCustomItemSet(itemSets, 'Custom Item Set 9');
            addCustomItemSet(itemSets, 'Custom Item Set 10');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(43131));

            // THIS IS AN UNIQUE CASE WHERE IT INCREMENTS BY 4 * 128 INSTEAD OF 3 * 128
            addCustomItemSet(itemSets, 'Custom Item Set 11');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(44289));
        });

        it('increases by 46 for a block', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061));

            addBlockToItemSet(itemSets.itemSets[0], '');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34107));
        });

        it('increases by 2 per digit in a map ID + 2 for each map', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, 'Custom');
            addBlockToItemSet(itemSets.itemSets[0], '1234');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33907));

            addMapToItemSet(itemSets.itemSets[0], 1);
            addMapToItemSet(itemSets.itemSets[0], 8);
            addMapToItemSet(itemSets.itemSets[0], 10);
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34049));
        });

        it('increases by 2 per digit in a champion ID + 2 for each champion', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, 'Custom');
            addBlockToItemSet(itemSets.itemSets[0], '1234');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(33907));

            addChampionToItemSet(itemSets.itemSets[0], 1);
            addChampionToItemSet(itemSets.itemSets[0], 8);
            addChampionToItemSet(itemSets.itemSets[0], 10);
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34049));
        });

        it('increases by 46 for the 1st item in a block', function() {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061));

            addItemToBlock(itemSets.itemSets[0].blocks[0], 3000);
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061 + 46));
        });

        it('increases by 48 for each item in the block after the 1st', function () {
            var itemSets = getBaseItemSet();
            addCustomItemSet(itemSets, '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            addBlockToItemSet(itemSets.itemSets[0], '');
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061));

            addItemToBlock(itemSets.itemSets[0].blocks[0], 3000);
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061 + 46));

            addItemToBlock(itemSets.itemSets[0].blocks[0], 3000);
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(34061 + 46 + 48));
        });

        it('increases by 0x808000 after reaching the value 0xffff', function() {
            var itemSets = getBaseItemSet();
            for (var i = 1; i <= 37; i++) {
                addCustomItemSet(itemSets, 'Custom Item Set ' + i);
                addBlockToItemSet(itemSets.itemSets[i - 1], 'starting');
            }

            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(8496969));
        });

        it('increases by 0x8000 every 0xffff thereafter', function() {
            var itemSets = getBaseItemSet();
            for (var i = 1; i <= 65; i++) {
                addCustomItemSet(itemSets, 'Custom Item Set ' + i);
            }
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(8554309));

            itemSets = getBaseItemSet();
            for (var j = 1; j <= 95; j++) {
                addCustomItemSet(itemSets, 'Custom Item Set ' + j);
            }
            SummonerPreferences.calculateChecksum(itemSets).should.match(expectedChecksumOf(8618105));
        });
    });
});

function getBaseItemSet() {
    return {'itemSets':[],'timeStamp':1402323520721};
}

function addCustomItemSet(data, title) {
    data.itemSets.push({
        'sortrank':0,
        'blocks':[],
        'isGlobalForMaps':true,
        'mode':'any',
        'isGlobalForChampions':true,
        'associatedMaps':[],
        'map':'any',
        'title': title,
        'uid':'LOL_4A10C341-090D-0A22-4209-ECE41F1DB04F',
        'associatedChampions':[],
        'type':'custom',
        'priority':false
    });
}

function addBlockToItemSet(itemSet, type) {
    itemSet.blocks.push({
        'items':[],
        'type':type
    });
}

function addItemToBlock(block, itemId) {
    block.items.push({
        'count':1,
        'id':itemId
    });
}

function addMapToItemSet(itemSet, mapId) {
    itemSet.associatedMaps.push(mapId);
    itemSet.isGlobalForMaps = false;
}

function addChampionToItemSet(itemSet, champId) {
    itemSet.associatedChampions.push(champId);
    itemSet.isGlobalForChampions = false;
}

function expectedChecksumOf(value) {
    var expectedChecksum = null;
    if (value > 65535) {
        expectedChecksum = new Buffer(4);
        expectedChecksum.writeUInt32BE(value, 0);
        return expectedChecksum.slice(1);
    } else {
        expectedChecksum = new Buffer(2);
        expectedChecksum.writeUInt16BE(value, 0);
    }

    return expectedChecksum;
}