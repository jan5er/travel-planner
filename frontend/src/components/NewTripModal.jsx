import { useState } from 'react'
import api from '../api/axios'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const NewTripModal = ({ onClose, onCreated }) => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (startDate && endDate && endDate.getTime() < startDate.getTime()){
            setError('End date cannot be before start date')
            return
        }
        setLoading(true)
        try {
            const res = await api.post('/trips', { 
                title, 
                description,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endDate ? endDate.toISOString() : undefined
            })
            onCreated(res.data)
            onClose()
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>First, some trip details...</h2>
                        <p className="modal-subtitle">You can always edit these later</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Trip Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={`e.g. Europe ${new Date().getFullYear()}`}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>From <span className="optional">(optional)</span></label>
                            <DatePicker
                                className="date-input"
                                selected={startDate}
                                onChange={setStartDate}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/MM/yyyy"
                            />
                        </div>
                        <div className="form-group">
                            <label>To <span className="optional">(optional)</span></label>
                            <DatePicker
                                className="date-input"
                                selected={endDate}
                                onChange={setEndDate}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/MM/yyyy"
                                minDate={startDate}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Description <span className="optional">(optional)</span></label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="A quick trip description..."
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Trip'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default NewTripModal