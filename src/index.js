import { EzsearchFitmentV2 } from './ezsearch-fitment-v2.js'
import { EzsearchGlobalV2 } from './ezsearch-v2.js'

if (!window.customElements.get('ezsearch-global-v2')) {
  window.customElements.define('ezsearch-global-v2', EzsearchGlobalV2)
}

if (!window.customElements.get('ezsearch-fitment-v2')) {
  window.customElements.define('ezsearch-fitment-v2', EzsearchFitmentV2)
}

export { EzsearchGlobalV2, EzsearchFitmentV2 }