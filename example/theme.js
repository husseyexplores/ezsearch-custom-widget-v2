;(() => {
  const modal = document.getElementById('global-fitment-modal')
  window._ezs_change_vehicle_fn = function _ezs_change_vehicle_fn(openerElement) {
    modal.open(openerElement)
  }

  const fitmentForm = modal.querySelector('.EZS_form')
  fitmentForm.addEventListener('submit', () => {
    modal.close()
  })
})();