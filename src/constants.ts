import conf from "../config.json";
import pkg from "../package.json";

export const VERSION = pkg.version;
export const CONFIG = conf;
export const IS_DEBUG =
	process.env.NODE_ENV === "development" || process.argv.includes("--debug");
export const MAX_DOWNLOAD_SIZE = 1024 * 1024 * 1024 * 2; // 2GB
export const FP_HOME_URL = "https://featherpanel.natoune.fr";
export const FP_TERMS_URL = "https://featherpanel.natoune.fr/terms";
