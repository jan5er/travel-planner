import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import api from '../api/axios'

const AddStayModal = ({ tripId, cityId, members, tripStartDate, tripEndDate, onClose, onAdded, initialData }) => {
    const [form, setForm] = useState({
        name: initialData?.name || '',
        bookingUrl: initialData?.bookingUrl || '',
        address: initialData?.address || '',
        checkIn: initialData?.checkIn ? new Date(initialData.checkIn) : null,
        checkOut: initialData?.checkOut ? new Date(initialData.checkOut) : null,
        cost: initialData?.cost || '',
        quantity: initialData?.quantity || 1,
        notes: initialData?.notes || '',
        splitWith: initialData?.splitWith?.map(u => u._id || u) || members.map(m => m.user._id),
        coordinates: initialData?.coordinates
    })
    const [addressQuery, setAddressQuery] = useState(initialData?.address || '')
    const [suggestions, setSuggestions] = useState([])
    const [searching, setSearching] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const debounceRef = useRef(null)

    useEffect(() => {
        if (addressQuery.length < 3) { setSuggestions([]); return }
        
        // Prekličemo prejšnji časovnik, če uporabnik še vedno tipka (debounce)
        clearTimeout(debounceRef.current)
        
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                // OpenStreetMap se hitro zmede, če mu pošljemo številko sobe ali nadstropje.
                // Zato z regex izbrišemo besede kot so "Room 502", "Unit 1", "5th Floor" itd.
                let cleanedQuery = addressQuery
                    .replace(/room\s*\d+/gi, '')
                    .replace(/unit\s*\d+/gi, '')
                    .replace(/f(?:loor)?\s*\d+/gi, '')
                    .replace(/\b\d+(?:st|nd|rd|th)\s*floor/gi, '') // Tukaj ulovimo zapise v stilu "5th floor"
                    .replace(/,\s*,/g, ',')                       // Če sta nam po brisanju ostali dve vejici skupaj, ju združimo v eno
                    .trim();                                      // Odstranimo odvečne premike na začetku in koncu niza

                console.log("Prvotni vnos:", addressQuery);
                console.log("Očiščeno za Nominatim:", cleanedQuery);

                // očiščen naslov
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedQuery)}&format=json&limit=5`,
                    { headers: { 'Accept-Language': 'en' } }
                )
                const data = await res.json()
                
                setSuggestions(data)
            } catch (err) {
                console.error('Nominatim error:', err)
            } finally {
                setSearching(false)
            }
        }, 400) 
    }, [addressQuery])

    const handleAddressSelect = (place) => {
        setForm(f => ({
            ...f,
            address: place.display_name,
            coordinates: {
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon)
            }
        }))
        setAddressQuery(place.display_name)
        setSuggestions([])
    }

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
        return (parseFloat(form.cost) / form.splitWith.length || 1).toFixed(2)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            let res
            if (initialData) {
                res = await api.patch(`/stays/${initialData._id}`, {
                    ...form,
                    cost: parseFloat(form.cost) || 0,
                })
            } else {
                res = await api.post(`/stays/${cityId}`, {
                    ...form,
                    tripId,
                    cost: parseFloat(form.cost) || 0,
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
                        <h2>{initialData ? 'Edit Stay' : 'Add Stay'}</h2>
                        <p className="modal-subtitle">Add a hotel, airbnb, or any accommodation</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Hotel name"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Quantity</label>
                            <input
                                type="number"
                                min={1}
                                value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Booking URL <span className="optional">(optional)</span></label>
                        <input
                            type="text"
                            value={form.bookingUrl}
                            onChange={e => setForm(f => ({ ...f, bookingUrl: e.target.value }))}
                            placeholder="https://booking.com/..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <div className="city-search-wrapper">
                            <input
                                type="text"
                                value={addressQuery}
                                onChange={e => { setAddressQuery(e.target.value); setForm(f => ({ ...f, address: e.target.value, coordinates: undefined })) }}
                                placeholder="Search for address..."
                            />
                            {searching && <span className="search-spinner">...</span>}
                            {suggestions.length > 0 && (
                                <ul className="city-suggestions">
                                    {suggestions.map(place => (
                                        <li key={place.place_id} onClick={() => handleAddressSelect(place)}>
                                            <span className="suggestion-name">{place.display_name.split(',')[0]}</span>
                                            <span className="suggestion-country">{place.display_name.split(',').slice(1).join(',').trim()}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Check-in</label>
                            <DatePicker
                                className="date-input"
                                selected={form.checkIn}
                                onChange={date => setForm(f => ({ ...f, checkIn: date }))}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/MM/yyyy"
                                minDate={tripStartDate ? new Date(tripStartDate) : null}
                                maxDate={tripEndDate ? new Date(tripEndDate) : null}
                                selectsStart
                                startDate={form.checkIn}
                                endDate={form.checkOut}
                            />
                        </div>
                        <div className="form-group">
                            <label>Check-out</label>
                            <DatePicker
                                className="date-input"
                                selected={form.checkOut}
                                onChange={date => setForm(f => ({ ...f, checkOut: date }))}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/MM/yyyy"
                                minDate={form.checkIn || (tripStartDate ? new Date(tripStartDate) : null)}
                                maxDate={tripEndDate ? new Date(tripEndDate) : null}
                                selectsEnd
                                startDate={form.checkIn}
                                endDate={form.checkOut}
                            />
                        </div>
                        <div className="form-group">
                            <label>Total Cost</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.cost}
                                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                                placeholder="0.00"
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
                                        style={{ border: `2px solid ${m.color}`, boxShadow: `0 0 6px ${m.color}60`, width: 28, height: 28, fontSize: '0.7rem' }}
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
                                {form.quantity > 1 && <span>Total: <strong>€{(parseFloat(form.cost)).toFixed(2)}</strong> · </span>}
                                Per person: <strong>€{((parseFloat(perPerson()) || 0)).toFixed(2)}</strong> ({form.splitWith.length} {form.splitWith.length === 1 ? 'person' : 'people'})
                            </p>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Stay'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddStayModal