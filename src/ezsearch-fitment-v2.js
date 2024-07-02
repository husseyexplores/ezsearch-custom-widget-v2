// @ts-check
import { BaseElement } from './base-element.js'
import { EzsearchGlobalV2 } from './ezsearch-v2.js'

export class EzsearchFitmentV2 extends BaseElement {
  constructor() {
    super()
    this.onUpdate = this.onUpdate.bind(this)

    /** @type {string[]} */
    this.tags = /** @type {any} */ (null)

    /**
     * @type {{
     *   parentWidget: EzsearchGlobalV2,
     *   itemTitles: Array<HTMLElement>,
     *   filteredHrefs: Array<HTMLAnchorElement>,
     *   resetBtns: Array<HTMLButtonElement>
     * }}
     * */
    this.elements = {
      parentWidget: /** @type {any} */ (null),
      itemTitles: /** @type {any} */ (null),
      filteredHrefs: /** @type {any} */ (null),
      resetBtns: /** @type {any} */ (null),
    }
  }

  mount() {
    const widgetId = this.getAttribute('data-ezs-widget-id')
    if (!widgetId) throw new Error('ezsearch-fitment: data-ezs-widget-id must be specified')
    this.tags = (this.getAttribute('data-tags') || '').split(',')

    if (!this.tags.length) throw new Error('ezsearch-fitment: data-tags must be specified')

    /** @type {EzsearchGlobalV2} */
    this.elements.parentWidget = /** @type {any} */ (document.getElementById(widgetId))
    if (!this.elements.parentWidget) throw new Error('ezsearch-fitment: parent widget not found')

    this.elements.itemTitles = Array.from(this.querySelectorAll('[data-ezs-item-title]'))
    this.elements.filteredHrefs = Array.from(this.querySelectorAll('[data-ezs-filtered-href]'))
    this.elements.resetBtns = /** @type {any} */ (
      Array.from(this.querySelectorAll('[data-ezs-goto-mode="selection"]'))
    )

    if (this.unsubscribe) this.unsubscribe()
    this.unsubscribe = this.elements.parentWidget.subscribe(this.onUpdate)

    for (let i = 0, len = this.elements.resetBtns.length; i < len; i++) {
      const resetBtn = this.elements.resetBtns[i]
      resetBtn.addEventListener(
        'click',
        () => {
          const parent = this.elements.parentWidget
          if (parent) {
            parent._resetAllInstances(false, false)
          }
        },
        { signal: this._ac.signal },
      )
    }

    return true
  }

  unmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  /** @param {import('./ezsearch-v2.js').SubscribersInput} data */
  onUpdate({ selectedItemTitle, filteredCollectionHref }) {
    const fitmentStatus = this.elements.parentWidget.fits(this.tags)
    this.setAttribute('data-fitment-status', fitmentStatus)

    for (let i = 0, len = this.elements.itemTitles.length; i < len; i++) {
      const el = this.elements.itemTitles[i]
      // @ts-expect-error
      const fallbackText =
        typeof el.__ezs_fallback_text === 'undefined'
          ? (el.__ezs_fallback_text = el.getAttribute('data-fallback-text'))
          : el.__ezs_fallback_text
      const title = selectedItemTitle || fallbackText
      el.textContent = title
      title ? el.setAttribute('title', title) : el.removeAttribute('title')
    }

    for (let i = 0, len = this.elements.filteredHrefs.length; i < len; i++) {
      const el = this.elements.filteredHrefs[i]
      el.href = filteredCollectionHref || '#'
    }
  }
}
