import "@emdash-cms/admin/styles.css";
import { AdminApp } from "@emdash-cms/admin";
import { loadMessages } from "@emdash-cms/admin/locales";
import { createRoot } from "react-dom/client";

const messages = await loadMessages("en");
createRoot(document.getElementById("admin-root")!).render(<AdminApp locale="en" messages={messages} />);
