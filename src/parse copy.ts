/**
 * Escape special regular expression characters inside a string
 * MDN ?
 */
function escapeRegExp(string: string) {
  // $& means the whole matched string
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

function getLineNo(str: string, index: number) {
  return str.slice(0, index).split("\n").length;
}

export { escapeRegExp, getLineNo };
