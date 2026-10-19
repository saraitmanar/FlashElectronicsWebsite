// Compile-time guard: fails `tsc` if es.json is missing any key from en.json.
import type en from "../../messages/en.json";
import es from "../../messages/es.json";

export const spanishMessages: typeof en = es;
