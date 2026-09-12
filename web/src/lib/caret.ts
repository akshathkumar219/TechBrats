const PROPERTIES = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
] as const

export interface CaretCoordinates {
  top: number
  left: number
  height: number
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): CaretCoordinates {
  const div = document.createElement('div')
  div.id = 'input-textarea-caret-position-mirror-div'
  document.body.appendChild(div)

  const style = div.style
  const computed = window.getComputedStyle(element)

  style.whiteSpace = 'pre-wrap'
  style.wordWrap = 'break-word'
  style.position = 'absolute'
  style.visibility = 'hidden'
  style.top = '0'
  style.left = '-9999px'

  for (const prop of PROPERTIES) {
    style.setProperty(prop, computed.getPropertyValue(prop))
  }

  div.textContent = element.value.substring(0, position)

  const span = document.createElement('span')
  span.textContent = element.value.substring(position) || '.'
  div.appendChild(span)

  const rect = element.getBoundingClientRect()
  const lineHeight = parseInt(computed.lineHeight, 10) || 24

  const top = rect.top + span.offsetTop + parseInt(computed.borderTopWidth, 10) - element.scrollTop
  const left = rect.left + span.offsetLeft + parseInt(computed.borderLeftWidth, 10) - element.scrollLeft

  document.body.removeChild(div)

  return { top, left, height: lineHeight }
}
