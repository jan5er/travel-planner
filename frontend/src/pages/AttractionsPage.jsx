import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import AddAttractionModal from '../components/AddAttractionModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const CATEGORY_ICONS = {
    food: '🍜', museum: '🏛️', landmark: '🗼',
    nature: '🏞️', entertainment: '🎭', shopping: '🛍️', other: '📍'
}

const createPinIcon = (color, visited, category) => {
    const emoji = CATEGORY_ICONS[category] || '📍'
    return L.divIcon({
        className: '',
        html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: ${visited ? color : 'var(--bg-card, #13131a)'};
            border: 2px solid ${color};
            border-radius: 50%;
            box-shadow: 0 0 8px ${color}, 0 2px 4px rgba(0,0,0,0.4);
            font-size: 14px;
            line-height: 1;
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    })
}

const AttractionsPage = () => {
    const { id, cityId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [trip, setTrip] = useState(null)
    const [city, setCity] = useState(null)
    const [attractions, setAttractions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [attractionToEdit, setAttractionToEdit] = useState(null)
    const [attractionToDelete, setAttractionToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes, attractionsRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(`/attractions/${cityId}`)
                ])
                setTrip(tripRes.data)
                setCity(citiesRes.data.find(c => c._id === cityId))
                setAttractions(attractionsRes.data)
            } catch (err) {
                console.error('Error fetching attractions:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, cityId])

    const handleToggleVote = async (attractionId) => {
        try {
            const res = await api.post(`/attractions/${attractionId}/toggle-vote`)
            setAttractions(prev => prev.map(a => a._id === attractionId ? res.data : a))
        } catch (err) {
            console.error('Error toggling vote:', err)
        }
    }

    const handleToggleVisited = async (attractionId) => {
        try {
            const res = await api.post(`/attractions/${attractionId}/toggle-visited`)
            setAttractions(prev => prev.map(a => a._id === attractionId ? res.data : a))
        } catch (err) {
            console.error('Error toggling visited:', err)
        }
    }

    const handleDelete = async () => {
        try {
            setDeleting(true)
            await api.delete(`/attractions/${attractionToDelete._id}`)
            setAttractions(prev => prev.filter(a => a._id !== attractionToDelete._id))
            setAttractionToDelete(null)
        } catch (err) {
            console.error('Error deleting attraction:', err)
        } finally {
            setDeleting(false)
        }
    }

    const getMemberColor = (userId) => {
        const uid = userId?._id || userId
        const member = trip?.members.find(m =>
            m.user._id?.toString() === uid?.toString()
        )
        return member?.color || 'var(--accent)'
    }

    const hasVoted = (attraction) => {
        return attraction.votes?.some(v => (v._id || v)?.toString() === user?._id?.toString())
    }

    const sorted = [...attractions].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
    const visited = sorted.filter(a => a.visited)
    const unvisited = sorted.filter(a => !a.visited)

    const mapAttractions = attractions.filter(a => a.coordinates?.lat && a.coordinates?.lng)
    const mapCenter = mapAttractions.length > 0
        ? [mapAttractions[0].coordinates.lat, mapAttractions[0].coordinates.lng]
        : city?.coordinates ? [city.coordinates.lat, city.coordinates.lng] : [48, 16]

    if (loading) return <div className="loading">Loading...</div>

    const renderAttractionCard = (attraction) => {
        const color = getMemberColor(attraction.suggestedBy?._id || attraction.suggestedBy)
        const voted = hasVoted(attraction)
        const pp = attraction.cost && attraction.splitWith?.length
            ? (attraction.cost / attraction.splitWith.length).toFixed(2)
            : null

        return (
            <div
                key={attraction._id}
                className={`stay-card ${attraction.visited ? 'selected' : ''}`}
                style={attraction.visited ? { borderColor: color, boxShadow: `0 0 16px ${color}20` } : {}}
            >
                {/* VISITED TOGGLE */}
                <button
                    className={`stay-select-btn ${attraction.visited ? 'checked' : ''}`}
                    style={attraction.visited ? { borderColor: color, backgroundColor: color } : {}}
                    onClick={() => handleToggleVisited(attraction._id)}
                    title={attraction.visited ? 'Mark unvisited' : 'Mark visited'}
                >
                    {attraction.visited ? '✓' : ''}
                </button>

                <div className="stay-card-content">
                    <div className="stay-card-top">
                        <div className="stay-card-main">
                            <div className="stay-card-header">
                                <span className="attraction-category-icon">{CATEGORY_ICONS[attraction.category]}</span>
                                {attraction.link ? (
                                    <a href={attraction.link} target="_blank" rel="noopener noreferrer" className="stay-name-link">
                                        {attraction.name} ↗
                                    </a>
                                ) : (
                                    <span className="stay-name">{attraction.name}</span>
                                )}
                            </div>
                            {attraction.address && <p className="stay-address">{attraction.address}</p>}
                            {attraction.description && <p className="stay-notes">{attraction.description}</p>}

                            {attraction.splitWith?.length > 0 && (
                                <div className="stay-split">
                                    <span className="split-label">Split:</span>
                                    <div className="split-avatars">
                                        {attraction.splitWith.map(member => {
                                            if (!member?._id) return null
                                            const tripMember = trip.members.find(m =>
                                                m.user._id?.toString() === member._id?.toString()
                                            )
                                            const memberColor = tripMember?.color || 'var(--accent)'
                                            return (
                                                <div
                                                    key={member._id}
                                                    className="member-avatar"
                                                    style={{ border: `2px solid ${memberColor}`, width: 24, height: 24, fontSize: '0.65rem' }}
                                                    title={member.name || member.username}
                                                >
                                                    {member.avatar && member.avatar !== 'images/default-avatar.png' ? (
                                                        <img src={member.avatar} alt="" />
                                                    ) : (
                                                        <span style={{ backgroundColor: memberColor }}>
                                                            {member.name?.[0]?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* COST + VOTES */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            {attraction.cost > 0 && (
                                <div className="stay-cost-block">
                                    <span className="stay-total">€{attraction.cost.toFixed(2)}</span>
                                    {pp && <span className="stay-per-person">€{pp}<span className="pp-label">/person</span></span>}
                                </div>
                            )}
                            {/* VOTE BUTTON */}
                            <button
                                className={`vote-btn ${voted ? 'voted' : ''}`}
                                onClick={() => handleToggleVote(attraction._id)}
                                title={voted ? 'Remove vote' : 'Vote for this'}
                            >
                                <span>▲</span>
                                <span>{attraction.votes?.length || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="stay-card-actions">
                    <div
                        className="member-avatar"
                        style={{ width: 42, height: 42, border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}60` }}
                        title={`Suggested by ${attraction.suggestedBy?.name || attraction.suggestedBy?.username}`}
                    >
                        {attraction.suggestedBy?.avatar && attraction.suggestedBy.avatar !== 'images/default-avatar.png' ? (
                            <img src={attraction.suggestedBy.avatar} alt="" />
                        ) : (
                            <span style={{ backgroundColor: color }}>{attraction.suggestedBy?.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: '5%' }}>
                        <button className="btn-icon" onClick={() => setAttractionToEdit(attraction)} title="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => setAttractionToDelete(attraction)} title="Delete">🗑</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="section-page">
            <header className="trip-header">
                <button className="btn-back" style={{ height: "-webkit-fill-available" }} onClick={() => navigate(`/trips/${id}/${cityId}`)}>Back</button>
                <div className="trip-header-info">
                    <h1>Attractions</h1>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {city?.name}{city?.country && `, ${city.country}`}
                    </span>
                </div>
                <button className="btn-primary" style={{ "alignSelf": "center" }} onClick={() => setShowAddModal(true)}>+ Add Attraction</button>
            </header>

            <div className="stays-section-content">
                {attractions.length === 0 ? (
                    <div className="empty-state">
                        <p>No attractions yet — add places you want to visit!</p>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Attraction</button>
                    </div>
                ) : (
                    <>
                        {unvisited.length > 0 && (
                            <div className="stays-group">
                                <h2 className="stays-group-label">To Visit</h2>
                                {unvisited.map(renderAttractionCard)}
                            </div>
                        )}
                        {visited.length > 0 && (
                            <div className="stays-group">
                                <h2 className="stays-group-label">✓ Visited</h2>
                                {visited.map(renderAttractionCard)}
                            </div>
                        )}
                    </>
                )}

                {/* MAP */}
                {mapAttractions.length > 0 && (
                    <div className="stays-map-wrapper">
                        <h2 className="stays-group-label">Map</h2>
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            className="stays-map"
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            {mapAttractions.map(attraction => {
                                const color = getMemberColor(attraction.suggestedBy?._id || attraction.suggestedBy)
                                return (
                                    <Marker
                                        key={attraction._id}
                                        position={[attraction.coordinates.lat, attraction.coordinates.lng]}
                                        icon={createPinIcon(color, attraction.visited, attraction.category)}
                                    >
                                        <Popup>
                                            <strong>{attraction.name}</strong>
                                            {attraction.address && <><br />{attraction.address}</>}
                                            {attraction.cost > 0 && <><br />€{attraction.cost.toFixed(2)}</>}
                                            <br />{attraction.votes?.length || 0} vote{attraction.votes?.length !== 1 ? 's' : ''}
                                        </Popup>
                                    </Marker>
                                )
                            })}
                        </MapContainer>
                    </div>
                )}
            </div>

            {(showAddModal || attractionToEdit) && trip && (
                <AddAttractionModal
                    tripId={id}
                    cityId={cityId}
                    city={city}
                    members={trip.members}
                    onClose={() => { setShowAddModal(false); setAttractionToEdit(null) }}
                    initialData={attractionToEdit}
                    onAdded={attraction => {
                        if (attractionToEdit) {
                            setAttractions(prev => prev.map(a => a._id === attraction._id ? attraction : a))
                        } else {
                            setAttractions(prev => [attraction, ...prev])
                        }
                        setAttractionToEdit(null)
                    }}
                />
            )}

            {attractionToDelete && (
                <ConfirmDeleteModal
                    title="Delete Attraction"
                    message={`Remove "${attractionToDelete.name}"? Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => setAttractionToDelete(null)}
                    onConfirm={handleDelete}
                    loading={deleting}
                />
            )}
        </div>
    )
}

export default AttractionsPage