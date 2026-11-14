// Turns on "Sign in with GitHub" when the studio page carries a <meta name="studio-oauth"> tag (see github-oauth.json).
const meta = document.querySelector<HTMLMetaElement>('meta[name="studio-oauth"]');
if (meta?.content) {
	try {
		(globalThis as any).__STUDIO_OAUTH__ = JSON.parse(meta.content);
	} catch {}
}
