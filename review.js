require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { execGit, getChangedFiles, getFileDiff } = require('./gitUtils');
const { reviewWithCody } = require('./aiReview');
const { buildReviewMessages } = require('./promptBuilder');
const { saveResults } = require('./aggregator');

const OUTPUT_DIR = 'output';
const DIFF_DIR = path.join(OUTPUT_DIR, 'diffs');
const RESULT_FILE = path.join(OUTPUT_DIR, 'review-result.json');

const REPO_URL = 'https://github.com/samdofreelancer/money-keeper.git';
const REPO_DIR = 'money-keeper';

const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

async function runReview(branchName, targetBranch) {
  const pLimit = await import('p-limit').then(mod => mod.default);
  if (!fs.existsSync(REPO_DIR)) {
    console.log(`Cloning repository from ${REPO_URL}...`);
    const { execSync } = require('child_process');
    execSync(`git clone ${REPO_URL}`, { stdio: 'inherit' });
    console.log('Fetching all remote branches...');
    execSync(`git fetch --all`, { stdio: 'inherit' });
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR);

  console.log(`Checking out target branch ${targetBranch}...`);
  execGit(`git checkout ${targetBranch}`);

  const changedFiles = getChangedFiles(targetBranch, branchName);
  console.log('Changed files:', changedFiles);

  const results = [];
  const limit = pLimit(MAX_CONCURRENCY);

  const reviewTasks = changedFiles.map(file => 
    limit(async () => {
      const diff = getFileDiff(targetBranch, branchName, file);
      if (!diff) return;

      const diffPath = path.join(DIFF_DIR, file.replace(/[\\/]/g, '_') + '.diff');
      fs.writeFileSync(diffPath, diff);

      const messages = buildReviewMessages(file, diff);
      if (!messages || messages.length === 0) {
        console.warn(`No messages generated for ${file}. Skipping review.`);
        return;
      }

      let review;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          review = await reviewWithCody(file, diff, messages);
          if (review) break;
        } catch (err) {
          const isRateLimit = err.message?.includes('status code 429') || err.message?.includes('concurrency limit');
          if (isRateLimit && attempt < MAX_RETRIES) {
            console.warn(`Rate limit hit for ${file}, retrying in ${RETRY_DELAY_MS / 1000}s (Attempt ${attempt}/${MAX_RETRIES})...`);
            await delay(RETRY_DELAY_MS);
          } else {
            console.error(`Failed to review ${file}:`, err.message || err);
            return;
          }
        }
      }

      if (!review || !review.issues) {
        console.warn(`No review response or issues for ${file}.`);
        return;
      }

      console.log(`✅ Review response for ${file}`);
      results.push({ fileName: file, issues: review.issues });
    })
  );

  await Promise.all(reviewTasks);

  if (results.length === 0) {
    console.log('✅ No issues found in the review.');
    return;
  }

  saveResults(results);
  console.log(`\n✅ Review completed. Results saved to ${RESULT_FILE}`);
}

const [,, branchName, targetBranch] = process.argv;
if (!branchName || !targetBranch) {
  console.error('Usage: node review.js <branch_name> <target_branch>');
  process.exit(1);
}

runReview(branchName, targetBranch);
