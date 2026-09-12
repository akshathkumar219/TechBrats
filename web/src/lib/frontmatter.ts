export type PropertyValue = string | string[]

export function parseFrontmatter(content: string): {
  properties: Record<string, PropertyValue>
  body: string
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    return { properties: {}, body: content }
  }

  const rawYaml = match[1]
  const body = content.slice(match[0].length)
  const properties: Record<string, PropertyValue> = {}

  const lines = rawYaml.split('\n')
  let currentKey: string | null = null
  let currentList: string[] | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line || line.trim().startsWith('#')) continue

    // Bullet item under currentKey: "  - item"
    const bulletMatch = line.match(/^\s*-\s+(.*)$/)
    if (bulletMatch && currentKey) {
      if (!currentList) currentList = []
      currentList.push(bulletMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      properties[currentKey] = currentList
      continue
    }

    // Key: Value
    const colonIdx = line.indexOf(':')
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim()
      const rawVal = line.slice(colonIdx + 1).trim()

      currentKey = key
      currentList = null

      if (!rawVal) {
        properties[key] = ''
        continue
      }

      // Bracketed list: [a, b, c]
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1, -1).trim()
        const items = inner
          ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          : []
        properties[key] = items
        continue
      }

      properties[key] = rawVal.replace(/^['"]|['"]$/g, '')
    }
  }

  return { properties, body }
}
