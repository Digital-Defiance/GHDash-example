// Plugins the studio shows. Each entry lists what the admin's manifest needs (copy it from the plugin's createPlugin()) and the plugin's admin module.
import * as colorAdmin from "@emdash-cms/plugin-color/admin";

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
	],
	admins: { color: colorAdmin },
};
