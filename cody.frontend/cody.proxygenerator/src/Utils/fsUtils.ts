import * as path from "path";
/**
 * Check if a given dir is equal to or a subdirectory of another dir.
 * @param parent fsPath (dir)
 * @param child fsPath (dir)
 */
export function isSubDirOrEqualDir(parent: string, child: string) {
	const parentPath = path.parse(parent);
	const childPath = path.parse(child);
	if (parentPath.dir === childPath.dir) {
		return true;
	}
	const rel = path.relative(parent, child);
	return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}
