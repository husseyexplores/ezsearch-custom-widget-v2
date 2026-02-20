(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.EZSearchV2 = {}));
})(this, function(exports2) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

  class BaseElement extends HTMLElement {
    constructor() {
      super();
      this._connected = false;
      this._ac = /** @type {any} */
      null;
      this.is_mounted = false;
    }
    async connectedCallback() {
      this._connected = true;
      await Promise.resolve();
      if (!this._connected)
        return;
      this._ac && !this._ac.signal.aborted && this._ac.abort();
      this._ac = new AbortController();
      let x = this.mount();
      if (x instanceof Promise) {
        x = await x;
      }
      if (x !== false) {
        this._aftermount();
      }
      this.is_mounted = true;
    }
    /**
     *
     * @returns {boolean | Promise<boolean> | void | Promise<void>}
     */
    mount() {
    }
    unmount() {
    }
    _aftermount() {
      this.setAttribute("hydrated", "true");
    }
    _afterunmount() {
      this.setAttribute("hydrated", "false");
    }
    async disconnectedCallback() {
      this._connected = false;
      await Promise.resolve();
      if (this._connected)
        return;
      this._ac && !this._ac.signal.aborted && this._ac.abort();
      this._ac = null;
      this.unmount();
      this._afterunmount();
      this.is_mounted = false;
    }
  }
  const typeOf = (x) => Object.prototype.toString.call(x).slice(8, -1);
  const isObject = (x) => typeOf(x) === "Object";
  let LOG_PREFIX = "[EZSearch] :: ";
  function log(...x) {
    return console.log(LOG_PREFIX, ...x);
  }
  log.warn = (...x) => console.warn(LOG_PREFIX, ...x);
  log.info = (...x) => console.info(LOG_PREFIX, ...x);
  log.error = (...x) => console.error(LOG_PREFIX, ...x);
  const _fetchCache = {};
  async function fetchCached(url, onResponse) {
    const cleanUrl = url.replace(/\\\//g, "/");
    if (_fetchCache[cleanUrl])
      return _fetchCache[cleanUrl].then((r) => onResponse(r.clone()));
    const res = fetch(cleanUrl);
    _fetchCache[cleanUrl] = res;
    return res.then((r) => onResponse(r.clone()));
  }
  function parseCSV(str) {
    let arr = [];
    let quote = false;
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c + 1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || "";
      if (cc == '"' && quote && nc == '"') {
        arr[row][col] += cc;
        ++c;
        continue;
      }
      if (cc == '"') {
        quote = !quote;
        continue;
      }
      if (cc == "," && !quote) {
        ++col;
        continue;
      }
      if (cc == "\r" && nc == "\n" && !quote) {
        ++row;
        col = 0;
        ++c;
        continue;
      }
      if (cc == "\n" && !quote) {
        ++row;
        col = 0;
        continue;
      }
      if (cc == "\r" && !quote) {
        ++row;
        col = 0;
        continue;
      }
      arr[row][col] += cc;
    }
    return arr;
  }
  async function fetchCsv(url) {
    return await fetchCached(url, async (res) => {
      if (!res.ok) {
        throw new Error("ezsearch: Unable to fetch CSV");
      }
      const text = await res.text();
      const parsedCsv = parseCSV(text);
      return parsedCsv;
    });
  }
  function safeJsonParse(text, fallbackText = "null") {
    try {
      return JSON.parse(text || fallbackText);
    } catch (error) {
      return typeof fallbackText === "string" ? JSON.parse(fallbackText) : fallbackText;
    }
  }
  function findIndexOfMap(label, map) {
    let idx = 0;
    let matchedIdx = null;
    map.forEach((value, key) => {
      if (key === label && matchedIdx == null)
        matchedIdx = idx;
      idx++;
    });
    return matchedIdx;
  }
  function last(list) {
    return list[list.length - 1];
  }
  function createCollectionPathname({ tag, collectionHandle, queryParams }) {
    let legacy_link = `/collections/${collectionHandle || "all"}/${tag}`;
    if (queryParams)
      legacy_link += `?${queryParams}`;
    let new_link = `/collections/${collectionHandle || "all"}?filter.p.tag=${tag}`;
    if (queryParams)
      new_link += `&${queryParams}`;
    return {
      legacy: legacy_link,
      new: new_link
    };
  }
  const CONSTS = (
    /** @type {const} */
    {
      ATTR: {
        id: "data-ezs-id",
        db_url: "data-ezs-db-url",
        legacy_search: "data-legacy-search",
        filter: "data-ezs-filter",
        config_url: "data-ezs-config-url",
        coll_handle: "data-ezs-collection-handle",
        reset_next_selects_on_change: "data-ezs-reset-next-selects-on-change",
        auto_search: "data-ezs-autosearch",
        csv_headers: "data-ezs-has-csv-headers",
        filtered_link: "data-ezs-filtered-link",
        item_title: "data-ezs-item-title",
        filter_trigger_verify: "data-ezs-trigger-verify",
        goto_pending: "data-ezs-goto-pending",
        goto_base_collection: "data-ezs-goto-base-collection",
        pre_clear_cache: "data-ezs-clear-cache",
        clear_selection: "data-ezs-clear-selection",
        cache_seconds: "data-ezs-cache-seconds",
        prod_tags: "data-ezs-product-tags",
        fitment_widget: "data-ezs-fitment",
        sort_by: "data-ezs-sort",
        // "desc"
        toggle_open: "data-ezs-toggle-open",
        loading_btn_class: "data-ezs-loading-class",
        legacy_collections: "data-ezs-legacy-cols"
      }
    }
  );
  function iterateOverObjectTree(obj, fn, level = 0) {
    if (isObject(obj)) {
      let allKeys = Object.keys(obj);
      allKeys.forEach((k) => {
        let v = obj[k];
        iterateOverObjectTree(v, fn, level + 1);
      });
      fn(obj, allKeys, level);
    }
    if (Array.isArray(obj)) {
      obj.forEach((o) => {
        iterateOverObjectTree(o, fn, level);
      });
    }
    return obj;
  }
  function createFiltersTree({
    data,
    keys = [],
    path = [],
    keysSort = []
  }) {
    let res = {};
    keys.forEach((k, keyIndex) => {
      let isLastKeyIndex = keyIndex === keys.length - 1;
      data.forEach((item) => {
        if (!item)
          return;
        let obj = path.reduce((x, k2) => x[k2], item);
        if (!obj)
          return;
        let value = obj[k];
        if (typeof value == "number")
          value = value.toString();
        if (typeof value !== "string" || value === "")
          return;
        let resInnerObj = keys.slice(0, keyIndex).reduce((x, k2) => x[obj[k2]], res);
        if (!resInnerObj)
          return;
        if (isLastKeyIndex) {
          const rootValue = new RootValue(item);
          if (resInnerObj[value]) {
            if (Array.isArray(resInnerObj[value])) {
              resInnerObj[value].push(rootValue);
            } else {
              resInnerObj[value] = [resInnerObj[value], rootValue];
            }
          } else {
            resInnerObj[value] = rootValue;
          }
        } else {
          resInnerObj[value] = {};
        }
      });
    });
    return Object.keys(res).length > 0 ? iterateOverObjectTree(res, (obj, keys2, levelIndex) => {
      if (!obj._tag) {
        const desc = keysSort[levelIndex]?.desc;
        obj._keys_ = keys2.sort(
          (a, b) => desc ? b.localeCompare(a) : a.localeCompare(b)
        );
      }
    }) : res;
  }
  function isFilterSelectable(selectedValues, index) {
    if (index < 0 || index >= selectedValues.length)
      return false;
    let slice = selectedValues.slice(0, index);
    const isTuple = Array.isArray(selectedValues[0]);
    return isTuple ? slice.every(([key, value]) => !!value) : slice.every((v) => !!v);
  }
  function getCurrentFilterObject({ selectedValues, index, filterTree }) {
    let selectable = isFilterSelectable(selectedValues, index);
    if (!selectable)
      return null;
    if (selectable) {
      const isTuple = Array.isArray(selectedValues[0]);
      let res = selectedValues.slice(0, index).reduce((x, maybeTuple) => {
        if (x == null)
          return null;
        let value = isTuple ? maybeTuple[1] : maybeTuple;
        return x[value];
      }, filterTree);
      return res;
    }
  }
  function getSelectedItem({ keys, filterTree, activeFilters }) {
    return keys.reduce((value, label) => {
      let filterValue = activeFilters.get(label);
      if (!filterValue)
        return null;
      return value?.[filterValue] || null;
    }, filterTree);
  }
  class RootValue {
    constructor(value) {
      this.value = value;
    }
  }
  const getKey = (key) => `ezs_${key}`;
  const expiryKey = (key) => `${key}__expiresIn`;
  function remove(key) {
    const _key = getKey(key);
    window.localStorage.removeItem(_key);
    window.localStorage.removeItem(expiryKey(_key));
    return true;
  }
  function get(key) {
    const _key = getKey(key);
    let now = Date.now();
    let expiresIn = Number(window.localStorage.getItem(expiryKey(_key)) || "0");
    if (expiresIn < now) {
      remove(_key);
      return null;
    } else {
      return window.localStorage.getItem(_key);
    }
  }
  function set(key, value, expires = 60 * 5) {
    const _key = getKey(key);
    expires = Math.abs(expires);
    let now = Date.now();
    let expiry = now + expires * 1e3;
    window.localStorage.setItem(_key, value);
    window.localStorage.setItem(expiryKey(_key), expiry);
    return true;
  }
  const cache = {};
  const _widgetIds = [];
  const _EzsearchGlobalV2 = class _EzsearchGlobalV2 extends BaseElement {
    constructor() {
      super();
      this.uid = this.id || this.getAttribute(CONSTS.ATTR.id);
      if (!this.uid)
        throw new Error(`ezsearch: id must be specified (\`id\` | \`${CONSTS.ATTR.id}\`)`);
      this.elements = /** @type {any} */
      {
        form: (
          /** @type {any} */
          null
        ),
        selects: (
          /** @type {any} */
          null
        ),
        toggleOpen: (
          /** @type {any} */
          null
        ),
        submitBtns: (
          /** @type {any} */
          null
        ),
        resetBtns: (
          /** @type {any} */
          null
        ),
        itemTitles: (
          /** @type {any} */
          null
        ),
        filteredHrefs: (
          /** @type {any} */
          null
        )
      };
      this.options = /** @type {any} */
      null;
      this.singletonData = /** @type {any} */
      null;
      this.state = {
        activeFilters: (
          /** @type {any} */
          null
        ),
        allSelected: false,
        selectedItem: null,
        selectedItemTitle: null,
        filteredCollectionHref: null
      };
      this._handleChange = this._handleChange.bind(this);
      this._handleChangeFn = this._handleChangeFn.bind(this);
    }
    /**
     *
     * @param {(data: SubscribersInput) => void} fn
     * @returns {() => void}
     */
    subscribe(fn, initualRun = true) {
      const subscribers = this.singletonData?.subscribers;
      if (!subscribers)
        throw new Error("ezsearch: not initialized");
      subscribers.push(fn);
      if (initualRun !== false)
        fn(this.state);
      return () => {
        const subscribers2 = this.singletonData?.subscribers;
        if (!subscribers2)
          throw new Error("ezsearch: not initialized");
        const index = subscribers2.indexOf(fn);
        if (index > -1)
          subscribers2.splice(index, 1);
      };
    }
    _runSubscribers() {
      const subs = this.singletonData.subscribers;
      for (let i = 0, len = subs.length; i < len; i++) {
        const fn = subs[i];
        fn(this.state);
      }
    }
    async mount() {
      this.elements.form = /** @type {any} */
      this.querySelector("form[data-ezs-form]");
      this.elements.selects = /** @type {any} */
      Array.from(this.querySelectorAll("select[data-ezs-filter]"));
      this.elements.toggleOpen = /** @type {any} */
      Array.from(this.querySelectorAll("[data-ezs-toggle-open]"));
      this.elements.submitBtns = /** @type {any} */
      Array.from(this.elements.form.querySelectorAll('[type="submit"]'));
      this.elements.resetBtns = /** @type {any} */
      Array.from(this.querySelectorAll('[data-ezs-goto-mode="selection"]'));
      this.elements.itemTitles = /** @type {any} */
      Array.from(this.querySelectorAll("[data-ezs-item-title]"));
      this.elements.filteredHrefs = /** @type {any} */
      Array.from(this.querySelectorAll("[data-ezs-filtered-href]"));
      this.options = validatedValues(this);
      const { configUrl, filterKeys, canCache, preClearCache } = this.options;
      let { dbUrl } = this.options;
      let singletonData = cache[this.uid];
      if (!singletonData) {
        _widgetIds.push(this.uid);
        singletonData = { subscribers: [], data: (
          /** @type {any} */
          null
        ), _loaded: false };
        cache[this.uid] = singletonData;
        this.singletonData = singletonData;
        if (!_EzsearchGlobalV2.instances.includes(this)) {
          _EzsearchGlobalV2.instances.push(this);
        }
      }
      if (!singletonData.data) {
        if (!dbUrl) {
          const ezsearchSettings = await fetchCached(configUrl, (res) => res.json());
          dbUrl = ezsearchSettings?.settings?.form?.db;
          if (!dbUrl) {
            console.log("ezsearch: data", singletonData.data);
            throw new Error("ezsearch: unable to fetch db url");
          }
        }
        this.options.dbUrl = dbUrl;
        singletonData.data = await fetchCsv(dbUrl).then((parsedCsv) => {
          return createFiltersTreeFromCsv(parsedCsv, this.options);
        });
      }
      this.state.activeFilters = new Map(
        Array.from({ length: filterKeys.length }, (_, i) => [
          filterKeys[i],
          !canCache || preClearCache ? "" : get(filterKeys[i]) || ""
        ])
      );
      this._setupListeners();
      return true;
    }
    unmount() {
    }
    _updateOptions({
      selectIndex,
      updateSelectValue = false,
      forcePending = false,
      _initial_setup = false,
      autoSearch = this.options.autoSearch
    }) {
      let activeFiltersList = [...this.state.activeFilters];
      activeFiltersList.forEach(([label, filterValue], idx) => {
        const filterObject = getCurrentFilterObject({
          selectedValues: activeFiltersList,
          index: idx,
          filterTree: this.singletonData.data.tree
        });
        if (!filterObject?.[filterValue])
          this.state.activeFilters.set(label, "");
        const isNextSelect = idx > selectIndex;
        const select = this.elements.selects[idx];
        const filterOptions = filterObject?._keys_ || [];
        const hasFilterOptions = Array.isArray(filterOptions) && filterOptions.length > 0;
        select.disabled = !hasFilterOptions;
        if (this.options.canCache) {
          if (filterValue) {
            set(label, filterValue, this.options.cacheSeconds);
          } else {
            remove(label);
          }
        }
        let sameOptions = selectIndex === -1 || updateSelectValue ? false : !isNextSelect ? true : this.options.resetNextSelectsOnChange ? false : filterOptions.length === select.options.length - 1 && filterOptions.every((opt, i) => opt === select.options[i + 1].value);
        if (!sameOptions) {
          select.options.length = 1;
          filterOptions.forEach((opt, i) => {
            select.options[i + 1] = new Option(opt, opt);
          });
          select.value = this.state.activeFilters.get(label) || "";
          requestAnimationFrame(() => {
          });
        }
      });
      this.state.allSelected = [...this.state.activeFilters].every(([, filterValue]) => !!filterValue);
      this.setAttribute("data-ezs-selected-filters", this.state.allSelected ? "all" : "partial");
      if (!this.state.allSelected) {
        this.setAttribute("data-ezs-state", "pending");
      }
      if (forcePending || selectIndex === -1) {
        this._afterOptionsUpdate({
          forcePending
          // preventAutosearch: selectIndex === -1,
        });
      }
      if (this.state.allSelected) {
        this._afterOptionsUpdate();
        this.elements.form.dispatchEvent(new Event("submit"));
        if (this.options.autoSearch) {
          this.dispatchEvent(
            new CustomEvent("ezsearch::_internal_submit", {
              bubbles: false,
              detail: { _initial_setup, autoSearch }
            })
          );
        }
      }
      this.singletonData?._loaded && this.dispatchEvent(
        new CustomEvent("ezsearch::select_update", {
          detail: {
            index: selectIndex,
            select: this.elements.selects[selectIndex]
          },
          bubbles: false,
          cancelable: false
        })
      );
      if (_initial_setup && !this.singletonData._loaded) {
        this.singletonData._loaded = true;
        this.dispatchEvent(new CustomEvent("ezsearch::loaded", { bubbles: false, cancelable: false }));
        this._afterOptionsUpdate();
      }
    }
    _afterOptionsUpdate({ forcePending = false, fromCache = false } = {}) {
      const selectedItemRoot = forcePending ? null : fromCache ? safeJsonParse(get("selectedItem"), "null") : getSelectedItem({
        keys: this.options.filterKeys,
        activeFilters: this.state.activeFilters,
        filterTree: this.singletonData.data.tree
      });
      const selectedItem = selectedItemRoot instanceof RootValue ? selectedItemRoot.value : null;
      const href = selectedItem?._path || "";
      const tag = selectedItem?._tag || "";
      this.state.selectedItem = selectedItem;
      this.state.selectedItemTitle = selectedItem ? this.options.filterKeys.map((key) => this.state.activeFilters.get(key)).join(" ") : "";
      this.state.filteredCollectionHref = href;
      this.setAttribute("data-ezs-state", selectedItem ? "selected" : "pending");
      for (let i = 0, len = this.elements.itemTitles.length; i < len; i++) {
        const el = this.elements.itemTitles[i];
        const fallbackText = (
          // @ts-expect-error
          typeof el.__ezs_fallback_text === "undefined" ? (
            // @ts-expect-error
            el.__ezs_fallback_text = el.getAttribute("data-fallback-text")
          ) : (
            // @ts-expect-error
            el.__ezs_fallback_text
          )
        );
        const title = this.state.selectedItemTitle || fallbackText;
        el.textContent = title;
        title ? el.setAttribute("title", title) : el.removeAttribute("title");
      }
      for (let i = 0, len = this.elements.filteredHrefs.length; i < len; i++) {
        const el = this.elements.filteredHrefs[i];
        if (el instanceof HTMLAnchorElement) {
          const anchorCollectionHandle = el.getAttribute(CONSTS.ATTR.coll_handle);
          const anchorLegacySearch = el.getAttribute("data-ezs-legacy");
          this.options.legacySearch;
          let _href = anchorCollectionHandle || anchorLegacySearch != null ? createCollectionPathname({
            tag,
            collectionHandle: anchorCollectionHandle
          }).legacy : href;
          el.setAttribute("href", _href);
          el.toggleAttribute("disabled", !_href);
        }
      }
      for (let i = 0, len = this.elements.resetBtns.length; i < len; i++) {
        const el = this.elements.resetBtns[i];
        el.toggleAttribute("disabled", !this.state.allSelected);
      }
      this._runSubscribers();
      selectedItem ? set("selectedItem", JSON.stringify(selectedItem)) : remove("selectedItem");
      if (this.singletonData?._loaded) {
        const ev = new CustomEvent("ezsearch::selection_update", {
          detail: {
            selected: selectedItem || null,
            href,
            currentlyAppliedTag: this.options.currentlyAppliedTag,
            selectedItemTitle: this.state.selectedItemTitle
          },
          bubbles: false,
          cancelable: false
        });
        this.dispatchEvent(ev);
      }
    }
    _handleChange(event) {
      const isUserEvent = event?.isTrusted;
      let index = event?.target?.__ezs_index;
      if (typeof index !== "number") {
        log.warn("no `__ezs_index` found");
        return;
      }
      const autoSearch = this.options.autoSearch;
      this._handleChangeFn(index, autoSearch);
      if (isUserEvent) {
        _EzsearchGlobalV2.instances.forEach((instance) => {
          if (instance != this) {
            instance.elements.selects[index].value = this.elements.selects[index].value;
            instance._handleChangeFn(index, autoSearch);
          }
        });
      }
    }
    /**
     *
     * @param {number} index
     * @param {boolean} [autoSearch]
     */
    _handleChangeFn(index, autoSearch) {
      const label = this.options.filterKeys[index];
      let select = this.elements.selects[index];
      const v = select.value;
      v ? this.state.activeFilters.set(label, v) : this.state.activeFilters.set(label, "");
      if (this.options.resetNextSelectsOnChange) {
        [...this.state.activeFilters].forEach(([_label], idx) => {
          if (idx > index)
            this.state.activeFilters.set(_label, "");
        });
      }
      this._updateOptions({ selectIndex: index, autoSearch });
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
      let hasFilter = this.state.activeFilters.has(ezsKey);
      if (!hasFilter)
        return;
      if (typeof value === "string")
        value = value.trim();
      else
        value = "";
      let filterIndex = findIndexOfMap(ezsKey, this.state.activeFilters);
      if (filterIndex == null)
        return;
      this.state.activeFilters.set(ezsKey, value);
      this._updateOptions({
        selectIndex: filterIndex,
        updateSelectValue: true,
        forcePending: true
      });
    }
    _clearAllCache() {
      remove("selectedItem");
      this.options.filterKeys.forEach((key) => remove(key));
    }
    _setupListeners() {
      this.setAttribute("aria-expanded", "false");
      for (let i = 0, len = this.elements.toggleOpen.length; i < len; i++) {
        const btn = this.elements.toggleOpen[i];
        btn.addEventListener(
          "click",
          () => {
            this.setAttribute(
              "aria-expanded",
              this.getAttribute("aria-expanded") === "true" ? "false" : "true"
            );
          },
          { signal: this._ac.signal }
        );
      }
      const selects = this.elements.selects;
      let firstOptions = selects.map((select, idx) => {
        select.__ezs_index = idx;
        let firstOption = select.options[0];
        if (firstOption) {
          firstOption.value = "";
          return firstOption;
        }
        firstOption = new Option("All", "", true, true);
        return firstOption;
      });
      for (let i = 0, len = selects.length; i < len; i++) {
        const select = selects[i];
        select.addEventListener("change", this._handleChange, { signal: this._ac.signal });
        select.options.length = 1;
        select.options[0] = firstOptions[i];
      }
      this.elements.form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const trusted = e.isTrusted;
        if (this.state.allSelected) {
          _EzsearchGlobalV2.instances.forEach((instance) => {
            if (instance.state.allSelected) {
              const canUpdate = trusted || instance != this;
              if (canUpdate) {
                instance._afterOptionsUpdate();
              }
            }
          });
        }
      });
      this.addEventListener("ezsearch::_internal_submit", (e) => {
        e.preventDefault();
        const { _initial_setup, autoSearch } = e.detail;
        if (_initial_setup)
          return;
        if (autoSearch && this.state.filteredCollectionHref) {
          window.location.href = this.state.filteredCollectionHref;
        }
      });
      for (let i = 0, len = this.elements.resetBtns.length; i < len; i++) {
        const btn = this.elements.resetBtns[i];
        const isAnchor = btn instanceof HTMLAnchorElement;
        const clearSelection = btn.getAttribute(CONSTS.ATTR.clear_selection) === "true";
        btn.addEventListener("click", (e) => {
          this._resetAllInstances(clearSelection, isAnchor);
          const gotoBaseCollection = btn.getAttribute("data-ezs-goto-base-collection") === "true";
          if (gotoBaseCollection && this.options.collectionHandle) {
            const continueDefault = isAnchor && btn.href;
            if (!continueDefault) {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/collections/${this.options.collectionHandle}`;
            }
          }
        });
      }
      this._updateOptions({ selectIndex: -1, _initial_setup: true });
    }
    /**
     *
     * @param {boolean} [clearSelection=false]
     * @param {boolean} [isAnchor=false]
     */
    _resetAllInstances(clearSelection = false, isAnchor = false) {
      _EzsearchGlobalV2.instances.forEach((instance) => {
        instance._resetSelects(clearSelection, isAnchor);
      });
    }
    /**
     *
     * @param {boolean} [clearSelection=false]
     * @param {boolean} [isAnchor=false]
     */
    _resetSelects(clearSelection = false, isAnchor = false) {
      const selects = this.elements.selects;
      if (clearSelection) {
        this._clearAllCache();
        this._updateFilterValue(this.options.filterKeys[0], "");
      }
      if (!isAnchor) {
        this._afterOptionsUpdate({ forcePending: true });
        selects[0].focus();
      }
    }
    /**
     * @param {string | string[]} productTags
     * @returns {'fits' | 'not-fits' | 'loading' | 'no-selection'}
     */
    fits(productTags) {
      if (!this.singletonData?.data?.tree)
        return "loading";
      const tag = this.state.selectedItem?._tag;
      if (!tag)
        return "no-selection";
      if (typeof productTags === "string" || Array.isArray(productTags)) {
        const list = Array.isArray(productTags) ? productTags : productTags.split(",");
        return list.includes(tag) ? "fits" : "not-fits";
      }
      throw new Error("ezsearch: Please pass the `tags` argument (string | string[])");
    }
  };
  __publicField(_EzsearchGlobalV2, "instancesCache", cache);
  __publicField(_EzsearchGlobalV2, "widgetIds", _widgetIds);
  /** @type {Array<EzsearchGlobalV2>} */
  __publicField(_EzsearchGlobalV2, "instances", []);
  let EzsearchGlobalV2 = _EzsearchGlobalV2;
  function validatedValues(rootNode) {
    const filterSelects = Array.from(rootNode.querySelectorAll(`select[${CONSTS.ATTR.filter}]`));
    const filterKeys = filterSelects.reduce(
      (acc, select) => {
        const key = select.getAttribute(CONSTS.ATTR.filter);
        if (key)
          acc.push(key.trim());
        return acc;
      },
      /** @type {string[]} */
      []
    );
    if (filterKeys.length < 1 || filterSelects.length !== filterKeys.length) {
      throw new Error("ezsearch: Filter keys/selects mismatch");
    }
    const filterKeysSortBy = filterSelects.map((select) => {
      const desc = select.getAttribute(CONSTS.ATTR.sort_by) === "desc";
      return { desc };
    });
    const configUrl = rootNode.getAttribute(CONSTS.ATTR.config_url);
    const dbUrl = rootNode.getAttribute(CONSTS.ATTR.db_url);
    if (!configUrl && !dbUrl)
      throw new Error("ezsearch: data-ezs-config-url or data-ezs-db-url must be specified");
    const legacySearch = rootNode.getAttribute(CONSTS.ATTR.legacy_search) === "true";
    const hasCsvHeaders = rootNode.getAttribute(CONSTS.ATTR.csv_headers) === "true";
    const collectionHandle = rootNode.getAttribute(CONSTS.ATTR.coll_handle) || "all";
    const resetNextSelectsOnChange = rootNode.getAttribute(CONSTS.ATTR.reset_next_selects_on_change) === "true";
    const autoSearch = rootNode.getAttribute(CONSTS.ATTR.auto_search) === "true";
    const legacyCols = (rootNode.getAttribute(CONSTS.ATTR.legacy_collections)?.split(",") || []).reduce((acc, col) => {
      if (col)
        acc[col] = true;
      return acc;
    }, {});
    let cacheSeconds = (
      /** @type {any} */
      rootNode.getAttribute(CONSTS.ATTR.cache_seconds)
    );
    if (typeof cacheSeconds === "string") {
      cacheSeconds = Number(cacheSeconds) || 300;
    }
    cacheSeconds = typeof cacheSeconds === "number" ? Math.max(Math.trunc(cacheSeconds), 0) : 0;
    const preClearCache = rootNode.getAttribute(CONSTS.ATTR.pre_clear_cache) === "true";
    const canCache = typeof cacheSeconds === "number" && !Number.isNaN(cacheSeconds) && cacheSeconds > 0;
    let restQueryParams = new URLSearchParams(window.location.search);
    restQueryParams.delete("filter.p.tag");
    restQueryParams = restQueryParams.toString();
    if (restQueryParams[0] == "?")
      restQueryParams = restQueryParams.slice(1);
    const url = new URL(window.location.href);
    const parts = url.pathname.split("/");
    const isCollectionPage = parts[1] === "collections" && !(parts[3] == "products" && parts[4]);
    if (isCollectionPage) {
      let newTagApplied = url.searchParams.get("filter.p.tag");
      const legacyTagApplied = !newTagApplied && parts[3] && !parts[4];
      if (newTagApplied && legacySearch) {
        window.location.replace(`/collections/${collectionHandle}/${newTagApplied}`);
      } else if (legacyTagApplied && !legacySearch) {
        window.location.replace(`/collections/${collectionHandle}?filter.p.tag=${newTagApplied}`);
      }
    }
    return {
      filterSelects,
      filterKeys,
      filterKeysSortBy,
      configUrl,
      dbUrl,
      hasCsvHeaders,
      collectionHandle,
      legacySearch,
      cacheSeconds,
      canCache,
      preClearCache,
      resetNextSelectsOnChange,
      autoSearch,
      restQueryParams,
      legacyCols,
      get currentlyAppliedTag() {
        let applied = "";
        const currentUrl = window.location.href;
        const url2 = new URL(currentUrl);
        const pathnameParts = url2.pathname.split("/");
        const isCollectionPage2 = pathnameParts[1] === "collections" && !(pathnameParts[3] == "products" && pathnameParts[4]);
        if (isCollectionPage2) {
          if (legacySearch) {
            if (pathnameParts[3]) {
              applied = pathnameParts[3];
            }
          } else {
            const filterParamValue = url2.searchParams.get("filter.p.tag");
            if (filterParamValue) {
              applied = filterParamValue;
            }
          }
        }
        return applied;
      }
    };
  }
  function createFiltersTreeFromCsv(parsedCsv, options) {
    const {
      hasCsvHeaders,
      filterKeys,
      collectionHandle,
      legacySearch,
      legacyCols,
      filterKeysSortBy,
      restQueryParams
    } = options;
    if (hasCsvHeaders || filterKeys.every((k, i) => parsedCsv[0][i] === k)) {
      parsedCsv = parsedCsv.slice(1);
    }
    let allValid = true;
    let filterKeysCount = filterKeys.length;
    let yearKeyIndex = filterKeys.findIndex((key) => key.toLowerCase() === "year");
    let fixedCsv = parsedCsv;
    if (yearKeyIndex !== -1) {
      fixedCsv = parsedCsv.reduce(
        (list, line) => {
          const yearValue = line[yearKeyIndex];
          const isRange = yearValue.includes("-");
          if (!isRange) {
            list.push(line);
            return list;
          }
          let [startYear, endYear] = yearValue.split("-").map((x) => Number(x)).reduce(
            (list2, num) => {
              list2.push(Number.isNaN(num) ? null : num);
              return list2;
            },
            /** @type {Array<number | null>} */
            []
          );
          if (startYear && endYear) {
            for (let year = startYear; year <= endYear; year++) {
              list.push(line.map((value, i) => i === yearKeyIndex ? year : value));
            }
            return list;
          }
          if (!endYear) {
            if (startYear) {
              const startYear_ = startYear;
              list.push(line.map((value, i) => i === yearKeyIndex ? startYear_ : value));
              return list;
            }
          }
          return list;
        },
        /** @type {Array<Array<string | number>>} */
        []
      );
    }
    let parsed = fixedCsv.map((line) => {
      if (allValid && line.length - 1 !== filterKeysCount) {
        log.error("CSV data and `filterKeys` mismatch", {
          filterKeys,
          line
        });
        allValid = false;
      }
      if (!allValid)
        return [];
      let value = line[filterKeys.length];
      if (typeof value === "string") {
        if (value.startsWith(">>")) {
          value = value.slice(2);
          line[filterKeys.length] = value;
        }
        const defaultColPrefix = "/collections/all/";
        if (value.startsWith(defaultColPrefix)) {
          value = value.slice(defaultColPrefix.length);
        }
        const maybeSupported = value.includes("$$$");
        if (maybeSupported) {
          const [tag] = value.split("$$$");
          if (tag) {
            value = tag;
            line[filterKeys.length] = value;
          } else {
            return [];
          }
        }
      }
      let item = line.reduce(
        (acc, value2, idx) => {
          let label = filterKeys[idx];
          if (label) {
            acc[label] = value2;
          } else {
            if (typeof value2 === "string") {
              const tag = last(value2.split("/"));
              acc._tag = tag;
              const pathname = createCollectionPathname({ tag, collectionHandle, queryParams: restQueryParams });
              acc._path = legacySearch ? pathname.legacy : pathname.new;
              acc._path_new = pathname.new;
              acc._path_legacy = pathname.legacy;
            }
          }
          return acc;
        },
        /** @type {{ [key: string]: string | number }} */
        {}
      );
      return item;
    });
    if (!allValid) {
      throw new Error("ezsearch: CSV data and `filterKeys` mismatch");
    }
    const tree = createFiltersTree({
      data: parsed,
      path: [],
      keys: filterKeys,
      keysSort: filterKeysSortBy
    });
    return { tree, parsedData: parsed };
  }
  class EzsearchFitmentV2 extends BaseElement {
    constructor() {
      super();
      this.onUpdate = this.onUpdate.bind(this);
      this.tags = /** @type {any} */
      null;
      this.elements = {
        parentWidget: (
          /** @type {any} */
          null
        ),
        itemTitles: (
          /** @type {any} */
          null
        ),
        filteredHrefs: (
          /** @type {any} */
          null
        ),
        resetBtns: (
          /** @type {any} */
          null
        )
      };
    }
    mount() {
      const widgetId = this.getAttribute("data-ezs-widget-id");
      if (!widgetId)
        throw new Error("ezsearch-fitment: data-ezs-widget-id must be specified");
      this.tags = (this.getAttribute("data-tags") || "").split(",");
      if (!this.tags.length)
        throw new Error("ezsearch-fitment: data-tags must be specified");
      this.elements.parentWidget = /** @type {any} */
      document.getElementById(widgetId);
      if (!this.elements.parentWidget)
        throw new Error("ezsearch-fitment: parent widget not found");
      this.elements.itemTitles = Array.from(this.querySelectorAll("[data-ezs-item-title]"));
      this.elements.filteredHrefs = Array.from(this.querySelectorAll("[data-ezs-filtered-href]"));
      this.elements.resetBtns = /** @type {any} */
      Array.from(this.querySelectorAll('[data-ezs-goto-mode="selection"]'));
      if (this.unsubscribe)
        this.unsubscribe();
      this.unsubscribe = this.elements.parentWidget.subscribe(this.onUpdate);
      for (let i = 0, len = this.elements.resetBtns.length; i < len; i++) {
        const resetBtn = this.elements.resetBtns[i];
        resetBtn.addEventListener(
          "click",
          () => {
            const parent = this.elements.parentWidget;
            if (parent) {
              parent._resetAllInstances(false, false);
            }
          },
          { signal: this._ac.signal }
        );
      }
      return true;
    }
    unmount() {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    }
    /** @param {import('./ezsearch-v2.js').SubscribersInput} data */
    onUpdate({ selectedItemTitle, filteredCollectionHref }) {
      const fitmentStatus = this.elements.parentWidget.fits(this.tags);
      this.setAttribute("data-fitment-status", fitmentStatus);
      for (let i = 0, len = this.elements.itemTitles.length; i < len; i++) {
        const el = this.elements.itemTitles[i];
        const fallbackText = typeof el.__ezs_fallback_text === "undefined" ? el.__ezs_fallback_text = el.getAttribute("data-fallback-text") : el.__ezs_fallback_text;
        const title = selectedItemTitle || fallbackText;
        el.textContent = title;
        title ? el.setAttribute("title", title) : el.removeAttribute("title");
      }
      for (let i = 0, len = this.elements.filteredHrefs.length; i < len; i++) {
        const el = this.elements.filteredHrefs[i];
        el.href = filteredCollectionHref || "#";
      }
    }
  }
  if (!window.customElements.get("ezsearch-global-v2")) {
    window.customElements.define("ezsearch-global-v2", EzsearchGlobalV2);
  }
  if (!window.customElements.get("ezsearch-fitment-v2")) {
    window.customElements.define("ezsearch-fitment-v2", EzsearchFitmentV2);
  }
  exports2.EzsearchFitmentV2 = EzsearchFitmentV2;
  exports2.EzsearchGlobalV2 = EzsearchGlobalV2;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
