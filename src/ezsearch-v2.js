// @ts-check
import { BaseElement } from './base-element.js'
import {
  on,
  fetchCsv,
  fetchCached,
  invariant,
  last,
  log,
  safeJsonParse,
  findIndexOfMap,
} from './utils.js'
import { CONSTS } from './consts.js'
import { RootValue, createFiltersTree, getCurrentFilterObject, getSelectedItem } from './filter.js'
import * as ls from './local-storage'

/**
 * @typedef {{
 *  filteredProductPathname: (tag: {tag: string, collectionHandle: string, legacySearch: boolean}) => string,
 * }} EzsearchGlobalV2Options
 *
 * @typedef {ReturnType<typeof validatedValues>} ValidatedValues
 *
 * @typedef {{
 *   activeFilters: Map<string, string>,
 *   allSelected: boolean,
 *   selectedItem: { _path: string, _tag: string } | null,
 *   selectedItemTitle: string | null
 *   filteredCollectionHref: string | null
 * }} State
 *
 * @typedef {Omit<State, 'activeFilters'>} SubscribersInput
 *
 * @typedef {ReturnType<typeof createFiltersTreeFromCsv>} FilterTreeData
 * @typedef {{ subscribers: Array<(data: SubscribersInput) => void>, data: FilterTreeData }} SingletonData
 */

/** @type {{EzsearchGlobalV2Options?: EzsearchGlobalV2Options} &  Window} */
const cwindow = /** @type {any} */ (window)
const userDefinedOptions = cwindow.EzsearchGlobalV2Options

/** @type {Record<string, SingletonData>} */
const cache = {}
/** @type {Array<string>} */
const _widgetIds = []

export class EzsearchGlobalV2 extends BaseElement {
  static instancesCache = cache
  static widgetIds = _widgetIds

  /** @type {Array<EzsearchGlobalV2>} */
  static instances = []

  constructor() {
    super()
    this.uid = this.id || this.getAttribute(CONSTS.ATTR.id)
    if (!this.uid)
      throw new Error(`ezsearch: id must be specified (\`id\` | \`${CONSTS.ATTR.id}\`)`)

    /**
     * @type {{
     *  toggleOpen: Array<HTMLButtonElement>,
     *  selects: Array<HTMLSelectElement>,
     *  form: HTMLFormElement,
     *  submitBtns: Array<HTMLButtonElement>,
     *  resetBtns: Array<HTMLButtonElement>,
     *  itemTitles: Array<HTMLElement>
     *  filteredHrefs: Array<HTMLElement>
     * }}
     * */
    this.elements = /** @type {any} */ {
      form: /** @type {any} */ (null),
      selects: /** @type {any} */ (null),
      toggleOpen: /** @type {any} */ (null),
      submitBtns: /** @type {any} */ (null),
      resetBtns: /** @type {any} */ (null),
      itemTitles: /** @type {any} */ (null),
      filteredHrefs: /** @type {any} */ (null),
    }

    /** @type {ValidatedValues} */
    this.options = /** @type {any} */ (null)

    /** @type {SingletonData} */
    this.singletonData = /** @type {any} */ (null)

    /** @type {State} */
    this.state = {
      activeFilters: /** @type {any} */ (null),
      allSelected: false,
      selectedItem: null,
      selectedItemTitle: null,
      filteredCollectionHref: null,
    }

    this._handleChange = this._handleChange.bind(this)
    this._handleChangeFn = this._handleChangeFn.bind(this)
  }

  /**
   *
   * @param {(data: SubscribersInput) => void} fn
   * @returns {() => void}
   */
  subscribe(fn, initualRun = true) {
    const subscribers = this.singletonData?.subscribers
    if (!subscribers) throw new Error('ezsearch: not initialized')
    subscribers.push(fn)

    if (initualRun !== false) fn(this.state)

    return () => {
      const subscribers = this.singletonData?.subscribers
      if (!subscribers) throw new Error('ezsearch: not initialized')

      const index = subscribers.indexOf(fn)
      if (index > -1) subscribers.splice(index, 1)
    }
  }
  _runSubscribers() {
    // Update our subscribers

    const subs = this.singletonData.subscribers
    for (let i = 0, len = subs.length; i < len; i++) {
      const fn = subs[i]
      fn(this.state)
    }
  }

  async mount() {
    this.elements.form = /** @type {any} */ (this.querySelector('form[data-ezs-form]'))
    this.elements.selects = /** @type {any} */ (
      Array.from(this.querySelectorAll('select[data-ezs-filter]'))
    )
    this.elements.toggleOpen = /** @type {any} */ (
      Array.from(this.querySelectorAll('[data-ezs-toggle-open]'))
    )
    this.elements.submitBtns = /** @type {any} */ (
      Array.from(this.elements.form.querySelectorAll('[type="submit"]'))
    )
    this.elements.resetBtns = /** @type {any} */ (
      Array.from(this.querySelectorAll('[data-ezs-goto-mode="selection"]'))
    )
    this.elements.itemTitles = /** @type {any} */ (
      Array.from(this.querySelectorAll('[data-ezs-item-title]'))
    )
    this.elements.filteredHrefs = /** @type {any} */ (
      Array.from(this.querySelectorAll('[data-ezs-filtered-href]'))
    )

    this.options = validatedValues(this)
    const { configUrl, filterKeys, canCache, preClearCache } = this.options

    let singletonData = cache[this.uid]
    if (!singletonData) {
      _widgetIds.push(this.uid)
      singletonData = { subscribers: [], data: /** @type {any} */ (null) }
      cache[this.uid] = singletonData
      this.singletonData = singletonData

      if (!EzsearchGlobalV2.instances.includes(this)) {
        EzsearchGlobalV2.instances.push(this)
      }
    }

    // data is not loaded into cache
    if (!singletonData.data) {
      const ezsearchSettings = await fetchCached(configUrl, res => res.json())
      const dbUrl = ezsearchSettings?.settings?.form?.db
      if (!dbUrl) {
        console.log('ezsearch: data', singletonData.data)
        throw new Error('ezsearch: unable to fetch db url')
      }

      singletonData.data = await fetchCsv(dbUrl).then(parsedCsv => {
        return createFiltersTreeFromCsv(parsedCsv, this.options)
      })
    }

    this.state.activeFilters = new Map(
      Array.from({ length: filterKeys.length }, (_, i) => [
        filterKeys[i],
        !canCache || preClearCache ? '' : ls.get(filterKeys[i]) || '',
      ]),
    )

    this._setupListeners()

    return true
  }

  unmount() {}

  _updateOptions({ selectIndex, updateSelectValue = false, forcePending = false }) {
    let activeFiltersList = [...this.state.activeFilters]

    activeFiltersList.forEach(([label, filterValue], idx) => {
      const filterObject = getCurrentFilterObject({
        selectedValues: activeFiltersList,
        index: idx,
        filterTree: this.singletonData.data.tree,
      })

      // Reset the current filter value if next options does not contain the current value
      if (!filterObject?.[filterValue]) this.state.activeFilters.set(label, '')

      const isNextSelect = idx > selectIndex

      const select = this.elements.selects[idx]

      /** @type {Array<string>} */
      const filterOptions = filterObject?._keys_ || []
      const hasFilterOptions = Array.isArray(filterOptions) && filterOptions.length > 0
      select.disabled = !hasFilterOptions

      if (this.options.canCache) {
        if (filterValue) {
          ls.set(label, filterValue, this.options.cacheSeconds)
        } else {
          ls.remove(label)
        }
      }

      let sameOptions =
        selectIndex === -1 || updateSelectValue
          ? false
          : !isNextSelect
          ? true
          : this.options.resetNextSelectsOnChange
          ? false
          : filterOptions.length === select.options.length - 1 &&
            filterOptions.every((opt, i) => opt === select.options[i + 1].value)

      if (!sameOptions) {
        select.options.length = 1

        requestAnimationFrame(() => {
          filterOptions.forEach((opt, i) => {
            select.options[i + 1] = new Option(opt, opt)
          })

          select.value = this.state.activeFilters.get(label) || ''
        })
      }
    })

    this.state.allSelected = [...this.state.activeFilters].every(([, filterValue]) => !!filterValue)
    this.setAttribute('data-ezs-selected-filters', this.state.allSelected ? 'all' : 'partial')
    if (!this.state.allSelected) {
      this.setAttribute('data-ezs-state', 'pending')
    }

    if (forcePending || selectIndex === -1) {
      this._afterOptionsUpdate({
        forcePending,
        // preventAutosearch: selectIndex === -1,
      })
    }

    if (this.state.allSelected && this.options.autoSearch) {
      this.elements.form.dispatchEvent(new Event('submit'))      
    }

    this.dispatchEvent(
      new CustomEvent('ezsearch::selection_update', {
        detail: {
          index: selectIndex,
          select: this.elements.selects[selectIndex],
        },
        bubbles: false,
        cancelable: false,
      }),
    )
  }

  _afterOptionsUpdate({ forcePending = false, fromCache = false } = {}) {
    // Check if there is any valid selection
    const selectedItemRoot = forcePending
      ? null
      : fromCache
      ? safeJsonParse(ls.get('selectedItem'), 'null')
      : getSelectedItem({
          keys: this.options.filterKeys,
          activeFilters: this.state.activeFilters,
          filterTree: this.singletonData.data.tree,
        })

    const selectedItem = selectedItemRoot instanceof RootValue ? selectedItemRoot.value : null
    const href = selectedItem?._path || ''

    this.state.selectedItem = selectedItem
    this.state.selectedItemTitle = selectedItem
      ? this.options.filterKeys.map(key => this.state.activeFilters.get(key)).join(' ')
      : ''
    this.state.filteredCollectionHref = href

    this.setAttribute('data-ezs-state', selectedItem ? 'selected' : 'pending')

    if (selectedItem) {
      this.dispatchEvent(
        new CustomEvent('ezsearch::selection_complete', {
          detail: { selected: selectedItem },
          bubbles: false,
          cancelable: false,
        }),
      )
    }

    // update item titles
    for (let i = 0, len = this.elements.itemTitles.length; i < len; i++) {
      const el = this.elements.itemTitles[i]

      const fallbackText =
        // @ts-expect-error
        typeof el.__ezs_fallback_text === 'undefined'
          ? // @ts-expect-error
            (el.__ezs_fallback_text = el.getAttribute('data-fallback-text'))
          : // @ts-expect-error
            el.__ezs_fallback_text
      const title = this.state.selectedItemTitle || fallbackText
      el.textContent = title
      title ? el.setAttribute('title', title) : el.removeAttribute('title')
    }

    // update hrefs

    for (let i = 0, len = this.elements.filteredHrefs.length; i < len; i++) {
      const el = this.elements.filteredHrefs[i]
      if (el instanceof HTMLAnchorElement) {
        el.setAttribute('href', href)
        el.toggleAttribute('disabled', !href)
      }
    }

    this._runSubscribers()

    selectedItem ? ls.set('selectedItem', JSON.stringify(selectedItem)) : ls.remove('selectedItem')
  }

  _handleChange(event) {
    const isUserEvent = event?.isTrusted
    let index = event?.target?.__ezs_index
    if (typeof index !== 'number') {
      log.warn('no `__ezs_index` found')
      return
    }
    this._handleChangeFn(index)

    // sync other instances
    if (isUserEvent) {
      EzsearchGlobalV2.instances.forEach(instance => {
        if (instance != this) {
          instance.elements.selects[index].value = this.elements.selects[index].value
          instance._handleChangeFn(index)
        }
      })
    }
  }

  /**
   *
   * @param {number} index
   */
  _handleChangeFn(index) {
    const label = this.options.filterKeys[index]
    let select = this.elements.selects[index]

    const v = select.value
    v ? this.state.activeFilters.set(label, v) : this.state.activeFilters.set(label, '')

    if (this.options.resetNextSelectsOnChange) {
      ;[...this.state.activeFilters].forEach(([_label], idx) => {
        if (idx > index) this.state.activeFilters.set(_label, '')
      })
    }

    this._updateOptions({ selectIndex: index })
  }

  /**
   * @example
   * Reset the selects
   * updateFilterValue(filterKeys[0], '')
   *
   * @param {string} ezsKey
   * @param {string} value
   * @returns {void}
   */
  _updateFilterValue(ezsKey, value) {
    let hasFilter = this.state.activeFilters.has(ezsKey)
    if (!hasFilter) return

    if (typeof value === 'string') value = value.trim()
    else value = ''

    let filterIndex = findIndexOfMap(ezsKey, this.state.activeFilters)
    if (filterIndex == null) return

    this.state.activeFilters.set(ezsKey, value)

    this._updateOptions({
      selectIndex: filterIndex,
      updateSelectValue: true,
      forcePending: true,
    })
  }

  _clearAllCache() {
    ls.remove('selectedItem')
    this.options.filterKeys.forEach(key => ls.remove(key))
  }

  _setupListeners() {
    // dropdown toggle
    this.setAttribute('aria-expanded', 'false')
    for (let i = 0, len = this.elements.toggleOpen.length; i < len; i++) {
      const btn = this.elements.toggleOpen[i]
      btn.addEventListener(
        'click',
        () => {
          this.setAttribute(
            'aria-expanded',
            this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true',
          )
        },
        { signal: this._ac.signal },
      )
    }

    const selects = this.elements.selects
    let firstOptions = selects.map((select, idx) => {
      // @ts-expect-error
      select.__ezs_index = idx

      let firstOption = select.options[0]
      if (firstOption) {
        firstOption.value = ''
        return firstOption
      }

      firstOption = new Option('All', '', true, true)
      return firstOption
    })

    for (let i = 0, len = selects.length; i < len; i++) {
      const select = selects[i]
      select.addEventListener('change', this._handleChange, { signal: this._ac.signal })
      select.options.length = 1
      select.options[0] = firstOptions[i]
    }

    // submit
    this.elements.form.addEventListener('submit', e => {
      e.preventDefault()
      e.stopPropagation()
      if (this.state.allSelected) {
        this._afterOptionsUpdate()

        EzsearchGlobalV2.instances.forEach(instance => {
          if (instance != this) {
            if (instance.state.allSelected) {
              instance._afterOptionsUpdate()
            }
          }
        })
      }
    })

    // reset selects
    for (let i = 0, len = this.elements.resetBtns.length; i < len; i++) {
      const btn = this.elements.resetBtns[i]
      const isAnchor = btn instanceof HTMLAnchorElement
      const clearSelection = btn.getAttribute(CONSTS.ATTR.clear_selection) === 'true'
      btn.addEventListener('click', () => {
        this._resetSelects(clearSelection, isAnchor)
        EzsearchGlobalV2.instances.forEach(instance => {
          if (instance != this) {
            instance._resetSelects(clearSelection, isAnchor)
          }
        })
      })
    }

    this._updateOptions({ selectIndex: -1 })
  }

  /**
   *
   * @param {boolean} [clearSelection=false]
   * @param {boolean} [isAnchor=false]
   */
  _resetSelects(clearSelection = false, isAnchor = false) {
    const selects = this.elements.selects
    if (clearSelection) {
      this._clearAllCache()
      this._updateFilterValue(this.options.filterKeys[0], '')
    }

    // page will be reloaded, so don't need to do this
    if (!isAnchor) {
      this._afterOptionsUpdate({ forcePending: true })
      selects[0].focus()
    }
  }

  /**
   * @param {string | string[]} productTags
   * @returns {'fits' | 'not-fits' | 'loading' | 'no-selection'}
   */
  fits(productTags) {
    // if (!this.is_mounted) return 'loading'
    if (!this.singletonData?.data?.tree) return 'loading'

    const tag = this.state.selectedItem?._tag
    if (!tag) return 'no-selection'

    if (typeof productTags === 'string' || Array.isArray(productTags)) {
      const list = Array.isArray(productTags) ? productTags : productTags.split(',')
      return list.includes(tag) ? 'fits' : 'not-fits'
    }

    throw new Error('ezsearch: Please pass the `tags` argument (string | string[])')
  }
}

/*  --------------------------------------------------------------------- */

/**
 *
 * @param {{tag: string, collectionHandle: string, legacySearch: boolean}} tag
 */
function filteredProductPathname({ tag, collectionHandle, legacySearch }) {
  if (legacySearch) {
    return `/collections/${collectionHandle || 'all'}/${tag}`
  }
  return `/collections/${collectionHandle || 'all'}?filter.p.tag=${tag}`
}

/**
 * @param {HTMLElement} rootNode
 */
function validatedValues(rootNode) {
  const filterSelects = Array.from(rootNode.querySelectorAll(`select[${CONSTS.ATTR.filter}]`))

  /** @type {Array<string>} */
  const filterKeys = filterSelects.reduce((acc, select) => {
    const key = select.getAttribute(CONSTS.ATTR.filter)
    if (key) acc.push(key.trim())

    return acc
  }, /** @type {string[]} */ ([]))

  if (filterKeys.length < 1 || filterSelects.length !== filterKeys.length) {
    throw new Error('ezsearch: Filter keys/selects mismatch')
  }

  const filterKeysSortBy = filterSelects.map(select => {
    const desc = select.getAttribute(CONSTS.ATTR.sort_by) === 'desc'
    return { desc }
  })

  const configUrl = rootNode.getAttribute(CONSTS.ATTR.config_url)
  if (!configUrl) throw new Error('ezsearch: data-ezs-config-url must be specified')

  const legacySearch = rootNode.getAttribute(CONSTS.ATTR.legacy_search) === 'true'
  const hasCsvHeaders = rootNode.getAttribute(CONSTS.ATTR.csv_headers) === 'true'
  const collectionHandle = rootNode.getAttribute(CONSTS.ATTR.coll_handle) || 'all'
  const resetNextSelectsOnChange =
    rootNode.getAttribute(CONSTS.ATTR.reset_next_selects_on_change) === 'true'
  const autoSearch = rootNode.getAttribute(CONSTS.ATTR.auto_search) === 'true'

  const createPathname = userDefinedOptions?.filteredProductPathname || filteredProductPathname

  /** @type {number} */
  let cacheSeconds = /** @type {any} */ (rootNode.getAttribute(CONSTS.ATTR.cache_seconds))
  if (typeof cacheSeconds === 'string') {
    cacheSeconds = Number(cacheSeconds) || 300
  }
  cacheSeconds = typeof cacheSeconds === 'number' ? Math.max(Math.trunc(cacheSeconds), 0) : 0
  const preClearCache = rootNode.getAttribute(CONSTS.ATTR.pre_clear_cache) === 'true'
  const canCache =
    typeof cacheSeconds === 'number' && !Number.isNaN(cacheSeconds) && cacheSeconds > 0

  return {
    filterSelects,
    filterKeys,
    filterKeysSortBy,
    configUrl,
    hasCsvHeaders,
    collectionHandle,
    createPathname,
    legacySearch,
    cacheSeconds,
    canCache,
    preClearCache,
    resetNextSelectsOnChange,
    autoSearch,
  }
}

/**
 *
 * @param {Array<string[]>} parsedCsv
 * @param {ValidatedValues} options
 */
function createFiltersTreeFromCsv(parsedCsv, options) {
  const {
    hasCsvHeaders,
    filterKeys,
    collectionHandle,
    createPathname,
    legacySearch,
    filterKeysSortBy,
  } = options

  if (hasCsvHeaders || filterKeys.every((k, i) => parsedCsv[0][i] === k)) {
    parsedCsv = parsedCsv.slice(1)
  }

  let allValid = true
  let filterKeysCount = filterKeys.length

  let yearKeyIndex = filterKeys.findIndex(key => key.toLowerCase() === 'year')

  /** @type {Array<Array<string | number>>} */
  let fixedCsv = parsedCsv
  // has hear? - then parse it
  if (yearKeyIndex !== -1) {
    fixedCsv = parsedCsv.reduce((list, line) => {
      const yearValue = line[yearKeyIndex]

      // 2010-2015
      const isRange = yearValue.includes('-')
      if (!isRange) {
        list.push(line)
        return list
      }

      let [startYear, endYear] = yearValue
        .split('-')
        .map(x => Number(x))
        .reduce((list, num) => {
          list.push(Number.isNaN(num) ? null : num)
          return list
        }, /** @type {Array<number | null>} */ ([]))

      if (startYear && endYear) {
        for (let year = startYear; year <= endYear; year++) {
          list.push(line.map((value, i) => (i === yearKeyIndex ? year : value)))
        }
        return list
      }

      if (!endYear) {
        if (startYear) {
          const startYear_ = startYear // reassign for closure - typescript / jsdoc fix..
          list.push(line.map((value, i) => (i === yearKeyIndex ? startYear_ : value)))
          return list
        }
      }

      return list
    }, /** @type {Array<Array<string | number>>} */ ([]))
  }

  let parsed = fixedCsv.map(line => {
    if (allValid && line.length - 1 !== filterKeysCount) {
      log.error('CSV data and `filterKeys` mismatch', {
        filterKeys,
        line: line,
      })

      allValid = false
    }

    if (!allValid) return []

    // last item is the value
    let value = line[filterKeys.length]
    if (typeof value === 'string') {
      if (value.startsWith('>>')) {
        value = value.slice(2)
        line[filterKeys.length] = value
      }

      const defaultColPrefix = '/collections/all/'
      if (value.startsWith(defaultColPrefix)) {
        value = value.slice(defaultColPrefix.length)
      }

      const maybeSupported = value.includes('$$$')
      if (maybeSupported) {
        const [tag] = value.split('$$$')
        if (tag) {
          value = tag
          line[filterKeys.length] = value
        } else {
          return []
        }
      }
    }

    let item = line.reduce((acc, value, idx) => {
      let label = filterKeys[idx]

      if (label) {
        acc[label] = value
      } else {
        // must be the last value (product tag or collection url)
        if (typeof value === 'string') {
          const tag = last(value.split('/')) // split is not needed, but needed for backward compat reasons
          acc._tag = tag
          acc._path = createPathname({ tag, collectionHandle, legacySearch })
        }
      }

      return acc
    }, /** @type {{ [key: string]: string | number }} */ ({}))

    return item
  })

  if (!allValid) {
    throw new Error('ezsearch: CSV data and `filterKeys` mismatch')
  }

  const tree = createFiltersTree({
    data: parsed,
    path: [],
    keys: filterKeys,
    keysSort: filterKeysSortBy,
  })

  return { tree, parsedData: parsed }
}
