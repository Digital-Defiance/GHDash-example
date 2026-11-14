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
	],
	admins: { color: colorAdmin, "field-kit": fieldKitAdmin },
};
