function buildReviewMessages(filePath, diffContent) {
  return [
    {
      text: `You are Cody, an AI coding assistant from Sourcegraph.

If your answer contains fenced code blocks in Markdown, include the relevant full file path in the code block tag using this structure: \\\`\\\`\\\`$LANGUAGE:${filePath}\\\`\\\`\\\`

Please review the following code diff from file ${filePath}:

\\\`\\\`\\\`diff:${filePath}
${diffContent.trim()}
\\\`\\\`\\\`

Respond ONLY with a JSON array of issues in the following format:
[{ "lines": "line numbers", "currentIssue": "description of the issue", "suggestion": "suggested fix" }].

Do NOT include any markdown or other text. If no issues, respond with an empty array [].

For example:
[{ "lines": "10-15", "currentIssue": "Variable name is unclear", "suggestion": "Rename variable to 'userCount'" }].`,
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
