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
const RETRY_DELAY_MS = 3000; // 3 seconds
const COOLDOWN_MS = 15000;   // cooldown after repeated failures

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runReview(branchName, targetBranch) {
  const pLimit = await import('p-limit').then(mod => mod.default);

  if (!fs.existsSync(REPO_DIR)) {
    console.log(`Cloning repository from ${REPO_URL}...`);
    const { execSync } = require('child_process');
    execSync(`git clone ${REPO_URL}`, { stdio: 'inherit' });
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

  const queue = [...changedFiles];
  const failedQueue = [];

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, MAX_CONCURRENCY);

    await Promise.all(currentBatch.map(file =>
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

        let review, attempt = 0;
        let success = false;

        while (attempt < MAX_RETRIES && !success) {
          attempt++;
          try {
            review = await reviewWithCody(file, diff, messages);
            success = true;
            break;
          } catch (err) {
            const isRateLimit = err.message?.includes('status code 429') || err.message?.includes('concurrency limit');

            console.error(`Error reviewing ${file} (Attempt ${attempt}/${MAX_RETRIES}):`, err.message || err);
            if (isRateLimit) {
              console.warn(`429 hit. Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
              await delay(RETRY_DELAY_MS);
            } else {
              break;
            }
          }
        }

        if (!success) {
          console.warn(`❌ Failed after ${MAX_RETRIES} attempts for ${file}. Will retry later.`);
          failedQueue.push(file);
          return;
        }

        if (!review || !review.issues) {
          console.warn(`No review response or issues for ${file}.`);
          return;
        }

        console.log(`✅ Review response for ${file}`);
        results.push({ fileName: file, issues: review.issues });
      })
    ));

    if (queue.length === 0 && failedQueue.length > 0) {
      console.log(`⏳ Cooling down for ${COOLDOWN_MS / 1000}s before retrying failed files...`);
      await delay(COOLDOWN_MS);
      queue.push(...failedQueue.splice(0));
    }
  }

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

