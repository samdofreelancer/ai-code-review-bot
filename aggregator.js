const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'output';
const RESULT_FILE = path.join(OUTPUT_DIR, 'review-result.json');

function saveResults(results) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
}

module.exports = {
  saveResults,
};
