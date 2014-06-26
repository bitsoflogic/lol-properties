lol-properties
==============

A reverse engineered way to modify the League of Legends properties file

# Features

* Extracts custom item sets from the properties file
* Calculates the checksum associated with custom item sets.  This is necessary for modifying the file's contents.

If you find this project is useful, let me know and I'd be happy to add setter functions to do the heavy lifting for modifying the file's contents.

# Example

```
var fs = require('fs');
var Properties = require('lol-properties');

var file = fs.readFileSync('test.properties');

// Item sets in JSON format
var itemSets = Properties.getItemSets(file);

// Buffer of the checksum
var checksum = Properties.calculateChecksum(itemSets);
```

# Known Issues / Limitations

* Checksums that contain 0x7b (an open curly bracket `{`) will fail to be parsed
* The methods above do not work for properties files without any item sets.  At least one must be present