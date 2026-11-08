import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeterministicChecks } from '../src/services/reviewCore.js';

const rules = [
  { _id: 'r1', type: 'terminology', title: 'Product name', description: 'Use AcmeFlow exactly.', canonicalValue: 'AcmeFlow', aliases: ['ACME flow', 'Acme Flow'], severity: 'medium', sourceName: 'Brand handbook', sourceSection: 'Naming', version: 2 },
  { _id: 'r2', type: 'fact', title: 'Trial duration', description: 'Trial duration is 14 days.', canonicalValue: '14-day free trial', aliases: ['30-day free trial'], severity: 'high', sourceName: 'Product facts', sourceSection: 'Trial', version: 3 },
  { _id: 'r3', type: 'claim_policy', title: 'Evidence policy', description: 'Strong claims need evidence.', severity: 'high', sourceName: 'Claims policy', sourceSection: 'Evidence', version: 1 },
  { _id: 'r4', type: 'messaging', title: 'Trial qualification', description: 'Mention the approved trial duration.', canonicalValue: '14-day free trial', severity: 'medium', sourceName: 'Campaign guide', sourceSection: 'CTA', version: 1 }
];

test('flags non-canonical product terminology with an exact source', () => {
  const findings = runDeterministicChecks('ACME flow brings your work together.', rules);
  const finding = findings.find((item) => item.category === 'terminology');
  assert.ok(finding);
  assert.equal(finding.suggestion, 'AcmeFlow');
  assert.equal(finding.evidence.sourceName, 'Brand handbook');
  assert.equal(finding.excerpt, 'ACME flow');
});

test('flags an outdated offer as a factual inconsistency', () => {
  const findings = runDeterministicChecks('Start your 30-day free trial.', rules);
  const finding = findings.find((item) => item.category === 'factual');
  assert.ok(finding);
  assert.equal(finding.suggestion, '14-day free trial');
  assert.equal(finding.severity, 'high');
});

test('labels strong promotional wording as unverified, not false', () => {
  const findings = runDeterministicChecks('We guarantee 10× productivity.', rules);
  const finding = findings.find((item) => item.category === 'promotional_claim');
  assert.ok(finding);
  assert.equal(finding.certainty, 'medium');
  assert.match(finding.explanation, /not established that the statement is false/i);
});

test('recognises a multiplier claim even when the multiplication sign is used', () => {
  const findings = runDeterministicChecks('Our platform delivers 10× productivity.', rules);
  assert.ok(findings.some((item) => item.category === 'promotional_claim' && item.excerpt === '10×'));
});

test('does not report a policy breach for clean approved wording', () => {
  const findings = runDeterministicChecks('AcmeFlow helps teams organise their work. Start your 14-day free trial.', rules);
  assert.equal(findings.length, 0);
});
