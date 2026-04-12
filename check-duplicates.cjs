const fs = require('fs');
const csvText = fs.readFileSync('public/data/respostas.csv', 'latin1');
const firstLine = csvText.split('\n')[0];
const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

// Procurar colunas de José Bonifácio
const joseBonifacio = headers
  .map((h, i) => ({ header: h, index: i + 1 }))
  .filter(x => x.header.includes('Jos') && x.header.includes('Bonif'));

console.log('Colunas de José Bonifácio em respostas.csv:');
joseBonifacio.forEach(x => {
  console.log('  Coluna ' + x.index + ': ' + x.header);
});
