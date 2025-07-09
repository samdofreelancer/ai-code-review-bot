require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- CONFIGURATION ---
const OUTPUT_DIR = 'output';
const DIFF_DIR = path.join(OUTPUT_DIR, 'diffs');
const RESULT_FILE = path.join(OUTPUT_DIR, 'review-result.json');
const CODY_API_URL = 'https://sourcegraph.com/.api/completions/stream?api-version=9&client-name=web&client-version=0.0.1';
const CODY_API_TOKEN = process.env.CODY_API_TOKEN || '';

const CODY_HEADERS = {
  'Authorization': `token ${CODY_API_TOKEN}`,
  'Content-Type': 'application/json',
};

// --- UTILITY FUNCTIONS ---
function execGit(command) {
  return execSync(command, { encoding: 'utf-8' }).trim();
}

function getChangedFiles(targetBranch, featureBranch) {
  return execGit(`git diff --name-only ${targetBranch}...${featureBranch}`).split('\n');
}

function getFileDiff(targetBranch, featureBranch, file) {
  return execGit(`git diff ${targetBranch}...${featureBranch} -- ${file}`);
}

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

async function reviewWithCody(filePath, diffContent) {
  const messages = [
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

  const payload = JSON.stringify({
    temperature: 0.2,
    topK: -1,
    topP: -1,
    model: "anthropic::2024-10-22::claude-sonnet-4-latest",
    maxTokensToSample: 4000,
    messages
  });

  return new Promise((resolve, reject) => {
    const req = https.request(CODY_API_URL, {
      method: 'POST',i
      headers: {
        ...CODY_HEADERS,
        'Content-Length': Buffer.byteLength(payload),
      }
    }, res => {
      let fullResponse = '';
      res.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('{') && line.endsWith('}')) {
            try {
              const json = JSON.parse(line);
              if (json.deltaText) fullResponse += json.deltaText;
            } catch (e) {}
          }
        }
      });
      res.on('end', () => {
        const parsedJson = tryParseJson(fullResponse);
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

// --- MAIN WORKFLOW ---
async function runReview(branchName, targetBranch) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR);

  console.log(`Checking out ${branchName}...`);
  execGit(`git checkout ${branchName}`);

  const changedFiles = getChangedFiles(targetBranch, branchName);
  console.log('Changed files:', changedFiles);

  const results = [];

  for (const file of changedFiles) {
    const diff = getFileDiff(targetBranch, branchName, file);
    if (!diff) continue;

    const diffPath = path.join(DIFF_DIR, file.replace(/[\\/]/g, '_') + '.diff');
    fs.writeFileSync(diffPath, diff);

    console.log(`Reviewing ${file}...`);
    const review = await reviewWithCody(file, diff);

    if (review && review.issues) {
      results.push({ fileName: file, issues: review.issues });
    }
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✅ Review completed. Results saved to ${RESULT_FILE}`);
}

// --- ENTRY POINT ---
const [,, branchName, targetBranch] = process.argv;
if (!branchName || !targetBranch) {
  console.error('Usage: node review.js <branch_name> <target_branch>');
  process.exit(1);
}

runReview(branchName, targetBranch);
