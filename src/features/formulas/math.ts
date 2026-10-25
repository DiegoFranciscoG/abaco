const loaders = import.meta.glob<Record<string, string>>('../../generated/math/*.json', { import: 'default' });

/** HTML typeset at build time by scripts/build-math.ts (trusted output of our own content, not user input). */
export async function loadMath(formulaId: string): Promise<Record<string, string>> {
  const entry = Object.entries(loaders).find(([path]) => path.endsWith(`/${formulaId}.json`));
  return entry ? entry[1]() : {};
}
