import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('./web/node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
const buf = readFileSync('./sources/IIHF2026.pdf');
const data = await pdfParse(buf);
console.log(data.text);
