import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AddCityModal from '../components/AddCityModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const CITY_COLORS = [
    '#f7774f',
    '#4fcc8e', 
    '#cc4fcc',
    '#f7d14f',
    '#4fccc4',
    '#f74f7a',
    '#a0f74f',
    '#4f8ef7',
]

const TripPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [trip, setTrip] = useState(null)
    const [cities, setCities] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddCity, setShowAddCity] = useState(false)
    const [activeCity, setActiveCity] = useState(null)
    const [showConfirmDeleteTrip, setShowConfirmDeleteTrip] = useState(false)
    const [showConfirmDeleteCity, setShowConfirmDeleteCity] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)
    const [cityToDelete, setCityToDelete] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`)
                ])
                setTrip(tripRes.data)
                const citiesWithColors = citiesRes.data.map((city, i) => ({
                    ...city,
                    color: city.color || CITY_COLORS[i % CITY_COLORS.length]
                }))
                setCities(citiesWithColors)
                if (citiesWithColors.length > 0) setActiveCity(citiesWithColors[0]._id)
            } catch (err) {
                console.error('Error fetching trip:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const handleCityAdded = (newCity) => {
        const color = CITY_COLORS[cities.length % CITY_COLORS.length]
        const cityWithColor = { ...newCity, color }
        setCities(prev => [...prev, cityWithColor])
        setActiveCity(newCity._id)
    }

    const activeCityData = cities.find(c => c._id === activeCity)

    if (loading) return <div className="loading">Loading...</div>
    if (!trip) return <div className="loading">Trip not found</div>

    return (
        <div className="trip-page">
            {/* HEADER */}
            <header className="trip-header">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>
                Back
                </button>
                <div className="trip-header-info">
                    <h1>{trip.title}</h1>
                    {trip.startDate && (
                        <span className="trip-dates">
                            {new Date(trip.startDate).toLocaleDateString('en-GB')}
                            {trip.endDate && ` → ${new Date(trip.endDate).toLocaleDateString('en-GB')}`}
                        </span>
                    )}
                </div>

                <div className="trip-header-members">
                    {trip.members.map(m => (
                        <div
                            key={m.user._id}
                            className="member-avatar"
                            style={{ backgroundColor: m.color }}
                            title={m.user.name}
                        >
                            {m.user.name?.[0]?.toUpperCase()}
                        </div>
                    ))}
                </div>
            </header>

            {/* CITY TABS */}
            <div className="city-tabs-wrapper">
                <div className="city-tabs">
                    {cities.map(city => (
                        <button
                            key={city._id}
                            className={`city-tab ${activeCity === city._id ? 'active' : ''}`}
                            style={activeCity === city._id ? {
                                borderColor: city.color,
                                color: city.color,
                                boxShadow: `0 2px 0 ${city.color}`
                            } : {}}
                            onClick={() => setActiveCity(city._id)}
                        >
                            {city.name}
                            {city.country && <span className="tab-country">{city.country}</span>}
                        </button>
                    ))}
                    <button className="city-tab add-city-tab" onClick={() => setShowAddCity(true)}>
                        + Add City
                    </button>

                    <div id="delete-trip-btn">
                        <button 
                            className="btn-danger"
                            title="Delete trip" 
                            onClick={() => setShowConfirmDeleteTrip(true)}
                        >
                            Delete Entire Trip
                        </button>
                    </div>
                </div>
                {/* COLORED LINE BELOW TABS */}
                <div 
                    className="city-active-bar"
                    style={{ backgroundColor: activeCityData?.color || 'transparent' }}
                />
            </div>

            {/* CITY CONTENT */}
            {cities.length === 0 ? (
                <div className="empty-state" style={{ margin: '60px 40px' }}>
                    <p>No cities yet — add your first destination!</p>
                    <button className="btn-primary" onClick={() => setShowAddCity(true)}>
                        + Add City
                    </button>
                </div>
            ) : activeCityData ? (
                <div className="city-content">
                    <div className="city-content-header">
                        <div className="city-color-bar" style={{ backgroundColor: activeCityData.color }} />
                        <div>
                            <h2>{activeCityData.name}</h2>
                            {activeCityData.country && (
                                <span className="city-country">{activeCityData.country}</span>
                            )}
                        </div>
                        {(activeCityData.dateFrom || activeCityData.dateTo) && (
                            <span className="city-dates">
                                {activeCityData.dateFrom && new Date(activeCityData.dateFrom).toLocaleDateString('en-GB')}
                                {activeCityData.dateTo && ` → ${new Date(activeCityData.dateTo).toLocaleDateString('en-GB')}`}
                            </span>
                        )}
                        <button 
                            className="btn-danger" 
                            style={{ marginLeft: 'auto' }}
                            onClick={() => { setCityToDelete(activeCityData); setShowConfirmDeleteCity(true) }}
                        >
                            Delete {activeCityData.name}
                        </button>
                    </div>

                    {/* SECTION CARDS */}
                    <div className="section-cards">
                        {[
                            { label: 'Transport', icon: '✈️', path: 'transport', desc: 'Flights, trains, buses' },
                            { label: 'Stays', icon: '🏨', path: 'stays', desc: 'Hotels & accommodation' },
                            { label: 'Attractions', icon: '🗺️', path: 'attractions', desc: 'Things to see & do' },
                            { label: 'Misc', icon: '🍜', path: 'misc', desc: 'Food, shops & more' },
                        ].map(section => (
                            <div
                                key={section.path}
                                className="section-card"
                                onClick={() => navigate(`/trips/${id}/${activeCity}/${section.path}`)}
                            >
                                <span className="section-icon">{section.icon}</span>
                                <h3>{section.label}</h3>
                                <p>{section.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* TIMELINE CARD */}
                    <div className="timeline-card" onClick={() => navigate(`/trips/${id}/timeline`)}>
                        <span className="section-icon">📅</span>
                        <div>
                            <h3>Timeline</h3>
                            <p>Full trip schedule across all cities</p>
                        </div>
                        <span className="timeline-arrow">→</span>
                    </div>
                </div>
            ) : null}

            {showAddCity && (
                <AddCityModal
                    tripId={id}
                    onClose={() => setShowAddCity(false)}
                    onAdded={handleCityAdded}
                />
            )}

            {showConfirmDeleteTrip && (
                <ConfirmDeleteModal
                    title="Delete trip"
                    message={`This will permanently delete the trip "${trip.title}" and all associated data. Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => { setShowConfirmDeleteTrip(false); setDeleteError(null) }}
                    onConfirm={async () => {
                        try {
                            setDeleting(true)
                            setDeleteError(null)
                            await api.delete(`/trips/${id}`)
                            navigate('/dashboard')
                        } catch (err) {
                            setDeleteError(err.response?.data?.message || 'Failed to delete trip')
                        } finally {
                            setDeleting(false)
                        }
                    }}
                    loading={deleting}
                    error={deleteError}
                />
            )}

            {showConfirmDeleteCity && (
                <ConfirmDeleteModal
                    title="Delete city"
                    message={`This will remove the city "${cityToDelete?.name || ''}" from the trip. Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => { setShowConfirmDeleteCity(false); setCityToDelete(null); setDeleteError(null) }}
                    onConfirm={async () => {
                        try {
                            setDeleting(true)
                            setDeleteError(null)
                            const cityId = cityToDelete?._id || cityToDelete
                            await api.delete(`/trips/cities/${cityId}`)
                            setCities(prev => prev.filter(c => c._id !== cityId))

                            setCities(prev => {
                                const updated = prev.filter(c => c._id !== cityId)
                                if (activeCity === cityId) {
                                    setActiveCity(updated[0]?._id || null)
                                }
                                return updated
                            })
                            setShowConfirmDeleteCity(false)
                            setCityToDelete(null)
                        } catch (err) {
                            setDeleteError(err.response?.data?.message || 'Failed to delete city')
                        } finally {
                            setDeleting(false)
                        }
                    }}
                    loading={deleting}
                    error={deleteError}
                />
            )}
        </div>
    )
}

export default TripPage