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

### Rules for Review:
Follow these principles from *Clean Code*:
1. **Meaningful Names**  
   - Use descriptive variable, method, and class names. Avoid abbreviations and vague terms.
2. **Functions Should Be Small and Do One Thing**  
   - Methods should be short, focused, and do only one task.
3. **Avoid Too Many Parameters**  
   - Prefer object encapsulation if a method has too many arguments.
4. **Code Should Be Expressive**  
   - Don't rely on comments to explain complex logic. Make the code self-explanatory.
5. **Avoid Duplication**  
   - Eliminate repeated code; use reusable methods or abstractions.
6. **Error Handling Should Not Obscure Logic**  
   - Try-catch blocks should not hide business logic.
7. **Classes Should Have a Single Responsibility**  
   - Each class should have one clear purpose.
8. **Keep Side Effects Minimized**  
   - Functions should not have unexpected side effects (e.g., modifying global state).
9. **Avoid Magic Numbers and Strings**  
   - Replace literals with named constants or enums.
10. **Consistency and Formatting**  
   - Use consistent indentation, blank lines, and access modifiers.

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
