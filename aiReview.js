const https = require('https');

const CODY_API_URL = 'https://sourcegraph.com/.api/completions/stream?api-version=9&client-name=web&client-version=0.0.1';
const CODY_API_TOKEN = process.env.CODY_API_TOKEN || '';

const CODY_HEADERS = {
  'Authorization': `token ${CODY_API_TOKEN}`,
  'Content-Type': 'application/json',
};

function tryParseJson(text) {
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
  } catch (e) {}
  return null;
}

function extractIssuesFromMarkdown(markdown) {
  const issues = [];
  const issuePattern = /\*\*Line[s]?:?\s*(\d+-?\d*)\*\*\s*[:-]?\s*(.*?)\n+Suggestion:?\s*(.*?)\n+/gis;
  let match;
  while ((match = issuePattern.exec(markdown)) !== null) {
    issues.push({
      lines: match[1].trim(),
      currentIssue: match[2].trim(),
      suggestion: match[3].trim()
    });
  }
  return issues.length > 0 ? issues : [{ lines: "N/A", currentIssue: "Raw response", suggestion: markdown }];
}

async function reviewWithCody(filePath, diffContent, messages) {
  const payload = JSON.stringify({
    temperature: 0.2,
    topK: -1,
    topP: -1,
    model: "anthropic::2024-10-22::claude-sonnet-4-latest",
    maxTokensToSample: 4000,
    messages
  });

  console.log('Sending payload to Cody API:', payload);

  return new Promise((resolve, reject) => {
    const req = https.request(CODY_API_URL, {
      method: 'POST',
      headers: {
        ...CODY_HEADERS,
        'Content-Length': Buffer.byteLength(payload),
      }
    }, res => {
      let fullResponse = '';

      res.setEncoding('utf8');
      res.on('data', chunk => {
        // Cody SSE stream: split on newlines, capture "data: {json}"
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.deltaText) {
                fullResponse += parsed.deltaText;
              }
            } catch (err) {
              console.warn('JSON parse error in stream:', err);
            }
          }
        }
      });

      res.on('end', () => {
        console.log('Full AI response:', fullResponse);

        // Attempt to parse as JSON directly
        let parsedJson = tryParseJson(fullResponse);

        // If not valid, try extracting JSON array manually
        if (!parsedJson) {
          try {
            const jsonStart = fullResponse.indexOf('[');
            const jsonEnd = fullResponse.lastIndexOf(']');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              const jsonString = fullResponse.substring(jsonStart, jsonEnd + 1);
              parsedJson = JSON.parse(jsonString);
            }
          } catch (e) {
            console.error('Failed to extract JSON array from stream:', e);
          }
        }

        // If still not JSON, fall back to markdown parsing
        if (parsedJson) {
          resolve({ issues: parsedJson });
        } else {
          const issues = extractIssuesFromMarkdown(fullResponse);
          resolve({ issues });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = {
  reviewWithCody,
  tryParseJson,
  extractIssuesFromMarkdown,
};
