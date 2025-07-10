const fs = require('fs');
const path = require('path');
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

async function writePayloadByFilePath(filePath, payload) {
  const outputDir = 'output';
  const outputFile = path.join(outputDir, 'payload.json');

  // Ensure output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true });

  let data = {};
  try {
    // Try reading the file if it exists
    const fileContent = await fs.promises.readFile(outputFile, 'utf8');
    data = JSON.parse(fileContent);
  } catch (err) {
    // If file doesn't exist, start with empty object
    if (err.code !== 'ENOENT') {
      console.error('Error reading payload file:', err);
      return;
    }
  }

  // Update or add the payload for the given filePath
  data[filePath] = JSON.parse(payload);

  // Write back to the file
  try {
    await fs.promises.writeFile(outputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('Payload successfully written/updated in output/payload.json');
  } catch (err) {
    console.error('Error writing payload to file:', err);
  }
}

async function reviewWithCody(filePath, diffContent, messages) {
  const payload = JSON.stringify({
    temperature: 0.2,
    topK: -1,
    topP: -1,
    model: 'anthropic::2024-10-22::claude-sonnet-4-latest',
    maxTokensToSample: 4000,
    messages
  });

  await writePayloadByFilePath(filePath, payload);
  console.log('Sending payload to Cody API:', payload);

  return new Promise((resolve, reject) => {
    const req = https.request(CODY_API_URL, {
      method: 'POST',
      headers: {
        ...CODY_HEADERS,
        'Content-Length': Buffer.byteLength(payload),
      }
    }, res => {
      if (res.statusCode === 429) {
        return reject(new Error('Rate limit hit: status code 429'));
      } else if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Unexpected status code: ${res.statusCode}`));
      }

      let fullResponse = '';
      res.setEncoding('utf8');

      res.on('data', chunk => {
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.deltaText) {
                fullResponse += parsed.deltaText;
              } else if (parsed.choices?.length) {
                parsed.choices.forEach(choice => {
                  if (choice.message?.content) {
                    fullResponse += choice.message.content;
                  }
                });
              }
            } catch (err) {
              console.warn('JSON parse error in stream:', err);
            }
          }
        }
      });

      res.on('end', () => {
        console.log('Full AI response:', fullResponse);

        let parsedJson = tryParseJson(fullResponse);
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
