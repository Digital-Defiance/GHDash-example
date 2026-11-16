import { existsSync, readFileSync } from "node:fs";

import { getGiscus } from "./giscus.mjs";

const readJson = (file) => {
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
};

/**
 * Which comments the posts show: "gitlab" when the repository is on GitLab, "giscus" when giscus.json is filled in, else null.
 * comments.json { "provider": "gitlab" | "giscus" | "off" } overrides the choice.
 */
export function commentsProvider({ settings = "comments.json", gitlab = ".ghdash/gitlab-comments.json" } = {}) {
	const wanted = readJson(settings)?.provider;
	if (wanted === "off") return null;
	const onGitLab = readJson(gitlab)?.provider === "gitlab";
	if (wanted === "giscus") return getGiscus() ? "giscus" : null;
	if (wanted === "gitlab") return onGitLab ? "gitlab" : null;
	if (onGitLab) return "gitlab";
	return getGiscus() ? "giscus" : null;
}

/** The comments for one post from .ghdash/gitlab-comments.json, and where to add one. */
export function gitlabThread(term, file = ".ghdash/gitlab-comments.json") {
	const data = readJson(file);
	if (!data || data.provider !== "gitlab") return null;
	const post = data.posts?.[term];
	const q = new URLSearchParams({
		"issue[title]": `Comments: ${term}`,
		"issue[description]": "Comments on this post. Reply below; comments show on the site after its next build.",
	});
	return {
		comments: post?.comments ?? [],
		open: post ? post.open : true,
		commentUrl: post?.issueUrl ?? `${data.webUrl}/${data.project}/-/issues/new?${q}`,
	};
}
