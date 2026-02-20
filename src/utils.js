export const typeOf = x => Object.prototype.toString.call(x).slice(8, -1)
export const isObject = x => typeOf(x) === 'Object'
export const concatObjects = (x, y) => ({ ...x, ...y })

let IS_PROD = import.meta.env.MODE !== 'development'
let LOG_PREFIX = '[EZSearch] :: '
export function log(...x) {
  return IS_PROD ? console.log(LOG_PREFIX, ...x) : console.log(x)
}
log.warn = (...x) => (IS_PROD ? console.warn(LOG_PREFIX, ...x) : console.warn(...x))
log.info = (...x) => (IS_PROD ? console.info(LOG_PREFIX, ...x) : console.info(...x))
log.error = (...x) => (IS_PROD ? console.error(LOG_PREFIX, ...x) : console.error(...x))

/**
 * @template T
 * @param {T} condition
 * @param {string} message
 * @returns {asserts condition}
 */
export function invariant(condition, message) {
  if (!condition) throw new Error(`ezsearch: ${message}`)
}

const _fetchCache = {}
/**
 * @template T
 * @param {string} url
 * @param {(response: Response) => T} onResponse
 * @returns {Promise<T>}
 */
export async function fetchCached(url, onResponse) {
  const cleanUrl = url.replace(/\\\//g, '/')

  if (_fetchCache[cleanUrl]) return _fetchCache[cleanUrl].then(r => onResponse(r.clone()))

  const res = fetch(cleanUrl)
  _fetchCache[cleanUrl] = res
  return res.then(r => onResponse(r.clone()))
}

/* prettier-ignore */
function parseCSV(str) {
  /** @type {string[][]} */
  let arr = []
  let quote = false  // 'true' means we're inside a quoted field

  // Iterate over each character, keep track of current row and column (of the returned array)
  for (let row = 0, col = 0, c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c+1]        // Current character, next character
      arr[row] = arr[row] || []             // Create a new row if necessary
      arr[row][col] = arr[row][col] || ''   // Create a new column (start with empty string) if necessary

      // If the current character is a quotation mark, and we're inside a
      // quoted field, and the next character is also a quotation mark,
      // add a quotation mark to the current column and skip the next character
      if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue }

      // If it's just one quotation mark, begin/end quoted field
      if (cc == '"') { quote = !quote; continue }

      // If it's a comma and we're not in a quoted field, move on to the next column
      if (cc == ',' && !quote) { ++col; continue }

      // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
      // and move on to the next row and move to column 0 of that new row
      if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue }

      // If it's a newline (LF or CR) and we're not in a quoted field,
      // move on to the next row and move to column 0 of that new row
      if (cc == '\n' && !quote) { ++row; col = 0; continue }
      if (cc == '\r' && !quote) { ++row; col = 0; continue }

      // Otherwise, append the current character to the current column
      arr[row][col] += cc
  }
  return arr
}

export async function fetchCsv(url) {
  return await fetchCached(url, async res => {
    if (!res.ok) {
      throw new Error('ezsearch: Unable to fetch CSV')
    }
    const text = await res.text()
    const parsedCsv = parseCSV(text)
    return parsedCsv
  })
}

export function getCurrentUrl(queryParams) {
  if (!queryParams) {
    return window.location.href
  }

  let searchParams = new URLSearchParams(window.location.search)

  Object.keys(queryParams).forEach(k => {
    let value = queryParams[k]
    value == null ? searchParams.delete(k) : searchParams.set(k, value)
  })

  let newurl =
    window.location.protocol +
    '//' +
    window.location.host +
    window.location.pathname +
    '?' +
    searchParams.toString()
  return newurl
}

export function updateUrlQueryParams(queryParams, replace) {
  if (!queryParams) return

  if (history.pushState) {
    let newurl = getCurrentUrl(queryParams)

    let fn = replace ? 'replaceState' : 'pushState'
    window.history[fn]({ path: newurl }, '', newurl)
  }
}

export function getQueryParams(keys) {
  let searchParams = new URLSearchParams(window.location.search)

  return Array.isArray(keys)
    ? keys.map(k => (typeof k === 'string' ? searchParams.get(k) : null))
    : searchParams.get(keys)
}

export function splitOnComma(text) {
  if (typeof text === 'string') text.split(/,\s*/)
  return null
}

export function safeJsonParse(text, fallbackText = 'null') {
  try {
    return JSON.parse(text || fallbackText)
  } catch (error) {
    return typeof fallbackText === 'string' ? JSON.parse(fallbackText) : fallbackText
  }
}

export function findIndexOfMap(label, map) {
  let idx = 0
  let matchedIdx = null
  map.forEach((value, key) => {
    if (key === label && matchedIdx == null) matchedIdx = idx
    idx++
  })
  return matchedIdx
}

export function last(list) {
  return list[list.length - 1]
}

export const domReady = () =>
  new Promise(fulfil => {
    let ready = document.readyState !== 'loading'
    if (ready) fulfil()
    else document.addEventListener('DOMContentLoaded', () => fulfil())
  })

/**
 * Attaches an event listener to the specified element.
 *
 * @param {HTMLElement} element - The element to attach the event listener to.
 * @param {string} eventName - The name of the event to listen for.
 * @param {function} handler - The function to be executed when the event is triggered.
 * @param {{once?: boolean, passive?: boolean, capture?: boolean, signal?: AbortSignal} | boolean} [listenerOptions] - Optional listener options.
 * @param {boolean} [runImmediately=false] - Whether to execute the handler immediately.
 * @return {function} - A cleanup function that removes the event listener.
 */
export function on(element, eventName, handler, listenerOptions, runImmediately = false) {
  if (listenerOptions != null) element.addEventListener(eventName, handler, listenerOptions)
  else element.addEventListener(eventName, handler)

  if (runImmediately) {
    handler()
  }

  return function cleanup() {
    element.removeEventListener(eventName, handler)
  }
}

/**
 *
 * @param {{tag: string, collectionHandle: string }} tag
 */
export function createCollectionPathname({ tag, collectionHandle, queryParams }) {
  let legacy_link = `/collections/${collectionHandle || 'all'}/${tag}`
  if (queryParams) legacy_link += `?${queryParams}`
  let new_link = `/collections/${collectionHandle || 'all'}?filter.p.tag=${tag}`
  if (queryParams) new_link += `&${queryParams}`

  return {
    legacy: legacy_link,
    new: new_link,
  }
  // let v = ''

  // if (legacySearch) {
  //   v = `/collections/${collectionHandle || 'all'}/${tag}`
  //   if (queryParams) v += `?${queryParams}`
  // } else {
  //   v = `/collections/${collectionHandle || 'all'}?filter.p.tag=${tag}`
  //   if (queryParams) v += `&${queryParams}`
  // }
  // return v
}
