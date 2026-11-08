/* The start map (js/world1918.js) is made from these files. tools/build-world.js stores their hash in it,
   and tools/check.js fails when they have changed since, so the map is rebuilt with npm run world. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const WORLD_SRC = ['js/common.js', 'js/data.js', 'js/geo.js', 'js/land.js', 'js/geom.js', 'js/terrain.js', 'js/world.js'];
module.exports = root => { const h = crypto.createHash('sha1'); WORLD_SRC.forEach(f => h.update(fs.readFileSync(path.join(root, f)))); return h.digest('hex').slice(0, 12); };
module.exports.WORLD_SRC = WORLD_SRC;
