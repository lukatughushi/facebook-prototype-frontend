// Group topics and page categories are stored in English; topicLabel gives
// the UI-language label when there is one, otherwise the stored value.
export function topicLabel(t, value) {
  if (!value) return value;
  const key = `topics.${String(value).toLowerCase().replace(/[^a-z]/g, "")}`;
  const text = t(key);
  return text === key ? value : text;
}
