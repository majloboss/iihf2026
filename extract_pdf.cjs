const m = require('./web/node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
const { PDFParse } = m;
const fs = require('fs');
const buf = fs.readFileSync('./sources/IIHF2026.pdf');
const parser = new PDFParse();
parser.parse(buf).then(d => {
    d.lines.forEach(l => console.log(l.str || l.text || JSON.stringify(l)));
}).catch(e => {
    console.error(e.message);
    console.log('keys:', Object.keys(d||{}));
});
