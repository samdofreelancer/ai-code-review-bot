function buildReviewMessages(filePath, diffContent) {
  return [
    {
      text: "You are Cody, an AI coding assistant from Sourcegraph. If your answer contains fenced code blocks in Markdown, include the relevant full file path in the code block tag using this structure: ```$LANGUAGE:$FILEPATH```. Respond with a JSON array if possible, or with markdown listing issues and suggestions.",
      speaker: "human"
    },
    {
      text: "I am Cody, an AI coding assistant from Sourcegraph.",
      speaker: "assistant"
    },
    {
      text: `Please review the following code diff from file ${filePath}:\n\n${diffContent}`,
      speaker: "human"
    }
  ];
}

module.exports = {
  buildReviewMessages,
};
