export function truncateString(str: string, maxLength = 5) {
  if (str.length > maxLength) {
    return `${str.substring(0, maxLength)}...`;
  }
  return str;
}
