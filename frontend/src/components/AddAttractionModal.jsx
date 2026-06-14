import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api/axios'

const CATEGORIES = [
    { value: 'food', label: 'Food', icon: '🍜' },
    { value: 'museum', label: 'Museum', icon: '🏛️' },
    { value: 'landmark', label: 'Landmark', icon: '🗼' },
    { value: 'nature', label: 'Nature', icon: '🏞️' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'other', label: 'Other', icon: '📍' },
]

const createPinIcon = (color) => L.divIcon({
    className: '',
    html: `<div style="
        width: 14px; height: 14px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 8px ${color};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
})

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({ click: (e) => onMapClick(e.latlng) })
    return null
}

const AddAttractionModal = ({ tripId, cityId, city, members, onClose, onAdded, initialData, guests }) => {
    const [form, setForm] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        category: initialData?.category || 'other',
        cost: initialData?.cost || '',
        link: initialData?.link || '',
        address: initialData?.address || '',
        coordinates: initialData?.coordinates || null,
        splitWith: initialData?.splitWith?.map(u => u._id || u) || [ 
            ...members.map(m => m.user._id),
            ...(guests || []).map(g => g._id)
        ]
    })
    const [addressQuery, setAddressQuery] = useState(initialData?.address || '')
    const [suggestions, setSuggestions] = useState([])
    const [searching, setSearching] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const debounceRef = useRef(null)

    const mapCenter = form.coordinates
        ? [form.coordinates.lat, form.coordinates.lng]
        : city?.coordinates
            ? [city.coordinates.lat, city.coordinates.lng]
            : [48, 16]

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

    useEffect(() => {
        if (addressQuery.length < 2) { setSuggestions([]); return }
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=5`,
                    { headers: { 'Accept-Language': 'en' } }
                )
                const data = await res.json()
                setSuggestions(data)
            } catch (err) {
                console.error(err)
            } finally {
                setSearching(false)
            }
        }, 400)
    }, [addressQuery])

    const handleAddressSelect = (place) => {
        const name = place.display_name.split(',').slice(0, 2).join(',').trim()
        setAddressQuery(place.display_name)
        setForm(f => ({
            ...f,
            address: place.display_name,
            coordinates: { lat: parseFloat(place.lat), lng: parseFloat(place.lon) }
        }))
        setSuggestions([])
        if (!form.name) setForm(f => ({ ...f, name: place.display_name.split(',')[0].trim() }))
    }

    const handleMapClick = (latlng) => {
        setForm(f => ({ ...f, coordinates: { lat: latlng.lat, lng: latlng.lng } }))
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
        return (parseFloat(form.cost) / form.splitWith.length).toFixed(2)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            let res
            if (initialData) {
                res = await api.patch(`/attractions/${initialData._id}`, {
                    ...form,
                    cost: parseFloat(form.cost) || 0
                })
            } else {
                res = await api.post(`/attractions/${cityId}`, {
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
                        <h2>{initialData ? 'Edit Attraction' : 'Add Attraction'}</h2>
                        <p className="modal-subtitle">Search for a place or click the map to drop a pin</p>
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
                            placeholder="e.g. Senso-ji Temple"
                            required
                        />
                    </div>

                    {/* ADDRESS SEARCH */}
                    <div className="form-group">
                        <label>Location <span className="optional">(search or click map)</span></label>
                        <div className="city-search-wrapper">
                            <input
                                type="text"
                                value={addressQuery}
                                onChange={e => {
                                    setAddressQuery(e.target.value)
                                    setForm(f => ({ ...f, address: e.target.value, coordinates: null }))
                                }}
                                placeholder="Search for address or location..."
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
                        {form.coordinates && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                📍 {form.coordinates.lat.toFixed(4)}, {form.coordinates.lng.toFixed(4)}
                                <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', marginLeft: 8, fontSize: '0.78rem' }}
                                    onClick={() => setForm(f => ({ ...f, coordinates: null }))}
                                >
                                    clear
                                </button>
                            </p>
                        )}
                    </div>

                    {/* MAP */}
                    <div className="form-group">
                        <label>Map <span className="optional">(click to place pin)</span></label>
                        <div className="attraction-map-picker">
                            <MapContainer
                                center={mapCenter}
                                zoom={form.coordinates ? 15 : 12}
                                className="attraction-map"
                                scrollWheelZoom={true}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap contributors'
                                />
                                <MapClickHandler onMapClick={handleMapClick} />
                                    {form.coordinates && (
                                        <Marker
                                            position={[form.coordinates.lat, form.coordinates.lng]}
                                            icon={createPinIcon('var(--accent)', false, form.category)}
                                        />
                                    )}
                            </MapContainer>
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="form-group">
                        <label>Description <span className="optional"></span></label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Why do you want to visit?"
                            rows={2}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Estimated Total Cost <span className="optional"></span></label>
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
                            <label>Link <span className="optional"></span></label>
                            <input
                                type="text"
                                value={form.link}
                                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                                placeholder="https://..."
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
                        <button className="btn-confirm" disabled={loading}>
                            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Attraction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddAttractionModal