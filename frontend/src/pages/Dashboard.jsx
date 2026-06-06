import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NewTripModal from '../components/NewTripModal'
import api from '../api/axios'

const Dashboard = () => {
    const [trips, setTrips] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [pastExpanded, setPastExpanded] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const res = await api.get('/trips')
                setTrips(res.data)
            } catch (err) {
                console.error('Error fetching trips:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTrips()
    }, [])

    const handleCreated = (newTrip) => {
        setTrips(prev => [newTrip, ...prev])
    }

    const now = new Date()
    const upcoming = trips.filter(t => !t.endDate || new Date(t.endDate) >= now)
    const past = trips.filter(t => t.endDate && new Date(t.endDate) < now)

    if (loading) return <div className="loading">Loading...</div>

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>My Trips</h1>
                <div className="header-right">
                    <button className="btn-secondary" onClick={() => navigate('/profile')}>Profile</button>
                    <button className="btn-secondary" onClick={logout} id="logout-btn">
                        Logout
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="section-header">
                    <h2>Upcoming</h2>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + New Trip
                    </button>
                </div>

                {upcoming.length === 0 ? (
                    <div className="empty-state">
                        <p>No upcoming trips yet.</p>
                        <button className="btn-primary" onClick={() => setShowModal(true)}>
                            Plan your first trip
                        </button>
                    </div>
                ) : (
                    <div className="trips-grid">
                        {upcoming.map(trip => (
                            <div key={trip._id} className="trip-card" onClick={() => navigate(`/trips/${trip._id}`)}>
                                <div className="trip-card-header">
                                    <h3>{trip.title}</h3>
                                    <div className="member-avatars">
                                        {trip.members.slice(0, 4).map(m => (
                                            <div
                                                key={m.user._id}
                                                className="member-dot"
                                                style={{ backgroundColor: m.color }}
                                                title={m.user.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {trip.description && <p className="trip-description">{trip.description}</p>}
                                <div className="trip-meta">
                                    {trip.startDate ? (
                                        <span>
                                            {new Date(trip.startDate).toLocaleDateString('en-GB')} 
                                            {trip.endDate && ` → ${new Date(trip.endDate).toLocaleDateString('en-GB')}`}
                                        </span>
                                    ) : (
                                        <span className="no-dates">No dates set</span>
                                    )}
                                    <span>{trip.members.length} member{trip.members.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {past.length > 0 && (
                    <div className="past-section">
                        <button className="past-toggle" onClick={() => setPastExpanded(!pastExpanded)}>
                            <span>Past Trips ({past.length})</span>
                            <span>{pastExpanded ? '▲' : '▼'}</span>
                        </button>
                        {pastExpanded && (
                            <div className="trips-grid">
                                {past.map(trip => (
                                    <div key={trip._id} className="trip-card past" onClick={() => navigate(`/trips/${trip._id}`)}>
                                        <div className="trip-card-header">
                                            <h3>{trip.title}</h3>
                                        </div>
                                        <div className="trip-meta">
                                            <span>{new Date(trip.startDate).toLocaleDateString('en-GB')} → {new Date(trip.endDate).toLocaleDateString('en-GB')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showModal && <NewTripModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
        </div>
    )
}

export default Dashboard