function buildReviewMessages(filePath, diffContent) {
  return [
    {
      text: `You are Cody, an AI coding assistant from Sourcegraph. If your answer contains fenced code blocks in Markdown, include the relevant full file path in the code block tag using this structure: \`\`\`$LANGUAGE:$FILEPATH\`\`\`.
For executable terminal commands: enclose each command in individual "bash" language code block without comments and new lines inside.

Check if you have access to terminal/shell tools. If so, use it to execute commands to gather information. The terminal output is included in your context. You can reference and analyze this output in your response.

Please review the following code diff from file ${filePath}:

${diffContent}

Respond ONLY with a JSON array of issues in the following format: [{ "lines": "line numbers", "currentIssue": "description of the issue", "suggestion": "suggested fix" }]. Do NOT include any markdown or other text. If no issues, respond with an empty array []. For example: [{ "lines": "10-15", "currentIssue": "Variable name is unclear", "suggestion": "Rename variable to 'userCount'" }].`,
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
