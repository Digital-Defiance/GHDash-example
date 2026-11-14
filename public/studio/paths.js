(() => {
	const site = location.pathname.replace(/\/studio(\/.*)?$/, "");
	globalThis.__EMDASH_PATHS__ = { adminBase: site + "/studio", apiBase: site + "/_api", siteBase: site + "/" };
	const deep = new URLSearchParams(location.search).get("p");
	if (deep) history.replaceState(null, "", site + "/studio/" + deep);
})();
