import { useState } from 'react'
import DatePicker from 'react-datepicker'
import api from '../api/axios'

const CATEGORIES = [
    { value: 'food', label: 'Food', icon: '🍜' },
    { value: 'drinks', label: 'Drinks', icon: '🍺' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'city transport', label: 'City Transport', icon: '🚇' },
    { value: 'activity', label: 'Activity', icon: '🎭' },
    { value: 'other', label: 'Other', icon: '📌' },
]

const AddMiscModal = ({ tripId, cityId, members, tripStartDate, tripEndDate, onClose, onAdded, initialData, guests }) => {
    const [form, setForm] = useState({
        name: initialData?.name || '',
        category: initialData?.category || 'other',
        description: initialData?.description || '',
        cost: initialData?.cost || '',
        date: initialData?.date ? new Date(initialData.date) : null,
        splitWith: initialData?.splitWith?.map(u => u._id || u) || [ 
            ...members.map(m => m.user._id),
            ...(guests || []).map(g => g._id)
        ]
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const allPeople = [
        ...members.map(m => ({
            _id: m.user._id,
            name: m.user.name || m.user.username,
            avatar: m.user.avatar,
            color: m.color,
            isGuest: false
        })),
        ...(guests || []).map(g => ({
            _id: g._id,
            name: g.name,
            avatar: null,
            color: g.color,
            isGuest: true
        }))
    ]

    const toggleSplit = (userId) => {
        setForm(f => ({
            ...f,
            splitWith: f.splitWith.includes(userId)
                ? f.splitWith.filter(id => id !== userId)
                : [...f.splitWith, userId]
        }))
    }

    const perPerson = () => {
        if (!form.cost || form.splitWith.length === 0) return null
        return (parseFloat(form.cost) / form.splitWith.length).toFixed(2)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            let res
            if (initialData) {
                res = await api.patch(`/misc/${initialData._id}`, {
                    ...form,
                    cost: parseFloat(form.cost) || 0
                })
            } else {
                res = await api.post(`/misc/${cityId}`, {
                    ...form,
                    tripId,
                    cost: parseFloat(form.cost) || 0
                })
            }
            onAdded(res.data)
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
                        <h2>{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
                        <p className="modal-subtitle">Track a misc expense</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* CATEGORY */}
                    <div className="form-group">
                        <label>Category</label>
                        <div className="transport-type-selector">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    className={`transport-type-btn ${form.category === c.value ? 'active' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                                >
                                    <span>{c.icon}</span>
                                    <span>{c.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* NAME */}
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Ramen dinner"
                            required
                            autoFocus
                        />
                    </div>

                    {/* DESCRIPTION */}
                    <div className="form-group">
                        <label>Description <span className="optional">(optional)</span></label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Any notes..."
                        />
                    </div>

                    {/* COST + DATE */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Cost</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.cost}
                                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date <span className="optional">(optional)</span></label>
                            <DatePicker
                                className="date-input"
                                selected={form.date}
                                onChange={date => setForm(f => ({ ...f, date }))}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/MM/yyyy"
                                minDate={tripStartDate ? new Date(tripStartDate) : null}
                                maxDate={tripEndDate ? new Date(tripEndDate) : null}
                            />
                        </div>
                    </div>

                    {/* SPLIT WITH */}
                    <div className="form-group">
                        <label>Split With</label>
                        <div className="split-members">
                            {allPeople.map(person => (
                                <div
                                    key={person._id}
                                    className={`split-member ${form.splitWith.includes(person._id) ? 'selected' : ''}`}
                                    style={form.splitWith.includes(person._id) ? {
                                        borderColor: person.color,
                                        background: `${person.color}15`
                                    } : {}}
                                    onClick={() => toggleSplit(person._id)}
                                >
                                    <div
                                        className="member-avatar"
                                        style={{ border: `2px solid ${person.color}`, width: 28, height: 28, fontSize: '0.7rem' }}
                                    >
                                        {person.avatar && person.avatar !== 'images/default-avatar.png' ? (
                                            <img src={person.avatar} alt={person.name} />
                                        ) : (
                                            <span style={{ backgroundColor: person.color }}>{person.name?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span>{person.name}</span>
                                    {person.isGuest && <span className="you-badge" style={{ background: 'rgba(247,215,79,0.15)', color: '#f7d14f', borderColor: 'rgba(247,215,79,0.3)' }}>guest</span>}
                                    {form.splitWith.includes(person._id) && <span className="split-check">✓</span>}
                                </div>
                            ))}
                        </div>
                        {perPerson() && (
                            <p className="per-person-preview">
                                Per person: <strong>€{perPerson()}</strong> ({form.splitWith.length} {form.splitWith.length === 1 ? 'person' : 'people'})
                            </p>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddMiscModal