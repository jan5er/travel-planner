import { useState } from 'react'

const ConfirmDeleteModal = ({
    title = 'Confirm Delete',
    message = 'Type DELETE to confirm',
    confirmPhrase = 'DELETE',
    onCancel,
    onConfirm,
    loading = false,
    error = null
}) => {
    const [input, setInput] = useState('')

    const matches = input.trim() === confirmPhrase

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                        <p className="modal-subtitle">{message}</p>
                    </div>
                    <button className="modal-close" onClick={onCancel}>✕</button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="form-group">
                    <label>Confirmation</label>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={`Type ${confirmPhrase} to confirm`}
                        autoFocus
                    />
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        className="btn-danger"
                        onClick={onConfirm}
                        disabled={!matches || loading}
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDeleteModal
