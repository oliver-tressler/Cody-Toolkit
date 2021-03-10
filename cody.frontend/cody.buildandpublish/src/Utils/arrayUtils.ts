export function last<T>(arr: T[]) {
	if (arr.length == 0) return undefined;
	return arr[arr.length - 1];
}
