/**
 * Searches the properties file provided for item sets
 * and returns them in JSON format
 *
 * @param {Buffer} properties file
 * @returns {Object} JSON of the item sets
 */
function getItemSets(properties) {
    if (!(properties instanceof Buffer)) {
        throw new Error('Parsing the properties file requires a Buffer');
    }

    var itemSets = properties.slice(
        findStartingPosition(properties),
        findEndingPosition(properties)
    );

    return JSON.parse(itemSets.toString());
}

/**
 * Calculates the checksum of the JSON provided. This
 * assumes the JSON is in a valid format for the properties file.
 *
 * @param {Object} json of the item sets
 * @returns {Buffer} the calculated checksum
 */
function calculateChecksum(json) {
    var total = 83;
    var baseline = {value:32896};

    json.itemSets.forEach(function(itemSet, index) {
        // The order of these lines is critical
        total -= 128;
        total = addValueToTotal(608, total, baseline);
        total = addValueToTotal(itemSet.title.length * 2, total, baseline);

        if (index > 0) {
            total = addValueToTotal(2, total, baseline);
        }

        itemSet.associatedMaps.forEach(function(gameMapId) {
            total = addValueToTotal(2, total, baseline);
            total = addValueToTotal(gameMapId.toString().length * 2, total, baseline);
        });

        itemSet.associatedChampions.forEach(function(championId) {
            total = addValueToTotal(2, total, baseline);
            total = addValueToTotal(championId.toString().length * 2, total, baseline);
        });

        itemSet.blocks.forEach(function(block, index) {
            total = addValueToTotal(44, total, baseline);
            total = addValueToTotal(block.type.length * 2, total, baseline);

            if (index > 0) {
                total = addValueToTotal(2, total, baseline);
            }

            block.items.forEach(function(item, index) {
                total = addValueToTotal(46, total, baseline);

                if (index > 0) {
                    total = addValueToTotal(2, total, baseline);
                }
            });
        });

    });

    var checksum;
    if (total > 65535) {
        var maxIncreases = Math.floor((total - 65535) / 32768);
        total += maxIncreases * 0x8000;
        total += 0x808000;

        checksum = new Buffer(4);
        checksum.writeUInt32BE(total, 0);
        checksum = checksum.slice(1);
    } else if (total > 128) {
        checksum = new Buffer(2);
        checksum.writeUInt16BE(total, 0);
    } else {
        checksum = new Buffer(1);
        checksum.writeUInt8(total, 0);
    }

    return checksum;
}

function addValueToTotal(value, total, baseline) {
    if (total < 128 && value + total >= 128) {
        total += 0x8000;
    }

    total += value;
    while (total > baseline.value) {
        baseline.value += 256;
        total += 128;
    }

    return total;
}

function findStartingPosition(properties) {
    for (var i = 0; i < properties.length; i++) {
        if (properties.readUInt8(i) == 0x06) {
            if (properties.readUInt8(i + 3) == 0x7b) {
                return i + 3;
            }

            if (properties.readUInt8(i + 4) == 0x7b) {
                return i + 4;
            }
        }
    }

    throw new Error('Could not find any item sets. Please add one to use as a starting point');
}

function findEndingPosition(properties) {
    var endingPosition = null;
    var openBracketCount = 0;
    var closingBracketCount = 0;
    for (var i = 0; i < properties.length; i++) {
        if (properties.readUInt8(i) == 0x7b) {
            openBracketCount++;
        }
        if (openBracketCount > 0 && properties.readUInt8(i) == 0x7d) {
            closingBracketCount++;

            if (openBracketCount > 0 && openBracketCount == closingBracketCount) {
                if (endingPosition !== null) {
                    throw new Error('Found an unexpected number of custom item sets.  Aborting');
                }

                endingPosition = i + 1;
            }
        }
    }

    return endingPosition;
}

exports.calculateChecksum = calculateChecksum;
exports.getItemSets = getItemSets;
