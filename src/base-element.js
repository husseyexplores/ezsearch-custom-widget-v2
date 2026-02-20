export class BaseElement extends HTMLElement {
  constructor() {
    super()
    this._connected = false
    /** @type {AbortController} */
    this._ac = /** @type {any} */ (null)

    /** @type {boolean} */
    this.is_mounted = false
  }

  async connectedCallback() {
    this._connected = true
    await Promise.resolve()
    if (!this._connected) return

    this._ac && !this._ac.signal.aborted && this._ac.abort()
    this._ac = new AbortController()

    /** @type {any} */
    let x = this.mount()
    if (x instanceof Promise) {
      x = await x
    }

    if (x !== false) {
      this._aftermount()
    }

    this.is_mounted = true
  }

  /**
   *
   * @returns {boolean | Promise<boolean> | void | Promise<void>}
   */
  mount() {}
  unmount() {}

  _aftermount() {
    this.setAttribute('hydrated', 'true')
  }
  _afterunmount() {
    this.setAttribute('hydrated', 'false')
  }

  async disconnectedCallback() {
    this._connected = false
    await Promise.resolve()
    if (this._connected) return

    this._ac && !this._ac.signal.aborted && this._ac.abort()
    // @ts-expect-error
    this._ac = null
    this.unmount()
    this._afterunmount()

    this.is_mounted = false
  }
}
