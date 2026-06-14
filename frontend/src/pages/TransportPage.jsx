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

const createArrowIcon = (color, bearing) => L.divIcon({
    className: 'route-arrowhead-marker',
    html: `<div style="
        transform: rotate(${bearing}deg);
        width: 0; 
        height: 0; 
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 12px solid ${color};
        filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4));
        background: transparent;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    pane: 'popupPane'
});

const calculateBearing = (from, to) => {
    const lat1 = from[0] * Math.PI / 180;
    const lat2 = to[0] * Math.PI / 180;
    const lon1 = from[1] * Math.PI / 180;
    const lon2 = to[1] * Math.PI / 180;

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    return (angle + 360) % 360;
};

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
                const endpoint = cityId === 'trip' ? `/transports/trip?tripId=${id}` : `/transports/${cityId}`
                
                const [tripRes, citiesRes, transportsRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(endpoint)
                ])
                setTrip(tripRes.data)
                setCities(citiesRes.data)
                
                if (cityId && cityId !== 'trip') {
                    const currentCity = citiesRes.data.find(c => c._id === cityId)
                    setCity(currentCity)
                }
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

    const getCityName = (idField) => {
        if (!idField) return null
        const targetId = idField?._id || idField
        const city = cities.find(c => c._id === targetId)
        return city?.name || null
    }

    const getTransportCoords = (transport) => {
        const fromCityRaw = cities.find(c => c._id === (transport.fromCityId?._id || transport.fromCityId))
        const toCityRaw = cities.find(c => c._id === (transport.toCityId?._id || transport.toCityId))

        const fromLat = fromCityRaw?.coordinates?.lat || transport.fromCoordinates?.lat
        const fromLng = fromCityRaw?.coordinates?.lng || transport.fromCoordinates?.lon || transport.fromCoordinates?.lng

        const toLat = toCityRaw?.coordinates?.lat || transport.toCoordinates?.lat
        const toLng = toCityRaw?.coordinates?.lng || transport.toCoordinates?.lon || transport.toCoordinates?.lng

        if (fromLat && fromLng && toLat && toLng) {
            return {
                from: [fromLat, fromLng],
                to: [toLat, toLng],
                fromName: fromCityRaw?.name || transport.from,
                toName: toCityRaw?.name || transport.to
            }
        }
        return null
    }

    const confirmed = transports.filter(t => t.isConfirmed).sort((a, b) => new Date(a.departure) - new Date(b.departure))
    const unconfirmed = transports.filter(t => !t.isConfirmed).sort((a, b) => new Date(a.departure) - new Date(b.departure))
    const backCityId = cityId || localStorage.getItem(`trip-active-city-${id}`)

    if (loading) return <div className="loading">Loading...</div>

    const renderTransportCard = (transport) => {
        const color = getMemberColor(transport.addedBy?._id || transport.addedBy)
        const pp = perPerson(transport)
        const isOrigin = cityId && (transport.cityId === cityId || transport.cityId?._id === cityId)

        return (
            <div
                key={transport._id}
                className={`stay-card ${transport.isConfirmed ? 'selected' : ''}`}
                style={transport.isConfirmed ? { borderColor: color, boxShadow: `0 0 16px ${color}20` } : {}}
            >
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
                                        {!isOrigin && transport.cityId && (
                                            <span className="transport-origin-badge">via {getCityName(transport.cityId) || 'other location'}</span>
                                        )}
                                    </div>
                                    <span className="transport-type-label">{transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}</span>
                                </div>
                            </div>

                            {(transport.departure || transport.arrival) && (
                                <div className="transport-times">
                                    {transport.departure && transport.arrival ? (
                                        <span className="stay-dates">
                                            {'<DEPARTURE> ' + new Date(transport.departure).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                                            {'[' + new Date(transport.departure).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ']'}
                                            {'-----['}
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
                                            {']----->'}
                                            {'[' + new Date(transport.arrival).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '] '}
                                            {new Date(transport.arrival).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' <ARRIVAL>'}
                                        </span>
                                    ) : transport.departure ? (
                                        <span className="stay-dates">
                                            Departure: {new Date(transport.departure).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    ) : (
                                        <span className="stay-dates">
                                            Arrival: {new Date(transport.arrival).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {transport.cost > 0 && (
                            <div className="stay-cost-block">
                                <span className="stay-total">€{(transport.cost).toFixed(2)}</span>
                                {pp && <span className="stay-per-person">€{pp}<span className="pp-label">/person</span></span>}
                            </div>
                        )}
                    </div>

                    {transport.splitWith?.map(uid => {
                        const uidStr = (uid._id || uid)?.toString()
                        const tripMember = trip.members.find(m => m.user._id?.toString() === uidStr)
                        const guest = trip.guests?.find(g => g._id?.toString() === uidStr)
                        const color = tripMember?.color || guest?.color || 'var(--accent)'
                        const name = tripMember?.user?.name || tripMember?.user?.username || guest?.name || '?'
                        const avatar = tripMember?.user?.avatar

                        return (
                            <div
                                key={uidStr}
                                className="member-avatar"
                                style={{ border: `2px solid ${color}`, width: 24, height: 24, fontSize: '0.65rem' }}
                                title={name}
                            >
                                {avatar && avatar !== 'images/default-avatar.png' ? (
                                    <img src={avatar} alt="" />
                                ) : (
                                    <span style={{ backgroundColor: color }}>{name?.[0]?.toUpperCase()}</span>
                                )}
                            </div>
                        )
                    })}

                    {transport.note && <p className="stay-notes">{transport.note}</p>}
                </div>

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
            <button className="btn-back" style={{ height: "-webkit-fill-available" }} onClick={() => navigate(backCityId && backCityId !== 'trip' ? `/trips/${id}/${backCityId}` : `/trips/${id}`)}>Back</button>
            <div className="trip-header-info">
                <h1>Transport</h1>
                {city && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {city.name}{city.country && `, ${city.country}`}
                    </span>
                )}
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
                            <h2 className="stays-group-label">Confirmed</h2>
                            {confirmed.map(renderTransportCard)}
                        </div>
                    )}
                    {unconfirmed.length > 0 && (
                        <div className="stays-group">
                            <h2 className="stays-group-label">Planned</h2>
                            {unconfirmed.map(renderTransportCard)}
                        </div>
                    )}
                </>
            )}

            {/* MAP */}
            {(() => {
                const mappedRoutes = transports
                    .map(t => ({ transport: t, coords: getTransportCoords(t) }))
                    .filter(item => item.coords !== null);

                if (mappedRoutes.length === 0) return null;

                const allCoords = mappedRoutes.flatMap(item => [item.coords.from, item.coords.to]);
                const centerLat = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
                const centerLng = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;

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
                            {mappedRoutes.map(({ transport: t, coords }) => {
                                const color = getMemberColor(t.addedBy?._id || t.addedBy);

                                const forwardPoints = getCurvedPoints(coords.from, coords.to, t.isReturn ? 0.3 : 0.15, 1);
                                const returnPoints = t.isReturn ? getCurvedPoints(coords.to, coords.from, 0.3, 1) : null;

                                const forwardTarget = forwardPoints[forwardPoints.length - 1];
                                const forwardPreTarget = forwardPoints[forwardPoints.length - 3] || forwardPoints[0]; 
                                const forwardBearing = calculateBearing(forwardPreTarget, forwardTarget);

                                let returnBearing = 0;
                                let returnPreTarget = null;
                                if (returnPoints) {
                                    const returnTarget = returnPoints[returnPoints.length - 1];
                                    returnPreTarget = returnPoints[returnPoints.length - 3] || returnPoints[0];
                                    returnBearing = calculateBearing(returnPreTarget, returnTarget);
                                }

                                return (
                                    <div key={t._id}>
                                        <Polyline
                                            positions={forwardPoints}
                                            pathOptions={{ color, weight: 2, dashArray: t.isConfirmed ? null : '6 4', opacity: t.isConfirmed ? 1 : 0.5 }}
                                        />
                                        
                                        <Marker position={forwardPreTarget} icon={createArrowIcon(color, forwardBearing)} interactive={false} />

                                        {t.isReturn && (
                                            <>
                                                <Polyline
                                                    positions={returnPoints}
                                                    pathOptions={{ color, weight: 2, dashArray: t.isConfirmed ? null : '6 4', opacity: t.isConfirmed ? 0.8 : 0.4 }}
                                                />
                                                {returnPreTarget && (
                                                    <Marker 
                                                        position={returnPreTarget} 
                                                        icon={createArrowIcon(color, returnBearing)} 
                                                        interactive={false} 
                                                    />
                                                )}
                                            </>
                                        )}
                                        <Marker position={coords.from} icon={createColorIcon(color, false)}>
                                            <Popup>{coords.fromName}</Popup>
                                        </Marker>
                                        <Marker position={coords.to} icon={createColorIcon(color, t.isConfirmed)}>
                                            <Popup>{coords.toName}</Popup>
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
                cityId={cityId === 'trip' ? null : cityId}
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
                guests={trip.guests || []}
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

export default TransportPage;