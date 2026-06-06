import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api/axios'
import AddStayModal from '../components/AddStayModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

// Fix leaflet default icon issue with webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createColorIcon = (color, selected) => L.divIcon({
    className: '',
    html: `<div style="
        width: ${selected ? 18 : 14}px;
        height: ${selected ? 18 : 14}px;
        background: ${color};
        border: 2px solid ${selected ? 'white' : color};
        border-radius: 50%;
        box-shadow: 0 0 ${selected ? 10 : 4}px ${color};
        opacity: ${selected ? 1 : 0.6};
    "></div>`,
    iconSize: [selected ? 18 : 14, selected ? 18 : 14],
    iconAnchor: [selected ? 9 : 7, selected ? 9 : 7],
})

const StaysPage = () => {
    const { id, cityId } = useParams()
    const navigate = useNavigate()
    const [trip, setTrip] = useState(null)
    const [city, setCity] = useState(null)
    const [stays, setStays] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [stayToDelete, setStayToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes, staysRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(`/stays/${cityId}`)
                ])
                setTrip(tripRes.data)
                const city = citiesRes.data.find(c => c._id === cityId)
                setCity(city)
                setStays(staysRes.data)
            } catch (err) {
                console.error('Error fetching stays:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, cityId])

    const handleToggleSelect = async (stayId) => {
        try {
            const res = await api.post(`/stays/${stayId}/toggle-select`)
            setStays(prev => prev.map(s => s._id === stayId ? res.data : s))
        } catch (err) {
            console.error('Error toggling stay:', err)
        }
    }

    const handleDelete = async () => {
        try {
            setDeleting(true)
            await api.delete(`/stays/${stayToDelete._id}`)
            setStays(prev => prev.filter(s => s._id !== stayToDelete._id))
            setStayToDelete(null)
        } catch (err) {
            console.error('Error deleting stay:', err)
        } finally {
            setDeleting(false)
        }
    }

    const getMemberColor = (userId) => {
        const member = trip?.members.find(m => m.user._id === userId || m.user === userId)
        return member?.color || 'var(--accent)'
    }

    const perPerson = (stay) => {
        if (!stay.cost || !stay.splitWith?.length) return null
        return ((stay.cost * (stay.quantity || 1)) / stay.splitWith.length).toFixed(2)
    }

    const selected = stays.filter(s => s.isSelected).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
    const unselected = stays.filter(s => !s.isSelected).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
    const mapStays = stays.filter(s => s.coordinates?.lat && s.coordinates?.lng)
    const mapCenter = mapStays.length > 0
        ? [mapStays[0].coordinates.lat, mapStays[0].coordinates.lng]
        : city?.coordinates ? [city.coordinates.lat, city.coordinates.lng] : [48, 16]

    if (loading) return <div className="loading">Loading...</div>

    const renderStayCard = (stay) => {
        const color = getMemberColor(stay.addedBy?._id || stay.addedBy)
        const pp = perPerson(stay)

        return (
            <div key={stay._id} className={`stay-card ${stay.isSelected ? 'selected' : ''}`}
                style={stay.isSelected ? { borderColor: color, boxShadow: `0 0 16px ${color}20` } : {}}>

                <button
                    className={`stay-select-btn ${stay.isSelected ? 'checked' : ''}`}
                    style={stay.isSelected ? { borderColor: color, backgroundColor: color } : {}}
                    onClick={() => handleToggleSelect(stay._id)}
                    title={stay.isSelected ? 'Deselect' : 'Select as your stay'}
                >
                </button>

                <div className="stay-card-content">
                    <div className="stay-card-top">
                        <div className="stay-card-main">
                            <div className="stay-card-header">
                                {stay.bookingUrl ? (
                                    <a href={stay.bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-name-link">
                                        {stay.name} ↗
                                    </a>
                                ) : (
                                    <span className="stay-name">{stay.name}</span>
                                )}
                                {stay.quantity > 1 && <span className="stay-quantity">×{stay.quantity}</span>}
                            </div>
                            {stay.address && <p className="stay-address">{stay.address}</p>}
                            {(stay.checkIn || stay.checkOut) && (
                                <span className="stay-dates">
                                    {stay.checkIn && new Date(stay.checkIn).toLocaleDateString('en-GB')}
                                    {stay.checkOut && ` → ${new Date(stay.checkOut).toLocaleDateString('en-GB')}`}
                                </span>
                            )}
                        </div>
                        {stay.cost > 0 && (
                            <div className="stay-cost-block">
                                <span className="stay-total">€{(stay.cost * (stay.quantity || 1)).toFixed(2)}</span>
                                {pp && <span className="stay-per-person">€{pp}<span className="pp-label">/person</span></span>}
                            </div>
                        )}
                    </div>
                    {stay.splitWith?.length > 0 && (
                        <div className="stay-split">
                            <span className="split-label">Split:</span>
                            <div className="split-avatars">
                                {stay.splitWith.map(uid => {
                                    const member = trip.members.find(m => m.user._id === uid || m.user === uid)
                                    if (!member) return null
                                    return (
                                        <div
                                            key={uid}
                                            className="member-avatar"
                                            style={{
                                                border: `2px solid ${member.color}`,
                                                width: 24, height: 24, fontSize: '0.65rem'
                                            }}
                                            title={member.user.name || member.user.username}
                                        >
                                            {member.user.avatar && member.user.avatar !== 'images/default-avatar.png' ? (
                                                <img src={member.user.avatar} alt="" />
                                            ) : (
                                                <span style={{ backgroundColor: member.color }}>
                                                    {member.user.name?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {stay.notes && <p className="stay-notes">{stay.notes}</p>}
                </div>

                <div className="stay-card-actions">
                    <div 
                        className="member-avatar"
                        style={{ width: 28, height: 28, border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}60` }}
                        title={`Added by ${stay.addedBy?.name || stay.addedBy?.username}`}
                    >
                        {stay.addedBy?.avatar && stay.addedBy.avatar !== 'images/default-avatar.png' ? (
                            <img src={stay.addedBy.avatar} alt="" />
                        ) : (
                            <span style={{ backgroundColor: color }}>{stay.addedBy?.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <button className="btn-icon danger" onClick={() => setStayToDelete(stay)} title="Delete">🗑</button>
                </div>
            </div>
        )
    }

    return (
        <div className="section-page">
            <header className="trip-header">
                <button className="btn-back" onClick={() => navigate(`/trips/${id}`)}>← Back</button>
                <div className="trip-header-info">
                    <h1>Stays</h1>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {city?.name}{city?.country && `, ${city.country}`}
                    </span>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Stay</button>
            </header>

            <div className="stays-section-content">
                {stays.length === 0 ? (
                    <div className="empty-state">
                        <p>No stays yet — add your first accommodation!</p>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Stay</button>
                    </div>
                ) : (
                    <>
                        {selected.length > 0 && (
                            <div className="stays-group">
                                <h2 className="stays-group-label">Booked</h2>
                                {selected.map(renderStayCard)}
                            </div>
                        )}
                        {unselected.length > 0 && (
                            <div className="stays-group">
                                <h2 className="stays-group-label">Choices</h2>
                                {unselected.map(renderStayCard)}
                            </div>
                        )}
                    </>
                )}

                {/* MAP */}
                {mapStays.length > 0 && (
                    console.log('Rendering map with stays:', mapStays),
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
                            {mapStays.map(stay => (
                                <Marker
                                    key={stay._id}
                                    position={[stay.coordinates.lat, stay.coordinates.lng]}
                                    icon={createColorIcon(getMemberColor(stay.addedBy?._id || stay.addedBy), stay.isSelected)}
                                >
                                    <Popup>
                                        <strong>{stay.name}</strong>
                                        {stay.address && <><br />{stay.address}</>}
                                        {stay.cost > 0 && <><br />€{(stay.cost * (stay.quantity || 1)).toFixed(2)}</>}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                )}
            </div>

            {showAddModal && trip && (
                <AddStayModal
                    tripId={id}
                    cityId={cityId}
                    members={trip.members}
                    tripStartDate={trip.startDate}
                    tripEndDate={trip.endDate}
                    onClose={() => setShowAddModal(false)}
                    onAdded={stay => setStays(prev => [stay, ...prev])}
                />
            )}

            {stayToDelete && (
                <ConfirmDeleteModal
                    title="Delete Stay"
                    message={`Remove "${stayToDelete.name}"? Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => setStayToDelete(null)}
                    onConfirm={handleDelete}
                    loading={deleting}
                />
            )}
        </div>
    )
}

export default StaysPage