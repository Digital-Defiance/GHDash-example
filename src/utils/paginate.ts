export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 20;

/** The cursor that starts each page, in order. The first is undefined. */
export async function pageCursors(
	fetchPage: (cursor: string | undefined) => Promise<{ nextCursor?: string }>,
): Promise<Array<string | undefined>> {
	const cursors: Array<string | undefined> = [undefined];
	const seen = new Set<string>();
	for (;;) {
		const { nextCursor } = await fetchPage(cursors[cursors.length - 1]);
		if (!nextCursor || seen.has(nextCursor)) return cursors;
		seen.add(nextCursor);
		cursors.push(nextCursor);
	}
}

/** Route params for page n of a list: the first page has no suffix. */
export const pageParam = (n: number) => (n === 1 ? undefined : `page/${n}`);

/** Which page a `[...page]` param means. */
export const pageNumber = (param: string | undefined) => (param ? Number(param.replace("page/", "")) : 1);
