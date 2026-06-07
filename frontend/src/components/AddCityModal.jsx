import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const AddCityModal = ({ tripId, onClose, onAdded }) => {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([])
            return
        }
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&featuretype=city&limit=5`,
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
    }, [query])

    const handleSelect = (place) => {
        setSelected(place)
        setQuery(place.display_name.split(',').slice(0, 2).join(','))
        setSuggestions([])
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selected) return
        setLoading(true)
        try {
            const res = await api.post(`/trips/${tripId}/cities`, {
                name: selected.display_name.split(',')[0].trim(),
                country: selected.display_name.split(',').at(-1).trim(),
                coordinates: {
                    lat: parseFloat(selected.lat),
                    lng: parseFloat(selected.lon)
                }
            })
            onAdded(res.data)
            onClose()
        } catch (err) {
            console.error('Error adding city:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Add a City</h2>
                        <p className="modal-subtitle">Search for a city to add to your trip</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group city-search-group">
                        <label>City</label>
                        <div className="city-search-wrapper">
                            <input
                                type="text"
                                value={query}
                                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                                placeholder="Search for a city..."
                                autoFocus
                            />
                            {searching && <span className="search-spinner">...</span>}
                            {suggestions.length > 0 && (
                                <ul className="city-suggestions">
                                    {suggestions.map(place => (
                                        <li key={place.place_id} onClick={() => handleSelect(place)}>
                                            <span className="suggestion-name">
                                                {place.display_name.split(',')[0]}
                                            </span>
                                            <span className="suggestion-country">
                                                {place.display_name.split(',').slice(1).join(',').trim()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn-confirm" disabled={!selected || loading}>
                            {loading ? 'Adding...' : 'Add City'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddCityModal