const fs = require('fs');
const path = require('path');

let rulesText = '';
const rulesPath = path.join(__dirname, 'reviewRules.txt');
try {
  rulesText = fs.readFileSync(rulesPath, 'utf8');
} catch (err) {
  console.error('Error reading review rules:', err);
}

function buildReviewMessages(filePath, diffContent) {
  return [
    {
      text: `You are Cody, an AI coding assistant from Sourcegraph.

Review the following Java code diff and identify issues based on best practices from the book *Clean Code* by Robert C. Martin.

### Output format (strict JSON array):
[
  {
    "lines": "line numbers",
    "currentIssue": "description of the issue",
    "suggestion": "clear and practical fix"
  }
]

${rulesText}

### Diff (\`${filePath}\`):
\`\`\`diff:${filePath}
${diffContent.trim()}
\`\`\`

Respond ONLY with a JSON array of issues in the following format:
[{ "lines": "line numbers", "currentIssue": "description of the issue", "suggestion": "clear and practical fix" }].

If there are no issues, return: \`[]\`.

Do NOT include any markdown or other text.`,
      speaker: "human"
    },
    {
      text: "I am Cody, an AI coding assistant from Sourcegraph.",
      speaker: "assistant"
    }
  ];
}

module.exports = {
  buildReviewMessages,
};
