import './PaymentButton.css'

function PaymentButton({ type, disabled, isLoading, price }) {
  return (
    <button
      type={type || 'button'}
      className="payment-button"
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className="button-loading">
          <span className="spinner"></span>
          Обработка...
        </span>
      ) : (
        <span>
          Оплатить и опубликовать — {price} ₽
        </span>
      )}
    </button>
  )
}

export default PaymentButton

