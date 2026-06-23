import { meaningfulReviewText } from './review_text_quality.mjs';

const failures = [];

function expect(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

expect('empty note rejected', meaningfulReviewText(''), false);
expect('short note rejected', meaningfulReviewText('too short'), false);
expect('angle-bracket placeholder rejected', meaningfulReviewText('<specific rationale>', 18), false);
expect('source approval placeholder rejected', meaningfulReviewText('<specific source approval note>'), false);
expect('rig approval placeholder rejected', meaningfulReviewText('<specific rig approval note>'), false);
expect('canned approval note rejected', meaningfulReviewText('Specific approval note after inspecting source, contact sheet, phase strip, sandbox, and source-candidate provenance.'), false);
expect('todo rejected', meaningfulReviewText('TODO replace this with a real explanation that sounds long enough'), false);
expect('specific visual rationale accepted', meaningfulReviewText('Silhouette remains readable at one-quarter scale with jaw, body, and tail distinct.', 18), true);
expect('specific approval note accepted', meaningfulReviewText('Approved after comparing source, key preview, phase strip, and sandbox motion against the review packet.'), true);

if (failures.length) {
  console.error(JSON.stringify({ schema: 'water9/review-text-quality-smoke@1', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  schema: 'water9/review-text-quality-smoke@1',
  tests: 9,
  failures,
}, null, 2));
