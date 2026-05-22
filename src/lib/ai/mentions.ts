export function normalizeMention(value: string) {
  return value
    .trim()
    .replace(/^#+/, '')
    .replace(/^@+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-');
}

export function extractMentions(prompt: string) {
  const matches = prompt.matchAll(/#([a-zA-Z0-9_-]+)/g);
  return Array.from(new Set(Array.from(matches, (match) => normalizeMention(match[1])).filter(Boolean)));
}

export function buildGenerationPrompt(input: {
  prompt: string;
  character?: { handle: string; name: string; identityPrompt: string | null } | null;
  decor?: { handle: string; name: string; environmentPrompt: string | null } | null;
}) {
  const parts = [];

  if (input.character) {
    parts.push(`Character #${input.character.handle}: ${input.character.name}`);
    if (input.character.identityPrompt) parts.push(input.character.identityPrompt);
  }

  if (input.decor) {
    parts.push(`Decor #${input.decor.handle}: ${input.decor.name}`);
    if (input.decor.environmentPrompt) parts.push(input.decor.environmentPrompt);
  }

  parts.push(`User prompt:\n${input.prompt.trim()}`);
  parts.push('Keep character identity, body proportions, face details, room layout, furniture placement, lighting direction, lens style and recurring objects consistent across generations.');

  return parts.join('\n\n');
}
