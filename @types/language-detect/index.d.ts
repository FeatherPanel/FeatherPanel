declare module "language-detect" {
	export function filename(filename: string): string;
	export function contents(filename: string, contents: string): string;
	export function sync(filename: string): string;
	export function shebang(contents: string): string;
	export function classify(contents: string): string;
	export const aliases: Record<string, string>;
	export const filenames: Record<string, string>;
	export const extensions: Record<string, string>;
	export const interpreters: Record<string, string>;
}
