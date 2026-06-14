import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api/axios'
import AddStayModal from '../components/AddStayModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

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
    const [stayToEdit, setStayToEdit] = useState(null)
    const [expandedNotes, setExpandedNotes] = useState({})
    const [noteInputs, setNoteInputs] = useState({})

    const toggleNotes = (stayId) => {
        setExpandedNotes(prev => ({ ...prev, [stayId]: !prev[stayId] }))
    }

    const handleAddNote = async (stayId) => {
        const text = noteInputs[stayId]?.trim()
        if (!text) return
        try {
            const res = await api.post(`/stays/${stayId}/notes`, { text })
            setStays(prev => prev.map(s => s._id === stayId ? res.data : s))
            setNoteInputs(prev => ({ ...prev, [stayId]: '' }))
        } catch (err) {
            console.error('Error adding note:', err)
        }
    }

    const handleDeleteNote = async (stayId, noteId) => {
        try {
            await api.delete(`/stays/${stayId}/notes/${noteId}`)
            setStays(prev => prev.map(s => s._id === stayId ? {
                ...s, notes: s.notes.filter(n => n._id !== noteId)
            } : s))
        } catch (err) {
            console.error('Error deleting note:', err)
        }
    }

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
        return (stay.cost / stay.splitWith.length || 1).toFixed(2)
    }

    const selected = stays.filter(s => s.isSelected).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
    const unselected = stays.filter(s => !s.isSelected).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
    const mapStays = stays.filter(s => s.coordinates?.lat && s.coordinates?.lng)
    const mapCenter = mapStays.length > 0
        ? [mapStays[0].coordinates.lat, mapStays[0].coordinates.lng]
        : city?.coordinates ? [city.coordinates.lat, city.coordinates.lng] : [48, 16]
    const backCityId = cityId || localStorage.getItem(`trip-active-city-${id}`)

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
                                    {stay.checkOut && ` - ${new Date(stay.checkOut).toLocaleDateString('en-GB')}`}
                                    {" (" + (stay.checkOut && stay.checkIn ? Math.ceil((new Date(stay.checkOut) - new Date(stay.checkIn)) / (1000 * 60 * 60 * 24)) : 1) + " nights)"}
                                    
                                </span>
                            )}
                        </div>
                        {stay.cost > 0 && (
                            <div className="stay-cost-block">
                                <span className="stay-total">€{(stay.cost).toFixed(2)}</span>
                                {pp && stay.quantity > 1 && (
                                    <span className="stay-per-person">€{(stay.cost / stay.quantity).toFixed(2)}<span className="pp-label"> total per unit</span></span>
                                )}   
                                {pp && <span className="stay-per-person">€{pp}<span className="pp-label"> total per person</span></span>}
                            </div>
                        )}
                    </div>
                    {stay.splitWith?.length > 0 && (
                        <div className="stay-split">
                            <span className="split-label">Split Between:</span>

                            <div className="split-avatars">
                                {stay.splitWith.map(person => {
                                    console.log("person", person)

                                    const id = (person._id || person)?.toString()

                                    const tripMember = trip.members.find(
                                        m => (m.user?._id || m.user)?.toString() === id
                                    )

                                    const guest = trip.guests?.find(
                                        g => g._id?.toString() === id
                                    )

                                    const name =
                                        tripMember?.user?.name ||
                                        tripMember?.user?.username ||
                                        guest?.name ||
                                        '?'

                                    const avatar =
                                        tripMember?.user?.avatar ||
                                        guest?.avatar

                                    const color = getMemberColor(id)

                                    return (
                                        <div
                                            key={id}
                                            className="member-avatar"
                                            style={{
                                                border: `2px solid ${color}`,
                                                width: 24,
                                                height: 24,
                                                fontSize: '0.65rem'
                                            }}
                                            title={name}
                                        >
                                            {avatar && avatar !== 'images/default-avatar.png' ? (
                                                <img src={avatar} alt="" />
                                            ) : (
                                                <span style={{ backgroundColor: color }}>
                                                    {name?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    <div className="stay-notes-section">
                        <button 
                            className="notes-toggle"
                            onClick={() => toggleNotes(stay._id)}
                        >
                            <span>{stay.notes?.length || 0} note{stay.notes?.length !== 1 ? 's' : ''}</span>
                            <span>{expandedNotes[stay._id] ? '▲' : '▼'}</span>
                        </button>

                        {expandedNotes[stay._id] && (
                            <div className="notes-expanded">
                                {stay.notes?.length > 0 && (
                                    <div className="notes-list-stay">
                                        {stay.notes.map(note => (
                                            <div key={note._id} className="note-item">
                                                <div className="note-item-avatar">
                                                    {note.user?.avatar && note.user.avatar !== 'images/default-avatar.png' ? (
                                                        <img src={note.user.avatar} alt="" />
                                                    ) : (
                                                        <span>{note.user?.name?.[0]?.toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="note-item-content">
                                                    <span className="note-item-author">{note.user?.name || note.user?.username}</span>
                                                    <p className="note-item-text">{note.text}</p>
                                                </div>
                                                <button 
                                                    className="btn-icon danger" 
                                                    style={{ fontSize: '0.7rem', width: 24, height: 24 }}
                                                    onClick={() => handleDeleteNote(stay._id, note._id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="note-input-row">
                                    <input
                                        type="text"
                                        value={noteInputs[stay._id] || ''}
                                        onChange={e => setNoteInputs(prev => ({ ...prev, [stay._id]: e.target.value }))}
                                        placeholder="Add a note..."
                                        onKeyDown={e => e.key === 'Enter' && handleAddNote(stay._id)}
                                    />
                                    <button 
                                        className="btn-primary" 
                                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                                        onClick={() => handleAddNote(stay._id)}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="stay-card-actions">
                    <div 
                        className="member-avatar"
                        style={{ width: 42, height: 42, border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}60` }}
                        title={`Added by ${stay.addedBy?.name || stay.addedBy?.username}`}
                    >
                        {stay.addedBy?.avatar && stay.addedBy.avatar !== 'images/default-avatar.png' ? (
                            <img src={stay.addedBy.avatar} alt="" />
                        ) : (
                            <span style={{ backgroundColor: color }}>{stay.addedBy?.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: '5%' }}>
                        <button className="btn-icon" onClick={() => setStayToEdit(stay)} title="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => setStayToDelete(stay)} title="Delete">X</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="section-page">
            <header className="trip-header">
                <button className="btn-back" style={{ height: "-webkit-fill-available" }} onClick={() => navigate(backCityId ? `/trips/${id}/${backCityId}` : `/trips/${id}`)}>Back</button>
                <div className="trip-header-info">
                    <h1>Stays</h1>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {city?.name}{city?.country && `, ${city.country}`}
                    </span>
                </div>
                <button className="btn-primary" style={{ alignSelf: 'center' }} onClick={() => setShowAddModal(true)}>+ Add Stay</button>
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
                                        {stay.cost > 0 && <><br />€{(stay.cost / (stay.quantity || 1)).toFixed(2)}</>}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                )}
            </div>

            {(showAddModal || stayToEdit) && trip && (
                <AddStayModal
                    tripId={id}
                    cityId={cityId}
                    members={trip.members}
                    tripStartDate={trip.startDate}
                    tripEndDate={trip.endDate}
                    initialData={stayToEdit}
                    onClose={() => { setShowAddModal(false); setStayToEdit(null) }}
                    onAdded={stay => {
                        if (stayToEdit) {
                            setStays(prev => prev.map(s => s._id === stay._id ? stay : s))
                        } else {
                            setStays(prev => [stay, ...prev])
                        }
                        setStayToEdit(null)
                    }}
                    guests={trip.guests || []}
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