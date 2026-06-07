import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AddCityModal from '../components/AddCityModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable, } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../context/AuthContext'

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

const SortableCityTab = ({ city, activeCity, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: city._id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
    }

    return (
        <button
            ref={setNodeRef}
            style={{
                ...style,
                ...(activeCity === city._id ? { borderColor: city.color, color: city.color } : {})
            }}
            className={`city-tab ${activeCity === city._id ? 'active' : ''}`}
            onClick={onClick}
            {...attributes}
            {...listeners}
        >
            {city.name}
            {city.country && <span className="tab-country">{city.country}</span>}
        </button>
    )
}

const TripPage = () => {
    const { id, cityId } = useParams()
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
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleValue, setTitleValue] = useState('')
    const [savingTrip, setSavingTrip] = useState(false)
    const [expenses, setExpenses] = useState(null)
    const { user } = useAuth()
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 8 }
    }))

    const handleDragEnd = async (event) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = cities.findIndex(c => c._id === active.id)
        const newIndex = cities.findIndex(c => c._id === over.id)
        const reordered = arrayMove(cities, oldIndex, newIndex).map((city, i) => ({ ...city, order: i }))
        setCities(reordered)
        try {
            await api.patch(`/trips/${id}/cities/reorder`, reordered.map(c => ({ _id: c._id, order: c.order })))
        } catch (err) {
            console.error('Error reordering cities:', err)
        }
    }

    const handleCityDateChange = async (cityId, field, value) => {
        try {
            const res = await api.patch(`/trips/cities/${cityId}`, { [field]: value || null })
            setCities(prev => prev.map(c => c._id === cityId ? { ...c, [field]: res.data[field] } : c))
        } catch (err) {
            console.error('Error updating city date:', err)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes, expensesRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(`/trips/${id}/expenses`)
                ])
                setTrip(tripRes.data)
                setExpenses(expensesRes.data)
                const citiesWithColors = citiesRes.data.map((city, i) => ({
                    ...city,
                    color: city.color || CITY_COLORS[i % CITY_COLORS.length]
                }))
                setCities(citiesWithColors)
                const savedCityId = localStorage.getItem(`trip-active-city-${id}`)
                const preferredCityId = cityId || savedCityId
                const initialCity = citiesWithColors.find(c => c._id === preferredCityId) || citiesWithColors[0]
                if (initialCity) {
                    setActiveCity(initialCity._id)
                    localStorage.setItem(`trip-active-city-${id}`, initialCity._id)
                    if (preferredCityId !== initialCity._id) {
                        navigate(`/trips/${id}/${initialCity._id}`, { replace: true })
                    }
                }
            } catch (err) {
                console.error('Error fetching trip:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, cityId, navigate])

    const handleCityAdded = (newCity) => {
        const color = CITY_COLORS[cities.length % CITY_COLORS.length]
        const cityWithColor = { ...newCity, color }
        setCities(prev => [...prev, cityWithColor])
        setActiveCity(newCity._id)
        localStorage.setItem(`trip-active-city-${id}`, newCity._id)
        navigate(`/trips/${id}/${newCity._id}`, { replace: true })
    }

    const handleTitleSave = async () => {
        if (!titleValue.trim() || titleValue === trip.title) {
            setEditingTitle(false)
            return
        }
        setSavingTrip(true)
        try {
            const res = await api.patch(`/trips/${id}`, { title: titleValue })
            setTrip(res.data)
        } catch (err) {
            console.error('Error updating trip:', err)
        } finally {
            setSavingTrip(false)
            setEditingTitle(false)
        }
    }

    const handleDateChange = async (field, value) => {
        try {
            const res = await api.patch(`/trips/${id}`, { [field]: value || null })
            setTrip(res.data)
        } catch (err) {
            console.error('Error updating dates:', err)
        }
    }

    const activeCityData = cities.find(c => c._id === activeCity)

    useEffect(() => {
        if (!activeCity || !id) return
        localStorage.setItem(`trip-active-city-${id}`, activeCity)
    }, [activeCity, id])

    useEffect(() => {
        if (!activeCity || !id) return
        if (cityId !== activeCity) {
            navigate(`/trips/${id}/${activeCity}`, { replace: true })
        }
    }, [activeCity, cityId, id, navigate])

    if (loading) return <div className="loading">Loading...</div>
    if (!trip) return <div className="loading">Trip not found</div>

    return (
        <div className="trip-page">
            {/* HEADER */}
            <header className="trip-header">
                <button className="btn-back" style={{ height: "-webkit-fill-available" }} onClick={() => navigate('/dashboard')}>
                Back
                </button>
                <div className="trip-header-info">
                    {editingTitle ? (
                        <input
                            className="trip-title-input"
                            value={titleValue}
                            onChange={e => setTitleValue(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                            autoFocus
                        />
                    ) : (
                        <h1 
                            className="trip-title-editable"
                            onClick={() => { setTitleValue(trip.title); setEditingTitle(true) }}
                            title="Click to edit"
                        >
                            {trip.title} <span className="edit-hint">✎</span>
                        </h1>
                    )}
                    <div className="trip-dates-row">
                        <DatePicker
                            className="date-input date-input-sm"
                            selected={trip.startDate ? new Date(trip.startDate) : null}
                            onChange={date => handleDateChange('startDate', date)}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Start date"
                            selectsStart
                            startDate={trip.startDate ? new Date(trip.startDate) : null}
                            endDate={trip.endDate ? new Date(trip.endDate) : null}
                        />
                        <span className="dates-arrow">→</span>
                        <DatePicker
                            className="date-input date-input-sm"
                            selected={trip.endDate ? new Date(trip.endDate) : null}
                            onChange={date => handleDateChange('endDate', date)}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="End date"
                            selectsEnd
                            startDate={trip.startDate ? new Date(trip.startDate) : null}
                            endDate={trip.endDate ? new Date(trip.endDate) : null}
                            minDate={trip.startDate ? new Date(trip.startDate) : null}
                        />
                    </div>
                </div>
                <div className="trip-header-right">
                    <div className="trip-header-members">
                        {trip.members.map(m => (
                            <div
                                key={`${m.user?._id}-${m.color}`}
                                className="member-avatar"
                                style={{ 
                                    border: `2px solid ${m.color}`,
                                    boxShadow: `0 0 30px ${m.color}60`
                                }}
                                title={m.user.name || m.user.username}
                            >
                                {m.user.avatar && m.user.avatar !== 'images/default-avatar.png' ? (
                                    <img src={m.user.avatar} alt={m.user.username} />
                                ) : (
                                    <span style={{ backgroundColor: m.color }}>
                                        {m.user.name?.[0]?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* 3 BIG NAV CARDS */}
            <div className="trip-nav-cards">
                <div className="trip-nav-card" onClick={() => navigate(`/trips/${id}/${activeCity}/info`)}>
                    <span className="section-icon">📋</span>
                    <div>
                        <h3>Trip Info</h3>
                        <p>Informations, notes and in-depth expense tracking</p>
                    </div>
                </div>
                <div className="trip-nav-card" onClick={() => navigate(`/trips/${id}/${activeCity}/timeline`)}>
                    <span className="section-icon">📅</span>
                    <div>
                        <h3>Timeline</h3>
                        <p>Full trip schedule</p>
                    </div>
                </div>
                <div className="trip-nav-card" onClick={() => navigate(`/trips/${id}/${activeCity}/map`)}>
                    <span className="section-icon">🗺️</span>
                    <div>
                        <h3>Map</h3>
                        <p>All cities & attractions</p>
                    </div>
                </div>
                <div className="trip-nav-card" onClick={() => navigate(`/trips/${id}/${activeCity}/settings`)}>
                    <span className="section-icon">⚙️</span>
                    <div>
                        <h3>Trip Settings</h3>
                        <p>Members, description, settings</p>
                    </div>
                </div>
            </div>

            {/* CITY TABS */}
            <div className="city-tabs-wrapper">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={cities.map(c => c._id)} strategy={horizontalListSortingStrategy}>
                        <div className="city-tabs">
                            {cities.map(city => (
                                <SortableCityTab
                                    key={city._id}
                                    city={city}
                                    activeCity={activeCity}
                                    onClick={() => {
                                        setActiveCity(city._id)
                                        localStorage.setItem(`trip-active-city-${id}`, city._id)
                                        navigate(`/trips/${id}/${city._id}`, { replace: true })
                                    }}
                                />
                            ))}
                            <button className="city-tab add-city-tab" onClick={() => setShowAddCity(true)}>
                                + Add City
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
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
                        <div className="city-dates-edit">
                            <DatePicker
                                className="date-input date-input-sm"
                                selected={activeCityData.dateFrom ? new Date(activeCityData.dateFrom) : null}
                                onChange={date => handleCityDateChange(activeCityData._id, 'dateFrom', date)}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Arrival"
                                minDate={trip.startDate ? new Date(trip.startDate) : null}
                                maxDate={trip.endDate ? new Date(trip.endDate) : null}
                            />
                            <span className="dates-arrow">→</span>
                            <DatePicker
                                className="date-input date-input-sm"
                                selected={activeCityData.dateTo ? new Date(activeCityData.dateTo) : null}
                                onChange={date => handleCityDateChange(activeCityData._id, 'dateTo', date)}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Departure"
                                minDate={activeCityData.dateFrom ? new Date(activeCityData.dateFrom) : null}
                                maxDate={trip.endDate ? new Date(trip.endDate) : null}
                            />
                        </div>
                        <button
                            className="btn-danger"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => { setCityToDelete(activeCityData); setShowConfirmDeleteCity(true) }}
                        >
                            Delete City
                        </button>
                    </div>

                    {/* SECTION CARDS */}
                    <div className="section-cards-row">
                        {[
                            { label: 'Stays', icon: '🏨', path: 'stays', desc: 'Hotels & accommodation' },
                            { label: 'Transport', icon: '✈️', path: 'transport', desc: 'Flights, trains, buses' },
                            { label: 'Attractions', icon: '🗺️', path: 'attractions', desc: 'Things to see & do' },
                            { label: 'Misc', icon: '🍜', path: 'misc', desc: 'Food, shops & more' },
                        ].map(section => (
                            <div
                                key={section.path}
                                className="section-card-sm"
                                onClick={() => navigate(`/trips/${id}/${activeCity}/${section.path}`)}
                            >
                                <span className="section-icon-sm">{section.icon}</span>
                                <div>
                                    <h3>{section.label}</h3>
                                    <p>{section.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CITY EXPENSES */}
                    {expenses && expenses.perCity[activeCityData._id] && (
                        <div className="city-expenses">
                            <h3 className="expenses-label">City Expenses</h3>
                            <div className="expenses-table">
                                <div className="expenses-table-header">
                                    <span></span>
                                    <span>Total</span>
                                    <span>Your Share</span>
                                </div>
                                {[
                                    { key: 'stays', icon: '🏨', label: 'Stays' },
                                    { key: 'transport', icon: '✈️', label: 'Transport' },
                                    { key: 'attractions', icon: '🗺️', label: 'Attractions' },
                                    { key: 'misc', icon: '🍜', label: 'Misc' },
                                ].map(({ key, icon, label }) => {
                                    const total = expenses.total[key] || 0
                                    const myShare = expenses.perCityByCategory?.[key]?.[user?._id] || 0
                                    return (
                                        <div key={key} className="expenses-table-row">
                                            <span className="expenses-row-label">
                                                <span className="expense-icon">{icon}</span>
                                                {label}
                                            </span>
                                            <span className="expense-amount">€{total.toFixed(2)}</span>
                                            <span className="expense-amount your-share-amount">
                                                {total > 0 ? `€${myShare.toFixed(2)}` : '—'}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="expenses-table-row total">
                                    <span className="expenses-row-label">
                                    Total
                                    </span>
                                    <span className="expense-amount">
                                        €{(expenses.perCity[activeCityData._id].total || 0).toFixed(2)}
                                    </span>
                                    <span className="expense-amount your-share-amount">
                                        €{(expenses.perCity[activeCityData._id].perPerson?.[user?._id] || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRIP TOTAL */}
                    {expenses && (
                        <div className="city-expenses trip-total">
                            <h3 className="expenses-label">Trip Total</h3>
                            <div className="expenses-table">
                                <div className="expenses-table-header">
                                    <span></span>
                                    <span>Total</span>
                                    <span>Your Share</span>
                                </div>
                                {[
                                    { key: 'stays', icon: '🏨', label: 'Stays' },
                                    { key: 'transport', icon: '✈️', label: 'Transport' },
                                    { key: 'attractions', icon: '🗺️', label: 'Attractions' },
                                    { key: 'misc', icon: '🍜', label: 'Misc' },
                                ].map(({ key, icon, label }) => {
                                    const total = expenses.total[key] || 0
                                    const myShare = Object.values(expenses.perCity).reduce((sum, city) => {
                                        return sum + (city.perPerson?.[user?._id] || 0)
                                    }, 0)
                                    return (
                                        <div key={key} className="expenses-table-row">
                                            <span className="expenses-row-label">
                                                <span className="expense-icon">{icon}</span>
                                                {label}
                                            </span>
                                            <span className="expense-amount">€{total.toFixed(2)}</span>
                                            <span className="expense-amount your-share-amount">
                                                {total > 0 ? `€${myShare.toFixed(2)}` : '—'}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="expenses-table-row total">
                                    <span className="expenses-row-label">
                                    Grand Total
                                    </span>
                                    <span className="expense-amount">€{(expenses.total.grand || 0).toFixed(2)}</span>
                                    <span className="expense-amount your-share-amount">
                                        €{Object.values(expenses.perCity).reduce((sum, city) =>
                                            sum + (city.perPerson?.[user?._id] || 0), 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* MODALS */}
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
                    message={`This will permanently delete "${trip.title}" and all data. Type DELETE to confirm.`}
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
                    message={`Remove "${cityToDelete?.name}" from the trip? Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => { setShowConfirmDeleteCity(false); setCityToDelete(null); setDeleteError(null) }}
                    onConfirm={async () => {
                        try {
                            setDeleting(true)
                            setDeleteError(null)
                            const cityId = cityToDelete?._id || cityToDelete
                            await api.delete(`/trips/cities/${cityId}`)
                            setCities(prev => {
                                const updated = prev.filter(c => c._id !== cityId)
                                if (activeCity === cityId) setActiveCity(updated[0]?._id || null)
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