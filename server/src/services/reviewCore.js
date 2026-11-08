import crypto from 'node:crypto';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function makeFinding({ category, severity = 'medium', certainty = 'high', title, excerpt, explanation, suggestion = '', rule = null, startIndex = -1, endIndex = -1 }) {
  return {
    category, severity, certainty, title, excerpt, explanation, suggestion,
    evidence: rule ? {
      ruleId: rule._id,
      sourceName: rule.sourceName,
      sourceSection: rule.sourceSection,
      approvedValue: rule.canonicalValue || rule.description,
      sourceVersion: rule.version
    } : { sourceName: 'Review policy', sourceSection: 'Promotional claims', approvedValue: 'Claims need approved supporting evidence', sourceVersion: null },
    startIndex, endIndex
  };
}

function terminologyFindings(body, rules) {
  const findings = [];
  for (const rule of rules.filter((item) => item.type === 'terminology' && item.canonicalValue)) {
    for (const alias of rule.aliases || []) {
      if (!alias || alias.toLowerCase() === rule.canonicalValue.toLowerCase()) continue;
      const expression = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi');
      let match;
      while ((match = expression.exec(body)) !== null) {
        findings.push(makeFinding({
          category: 'terminology', severity: rule.severity, title: `Use “${rule.canonicalValue}” consistently`,
          excerpt: match[0], explanation: `${rule.description} The approved term is “${rule.canonicalValue}”.`,
          suggestion: rule.canonicalValue, rule, startIndex: match.index, endIndex: match.index + match[0].length
        }));
      }
    }
  }
  return findings;
}

function factFindings(body, rules) {
  const findings = [];
  for (const rule of rules.filter((item) => item.type === 'fact')) {
    for (const alias of rule.aliases || []) {
      if (!alias) continue;
      const expression = new RegExp(escapeRegExp(alias), 'gi');
      let match;
      while ((match = expression.exec(body)) !== null) {
        findings.push(makeFinding({
          category: 'factual', severity: rule.severity, title: `${rule.title} may be outdated`, excerpt: match[0],
          explanation: `${rule.description} The approved information is “${rule.canonicalValue}”.`,
          suggestion: rule.canonicalValue, rule, startIndex: match.index, endIndex: match.index + match[0].length
        }));
      }
    }
  }
  return findings;
}

function claimFindings(body, rules) {
  const policy = rules.find((item) => item.type === 'claim_policy');
  const patterns = [
    /\bguarantee(?:s|d)?\b/gi,
    /\b\d+\s*[x×](?=\s|[.,!?;:]|$)/gi,
    /\b(?:number\s*one|best[- ]in[- ]class|industry[- ]leading)\b|(?<!\w)#1(?!\w)/gi,
    /\b(?:double|triple|multiply)\s+(?:your|the)\s+(?:sales|revenue|productivity|performance)\b/gi
  ];
  const findings = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const alreadyCovered = findings.some((finding) => match.index >= finding.startIndex && match.index < finding.endIndex);
      if (alreadyCovered) continue;
      findings.push(makeFinding({
        category: 'promotional_claim', severity: policy?.severity || 'high', certainty: 'medium',
        title: 'Promotional claim needs supporting evidence', excerpt: match[0],
        explanation: 'This wording makes a strong or comparative promise. The approved claim policy requires evidence before it is published. The system has not established that the statement is false; it is currently unverified.',
        suggestion: 'Add an approved source for this claim, or revise the wording to describe a verifiable product benefit.',
        rule: policy, startIndex: match.index, endIndex: match.index + match[0].length
      }));
    }
  }
  return findings;
}

function requiredMessageFindings(body, rules) {
  const findings = [];
  for (const rule of rules.filter((item) => item.type === 'messaging' && item.canonicalValue)) {
    const required = rule.canonicalValue.trim();
    if (required && !body.toLowerCase().includes(required.toLowerCase())) {
      findings.push(makeFinding({
        category: 'messaging', severity: rule.severity, certainty: 'high', title: `Check required message: ${rule.title}`,
        excerpt: 'Required message not found', explanation: rule.description,
        suggestion: `Consider including: “${required}”`, rule
      }));
    }
  }
  return findings;
}

export function runDeterministicChecks(body, rules) {
  return [
    ...terminologyFindings(body, rules),
    ...factFindings(body, rules),
    ...claimFindings(body, rules),
    ...requiredMessageFindings(body, rules)
  ];
}

export function hashContent(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
