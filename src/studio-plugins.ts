// Plugins the studio shows. Each entry lists what the admin's manifest needs (copy it from the plugin's createPlugin()) and the plugin's admin module.
import * as colorAdmin from "@emdash-cms/plugin-color/admin";
import * as fieldKitAdmin from "@emdash-cms/plugin-field-kit/admin";

(globalThis as any).__STUDIO_PLUGINS__ = {
	plugins: [
		{
			id: "color",
			version: "0.2.1",
			admin: {
				entry: "@emdash-cms/plugin-color/admin",
				fieldWidgets: [{ name: "picker", label: "Color Picker", fieldTypes: ["string"] }],
			},
		},
		{
			id: "field-kit",
			version: "0.1.3",
			admin: {
				entry: "@emdash-cms/plugin-field-kit/admin",
				fieldWidgets: [
					{ name: "object-form", label: "Object form", fieldTypes: ["json"] },
					{ name: "list", label: "List", fieldTypes: ["json"] },
					{ name: "grid", label: "Grid", fieldTypes: ["json"] },
					{ name: "tags", label: "Tags input", fieldTypes: ["json"] },
				],
			},
		},
		{
			id: "embeds",
			version: "0.1.59",
			admin: {
				portableTextBlocks: [
					{
						type: "youtube",
						label: "YouTube Video",
						icon: "video",
						placeholder: "Paste YouTube URL...",
						fields: [
							{ type: "text_input", action_id: "id", label: "YouTube URL", placeholder: "https://youtube.com/watch?v=..." },
							{ type: "text_input", action_id: "title", label: "Title" },
							{ type: "text_input", action_id: "poster", label: "Poster Image URL" },
							{ type: "text_input", action_id: "params", label: "Player Parameters", placeholder: "start=57&end=75" },
						],
					},
					{
						type: "vimeo",
						label: "Vimeo Video",
						icon: "video",
						placeholder: "Paste Vimeo URL...",
						fields: [
							{ type: "text_input", action_id: "id", label: "Vimeo URL", placeholder: "https://vimeo.com/..." },
							{ type: "text_input", action_id: "poster", label: "Poster Image URL" },
							{ type: "text_input", action_id: "params", label: "Player Parameters" },
						],
					},
					{ type: "tweet", label: "Tweet (X)", icon: "link", placeholder: "Paste tweet URL..." },
					{ type: "bluesky", label: "Bluesky Post", icon: "link", placeholder: "Paste Bluesky post URL..." },
					{ type: "mastodon", label: "Mastodon Post", icon: "link", placeholder: "Paste Mastodon post URL..." },
					{ type: "linkPreview", label: "Link Preview", icon: "link-external", placeholder: "Paste any URL..." },
					{
						type: "gist",
						label: "GitHub Gist",
						icon: "code",
						placeholder: "Paste Gist URL...",
						fields: [
							{ type: "text_input", action_id: "id", label: "Gist URL", placeholder: "https://gist.github.com/.../..." },
							{ type: "text_input", action_id: "file", label: "Specific File", placeholder: "Optional: filename to show" },
						],
					},
				],
			},
		},
	],
	admins: { color: colorAdmin, "field-kit": fieldKitAdmin },
};
