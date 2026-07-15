export type NamedContentKind = 'section' | 'category' | 'page';
export type ParsedNamedContent = {
	kind: NamedContentKind;
	title: string;
	slug: string;
};

const prefixes: Record<string, NamedContentKind> = { N: 'section', C: 'category', A: 'page' };
const pattern = /^\[(N|C|A)]([^{}]+)(?:\{([^}]+)})?/;

export function parseNamedContentPath(name: string): ParsedNamedContent | null {
	const match = pattern.exec(name);
	if (!match?.[1]) return null;
	return {
		kind: prefixes[match[1]],
		title: match[2].trim(),
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		slug: match[3] ?? slugify(match[2].trim())
	};
}

export function createNamedContentName(
	kind: NamedContentKind,
	title: string,
	slug = slugify(title)
) {
	const prefix = kind === 'section' ? 'N' : kind === 'category' ? 'C' : 'A';
	return `[${prefix}]${title}{${slug}}${kind === 'page' ? '.svx' : ''}`;
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
