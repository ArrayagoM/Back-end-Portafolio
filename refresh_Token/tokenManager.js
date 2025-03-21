const fs = require('fs');
const path = require('path');
const tokenPath = path.join(__dirname, 'tokens.json');

function getTokens() {
  if (fs.existsSync(tokenPath)) {
    try {
      const data = fs.readFileSync(tokenPath);
      return JSON.parse(data);
    } catch (err) {
      console.error('Error leyendo tokens:', err);
      return null;
    }
  }
  return null;
}

function saveTokens(tokens) {
  try {
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log('Tokens actualizados');
  } catch (err) {
    console.error('Error escribiendo tokens:', err);
  }
}

module.exports = { getTokens, saveTokens };
