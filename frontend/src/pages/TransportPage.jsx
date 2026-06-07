import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AddTransportModal from '../components/AddTransportModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TRANSPORT_ICONS = {
    flight: '✈️',
    train: '🚆',
    bus: '🚌',
    car: '🚗',
    ferry: '⛴️',
    other: '🚀'
}

const getCurvedPoints = (from, to, offset = 0.3, direction = 1) => {
    const midLat = (from[0] + to[0]) / 2
    const midLng = (from[1] + to[1]) / 2
    const dLat = to[0] - from[0]
    const dLng = to[1] - from[1]
    const perpLat = -dLng * offset * direction
    const perpLng = dLat * offset * direction
    const points = []
    for (let i = 0; i <= 50; i++) {
        const t = i / 50
        const lat = (1-t)*(1-t)*from[0] + 2*(1-t)*t*(midLat + perpLat) + t*t*to[0]
        const lng = (1-t)*(1-t)*from[1] + 2*(1-t)*t*(midLng + perpLng) + t*t*to[1]
        points.push([lat, lng])
    }
    return points
}

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

const TransportPage = () => {
    const { id, cityId } = useParams()
    const navigate = useNavigate()
    const [trip, setTrip] = useState(null)
    const [city, setCity] = useState(null)
    const [cities, setCities] = useState([])
    const [transports, setTransports] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [transportToEdit, setTransportToEdit] = useState(null)
    const [transportToDelete, setTransportToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes, transportsRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(`/transports/${cityId}`)
                ])
                setTrip(tripRes.data)
                setCities(citiesRes.data)
                const currentCity = citiesRes.data.find(c => c._id === cityId)
                setCity(currentCity)
                console.log(currentCity)
                setTransports(transportsRes.data)
            } catch (err) {
                console.error('Error fetching transport:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, cityId])

    const handleToggleConfirmed = async (transportId) => {
        try {
            const res = await api.post(`/transports/${transportId}/toggle-confirmed`)
            setTransports(prev => prev.map(t => t._id === transportId ? res.data : t))
        } catch (err) {
            console.error('Error toggling confirmed:', err)
        }
    }

    const handleDelete = async () => {
        try {
            setDeleting(true)
            await api.delete(`/transports/${transportToDelete._id}`)
            setTransports(prev => prev.filter(t => t._id !== transportToDelete._id))
            setTransportToDelete(null)
        } catch (err) {
            console.error('Error deleting transport:', err)
        } finally {
            setDeleting(false)
        }
    }

    const getMemberColor = (userId) => {
        const id = userId?._id || userId
        const member = trip?.members.find(m => 
            m.user._id?.toString() === id?.toString() || 
            m.user?.toString() === id?.toString()
        )
        return member?.color || 'var(--accent)'
    }

    const perPerson = (transport) => {
        if (!transport.cost || !transport.splitWith?.length) return null
        return (transport.cost / transport.splitWith.length || 1).toFixed(2)
    }

    const getCityName = (cityId) => {
        const city = cities.find(c => c._id === cityId)
        return city?.name || null
    }

    const confirmed = transports.filter(t => t.isConfirmed).sort((a, b) => new Date(a.departure) - new Date(b.departure))
    const unconfirmed = transports.filter(t => !t.isConfirmed).sort((a, b) => new Date(a.departure) - new Date(b.departure))
    const backCityId = cityId || localStorage.getItem(`trip-active-city-${id}`)

    if (loading) return <div className="loading">Loading...</div>

    const renderTransportCard = (transport) => {
        const color = getMemberColor(transport.addedBy?._id || transport.addedBy)
        const pp = perPerson(transport)
        const isOrigin = transport.cityId === cityId || transport.cityId?._id === cityId

        return (
            <div
                key={transport._id}
                className={`stay-card ${transport.isConfirmed ? 'selected' : ''}`}
                style={transport.isConfirmed ? { borderColor: color, boxShadow: `0 0 16px ${color}20` } : {}}
            >
                {/* CONFIRM BUTTON */}
                <button
                    className={`stay-select-btn ${transport.isConfirmed ? 'checked' : ''}`}
                    style={transport.isConfirmed ? { borderColor: color, backgroundColor: color } : {}}
                    onClick={() => handleToggleConfirmed(transport._id)}
                    title={transport.isConfirmed ? 'Mark unconfirmed' : 'Mark confirmed'}
                >
                    {transport.isConfirmed ? '✓' : ''}
                </button>

                <div className="stay-card-content">
                    <div className="stay-card-top">
                        <div className="stay-card-main">
                            {/* TYPE + ROUTE */}
                            <div className="transport-route">
                                <span className="transport-icon">{TRANSPORT_ICONS[transport.type]}</span>
                                <div className="transport-route-info">
                                    <div className="transport-route-main">
                                        {transport.link ? (
                                            <a href={transport.link} target="_blank" rel="noopener noreferrer" className="stay-name-link">
                                                {transport.from} → {transport.to}{transport.quantity > 1 ? ` (${transport.quantity})` : ''} ↗
                                            </a>
                                        ) : (
                                            <span className="stay-name">
                                                {transport.from} → {transport.to}{transport.quantity > 1 ? ` (${transport.quantity})` : ''}
                                            </span>
                                        )}
                                        {!isOrigin && (
                                            <span className="transport-origin-badge">via {getCityName(transport.cityId) || 'other city'}</span>
                                        )}
                                    </div>
                                    <span className="transport-type-label">{transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}</span>
                                </div>
                            </div>

                            {/* TIMES */}
                            {(transport.departure || transport.arrival) && (
                                <div className="transport-times">
                                    {transport.departure && transport.arrival ? (
                                        <span className="stay-dates">
                                            {new Date(transport.departure).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                                            {new Date(transport.departure).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            {' -----['}
                                            {(() => {
                                                const durationMs = Math.max(0, new Date(transport.arrival) - new Date(transport.departure));
                                                const totalMinutes = Math.floor(durationMs / 60000);
                                                const days = Math.floor(totalMinutes / 1440);
                                                const hours = Math.floor((totalMinutes % 1440) / 60);
                                                const minutes = totalMinutes % 60;

                                                return [
                                                    days ? `${days}d` : null,
                                                    hours ? `${hours}h` : null,
                                                    minutes ? `${minutes}m` : null,
                                                ].filter(Boolean).join(' ') || '0m';
                                            })()}
                                            {']-----> '}
                                            {new Date(transport.arrival).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                                            {new Date(transport.arrival).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    ) : transport.departure ? (
                                        <span className="stay-dates">
                                            🛫 {new Date(transport.departure).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    ) : (
                                        <span className="stay-dates">
                                            🛬 {new Date(transport.arrival).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* COST */}
                        {transport.cost > 0 && (
                            <div className="stay-cost-block">
                                <span className="stay-total">€{(transport.cost).toFixed(2)}</span>
                                {pp && <span className="stay-per-person">€{pp}<span className="pp-label">/person</span></span>}
                            </div>
                        )}
                    </div>

                    {/* SPLIT WITH */}
                    {transport.splitWith?.length > 0 && (
                        <div className="stay-split">
                            <span className="split-label">Split:</span>
                            <div className="split-avatars">
                                {transport.splitWith.map(member => {
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

                    {transport.note && <p className="stay-notes">{transport.note}</p>}
                </div>

                {/* ACTIONS */}
                <div className="stay-card-actions">
                    <div
                        className="member-avatar"
                        style={{ width: 42, height: 42, border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}60` }}
                        title={`Added by ${transport.addedBy?.name || transport.addedBy?.username}`}
                    >
                        {transport.addedBy?.avatar && transport.addedBy.avatar !== 'images/default-avatar.png' ? (
                            <img src={transport.addedBy.avatar} alt="" />
                        ) : (
                            <span style={{ backgroundColor: color }}>{transport.addedBy?.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: '5%' }}>
                        <button className="btn-icon" onClick={() => setTransportToEdit(transport)} title="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => setTransportToDelete(transport)} title="Delete">🗑</button>
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
                <h1>Transport</h1>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {city?.name}{city?.country && `, ${city.country}`}
                </span>
            </div>
            <button className="btn-primary" style={{ alignSelf: 'center' }} onClick={() => setShowAddModal(true)}>+ Add Transport</button>
        </header>

        <div className="stays-section-content">
            {transports.length === 0 ? (
                <div className="empty-state">
                    <p>No transport yet — add your first route!</p>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Transport</button>
                </div>
            ) : (
                <>
                    {confirmed.length > 0 && (
                        <div className="stays-group">
                            <h2 className="stays-group-label">✓ Confirmed</h2>
                            {confirmed.map(renderTransportCard)}
                        </div>
                    )}
                    {unconfirmed.length > 0 && (
                        <div className="stays-group">
                            <h2 className="stays-group-label">Unconfirmed</h2>
                            {unconfirmed.map(renderTransportCard)}
                        </div>
                    )}
                </>
            )}

            {/* MAP */}
            {(() => {
                const routeTransports = transports.filter(t => {
                    const fromCity = cities.find(c => c._id === (t.fromCityId?._id || t.fromCityId))
                    const toCity = cities.find(c => c._id === (t.toCityId?._id || t.toCityId))
                    return fromCity?.coordinates?.lat && toCity?.coordinates?.lat
                })

                if (routeTransports.length === 0) return null

                const allCoords = routeTransports.flatMap(t => {
                    const fromCity = cities.find(c => c._id === (t.fromCityId?._id || t.fromCityId))
                    const toCity = cities.find(c => c._id === (t.toCityId?._id || t.toCityId))
                    return [
                        [fromCity.coordinates.lat, fromCity.coordinates.lng],
                        [toCity.coordinates.lat, toCity.coordinates.lng]
                    ]
                })

                const centerLat = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length
                const centerLng = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length

                return (
                    <div className="stays-map-wrapper">
                        <h2 className="stays-group-label">Route Map</h2>
                        <MapContainer
                            center={[centerLat, centerLng]}
                            zoom={5}
                            className="stays-map"
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            {routeTransports.map(t => {
                                const fromCity = cities.find(c => c._id === (t.fromCityId?._id || t.fromCityId))
                                const toCity = cities.find(c => c._id === (t.toCityId?._id || t.toCityId))
                                const color = getMemberColor(t.addedBy?._id || t.addedBy)
                                const from = [fromCity.coordinates.lat, fromCity.coordinates.lng]
                                const to = [toCity.coordinates.lat, toCity.coordinates.lng]

                                return (
                                    <div key={t._id}>
                                        <Polyline
                                            positions={t.isReturn ? getCurvedPoints(from, to, 0.3, 1) : [from, to]}
                                            pathOptions={{ color, weight: 2, dashArray: t.isConfirmed ? null : '6 4', opacity: t.isConfirmed ? 1 : 0.5 }}
                                        />
                                        {t.isReturn && (
                                            <Polyline
                                                positions={getCurvedPoints(to, from, 0.3, 1)}
                                                pathOptions={{ color, weight: 2, dashArray: t.isConfirmed ? null : '6 4', opacity: t.isConfirmed ? 0.8 : 0.4 }}
                                            />
                                        )}
                                        <Marker position={from} icon={createColorIcon(color, false)}>
                                            <Popup>{fromCity.name}</Popup>
                                        </Marker>
                                        <Marker position={to} icon={createColorIcon(color, t.isConfirmed)}>
                                            <Popup>{toCity.name}</Popup>
                                        </Marker>
                                    </div>
                                )
                            })}
                        </MapContainer>
                    </div>
                )
            })()}
        </div>

        {(showAddModal || transportToEdit) && trip && (
            <AddTransportModal
                tripId={id}
                cityId={cityId}
                cities={cities}
                members={trip.members}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                initialData={transportToEdit}
                onClose={() => { setShowAddModal(false); setTransportToEdit(null) }}
                onAdded={transport => {
                    if (transportToEdit) {
                        setTransports(prev => prev.map(t => t._id === transport._id ? transport : t))
                    } else {
                        setTransports(prev => [transport, ...prev])
                    }
                    setTransportToEdit(null)
                }}
            />
        )}

        {transportToDelete && (
            <ConfirmDeleteModal
                title="Delete Transport"
                message={`Remove "${transportToDelete.from} → ${transportToDelete.to}"? Type DELETE to confirm.`}
                confirmPhrase="DELETE"
                onCancel={() => setTransportToDelete(null)}
                onConfirm={handleDelete}
                loading={deleting}
            />
        )}
    </div>
    )
}

export default TransportPage