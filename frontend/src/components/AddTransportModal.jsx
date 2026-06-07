import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import api from '../api/axios'

const TRANSPORT_TYPES = [
    { value: 'flight', label: 'Flight', icon: '✈️' },
    { value: 'train', label: 'Train', icon: '🚆' },
    { value: 'bus', label: 'Bus', icon: '🚌' },
    { value: 'car', label: 'Car', icon: '🚗' },
    { value: 'ferry', label: 'Ferry', icon: '⛴️' },
    { value: 'other', label: 'Other', icon: '🚀' },
]

const LocationInput = ({ label, value, onChange, cities, excludeCityId, placeholder }) => {
    const [query, setQuery] = useState(value || '')
    const [suggestions, setSuggestions] = useState([])
    const [searching, setSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceRef = useRef(null)

    const tripCities = cities.filter(c => c._id !== excludeCityId)

    const filteredCities = tripCities.filter(c =>
        query.length === 0 || c.name.toLowerCase().includes(query.toLowerCase())
    )

    useEffect(() => {
        if (query.length < 2) { setSuggestions([]); return }
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4`,
                    { headers: { 'Accept-Language': 'en' } }
                )
                const data = await res.json()
                setSuggestions(data.filter(p =>
                    !tripCities.some(c => c.name.toLowerCase() === p.display_name.split(',')[0].toLowerCase())
                ))
            } catch (err) {
                console.error(err)
            } finally {
                setSearching(false)
            }
        }, 400)
    }, [query])

    const handleSelect = (name, cityId = null) => {
        setQuery(name)
        setShowDropdown(false)
        setSuggestions([])
        onChange(name, cityId)
    }

    const showAny = showDropdown && (filteredCities.length > 0 || suggestions.length > 0 || searching)

    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="city-search-wrapper">
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowDropdown(true); onChange(e.target.value, null) }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={placeholder}
                />
                {searching && <span className="search-spinner">...</span>}
                {showAny && (
                    <ul className="city-suggestions">
                        {filteredCities.length > 0 && (
                            <>
                                <li className="suggestion-group-label">Trip Cities</li>
                                {filteredCities.map(c => (
                                    <li key={c._id} onMouseDown={() => handleSelect(c.name, c._id)}>
                                        <span className="suggestion-name">{c.name}</span>
                                        <span className="suggestion-country">{c.country}</span>
                                    </li>
                                ))}
                            </>
                        )}
                        {suggestions.length > 0 && (
                            <>
                                <li className="suggestion-group-label">Other Places</li>
                                {suggestions.map(place => (
                                    <li key={place.place_id} onMouseDown={() => handleSelect(
                                        place.display_name.split(',').slice(0, 2).join(',').trim(),
                                        null
                                    )}>
                                        <span className="suggestion-name">{place.display_name.split(',')[0]}</span>
                                        <span className="suggestion-country">{place.display_name.split(',').slice(1).join(',').trim()}</span>
                                    </li>
                                ))}
                            </>
                        )}
                    </ul>
                )}
            </div>
        </div>
    )
}

const AddTransportModal = ({ tripId, cityId, fromCityId, toCityId, cities, members, tripStartDate, tripEndDate, onClose, onAdded, initialData }) => {
    const [form, setForm] = useState({
        type: initialData?.type || 'flight',
        from: initialData?.from || '',
        to: initialData?.to || '',
        toCityId: initialData?.toCityId || '',
        fromCityId: initialData?.fromCityId || '',
        link: initialData?.link || '',
        departure: initialData?.departure ? new Date(initialData.departure) : null,
        arrival: initialData?.arrival ? new Date(initialData.arrival) : null,
        cost: initialData?.cost || '',
        quantity: initialData?.quantity || 1,
        note: initialData?.note || '',
        splitWith: initialData?.splitWith?.map(u => u._id || u) || members.map(m => m.user._id),
        isReturn: initialData?.isReturn || false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
        return ((parseFloat(form.cost) / (form.splitWith.length || 1)).toFixed(2))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const fromValue = form.from === '__custom__' ? form.fromCustom : form.from
        const toValue = form.to === '__custom__' ? form.toCustom : form.to
        
        try {
            let res
            if (!fromValue || !toValue) {
                setError('From and To are required')
                setLoading(false)
                return
            }

            if (initialData) {
                res = await api.patch(`/transports/${initialData._id}`, {
                    ...form,
                    cost: parseFloat(form.cost) || 0
                })
            } else {
                res = await api.post(`/transports/${cityId}`, {
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
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>{initialData ? 'Edit Transport' : 'Add Transport'}</h2>
                        <p className="modal-subtitle">Add a flight, train, or any other transport</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* TYPE SELECTOR */}
                    <div className="form-group">
                        <label>Type</label>
                        <div className="transport-type-selector">
                            {TRANSPORT_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    className={`transport-type-btn ${form.type === t.value ? 'active' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                                >
                                    <span>{t.icon}</span>
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FROM / TO */}
                    <div className="form-row">
                        <LocationInput
                            label="From"
                            value={form.from}
                            cities={cities}
                            excludeCityId={form.toCityId}
                            placeholder="Search or select city..."
                            onChange={(name, cityId) => setForm(f => ({ ...f, from: name, fromCityId: cityId }))}
                        />
                        <LocationInput
                            label="To"
                            value={form.to}
                            cities={cities}
                            excludeCityId={form.fromCityId}
                            placeholder="Search or select city..."
                            onChange={(name, cityId) => setForm(f => ({ ...f, to: name, toCityId: cityId }))}
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={form.isReturn}
                                onChange={e => setForm(f => ({ ...f, isReturn: e.target.checked }))}
                            />
                            <span>Return trip <span className="optional">(e.g. day trip — comes back to origin)</span></span>
                        </label>
                    </div>

                    {/* DEPARTURE / ARRIVAL */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Departure <span className="optional"></span></label>
                            <DatePicker
                                className="date-input"
                                selected={form.departure}
                                onChange={date => setForm(f => ({ ...f, departure: date }))}
                                dateFormat="dd/MM/yyyy HH:mm"
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                placeholderText="dd/MM/yyyy HH:mm"
                                minDate={tripStartDate ? new Date(tripStartDate) : null}
                                maxDate={tripEndDate ? new Date(tripEndDate) : null}
                            />
                        </div>
                        <div className="form-group">
                            <label>Arrival <span className="optional"></span></label>
                            <DatePicker
                                className="date-input"
                                selected={form.arrival}
                                onChange={date => setForm(f => ({ ...f, arrival: date }))}
                                dateFormat="dd/MM/yyyy HH:mm"
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                placeholderText="dd/MM/yyyy HH:mm"
                                minDate={form.departure || (tripStartDate ? new Date(tripStartDate) : null)}
                                maxDate={tripEndDate ? new Date(tripEndDate) : null}
                            />
                        </div>
                    </div>

                    {/* BOOKING LINK */}
                    <div className="form-group">
                        <label>Booking Link <span className="optional"></span></label>
                        <input
                            type="text"
                            value={form.link}
                            onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                            placeholder="https://..."
                        />
                    </div>

                    {/* COST + QUANTITY */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Total Cost <span className="optional"></span></label>
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
                            <label>Quantity</label>
                            <input
                                type="number"
                                min={1}
                                value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                            />
                        </div>
                    </div>

                    {/* SPLIT WITH */}
                    <div className="form-group">
                        <label>Split With</label>
                        <div className="split-members">
                            {members.map(m => (
                                <div
                                    key={m.user._id}
                                    className={`split-member ${form.splitWith.includes(m.user._id) ? 'selected' : ''}`}
                                    style={form.splitWith.includes(m.user._id) ? {
                                        borderColor: m.color,
                                        background: `${m.color}15`
                                    } : {}}
                                    onClick={() => toggleSplit(m.user._id)}
                                >
                                    <div
                                        className="member-avatar"
                                        style={{ border: `2px solid ${m.color}`, width: 28, height: 28, fontSize: '0.7rem' }}
                                    >
                                        {m.user.avatar && m.user.avatar !== 'images/default-avatar.png' ? (
                                            <img src={m.user.avatar} alt={m.user.username} />
                                        ) : (
                                            <span style={{ backgroundColor: m.color }}>{m.user.name?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span>{m.user.name || m.user.username}</span>
                                    {form.splitWith.includes(m.user._id) && <span className="split-check">✓</span>}
                                </div>
                            ))}
                        </div>
                        {perPerson() && (
                            <p className="per-person-preview">
                                <span>Total:  <strong>€{(parseFloat(form.cost).toFixed(2))}</strong> · </span>
                                Per person: <strong>€{perPerson()}</strong> ({form.splitWith.length} {form.splitWith.length === 1 ? 'person' : 'people'})
                            </p>
                        )}
                    </div>

                    {/* NOTE */}
                    <div className="form-group">
                        <label>Note <span className="optional"></span></label>
                        <textarea
                            value={form.note}
                            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                            placeholder="Any notes about this transport..."
                            rows={2}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Transport'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddTransportModal