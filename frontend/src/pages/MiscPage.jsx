import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import AddMiscModal from '../components/AddMiscModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const CATEGORY_ICONS = {
    food: '🍜',
    drinks: '🍺',
    shopping: '🛍️',
    'city transport': '🚇',
    activity: '🎭',
    other: '📌'
}

const MiscPage = () => {
    const { id, cityId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [trip, setTrip] = useState(null)
    const [city, setCity] = useState(null)
    const [miscs, setMiscs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [miscToEdit, setMiscToEdit] = useState(null)
    const [miscToDelete, setMiscToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, citiesRes, miscRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/cities`),
                    api.get(`/misc/${cityId}`)
                ])
                setTrip(tripRes.data)
                setCity(citiesRes.data.find(c => c._id === cityId))
                setMiscs(miscRes.data)
            } catch (err) {
                console.error('Error fetching misc:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, cityId])

    const handleDelete = async () => {
        try {
            setDeleting(true)
            await api.delete(`/misc/${miscToDelete._id}`)
            setMiscs(prev => prev.filter(m => m._id !== miscToDelete._id))
            setMiscToDelete(null)
        } catch (err) {
            console.error('Error deleting misc:', err)
        } finally {
            setDeleting(false)
        }
    }

    const getMemberColor = (userId) => {
        const uid = userId?._id || userId
        const member = trip?.members.find(m => m.user._id?.toString() === uid?.toString())
        return member?.color || 'var(--accent)'
    }

    const totalCost = miscs.reduce((sum, m) => sum + (m.cost || 0), 0)
    const myTotal = miscs.reduce((sum, m) => {
        const isSplit = m.splitWith?.some(u => (u._id || u)?.toString() === user?._id?.toString())
        if (!isSplit) return sum
        return sum + (m.cost || 0) / (m.splitWith?.length || 1)
    }, 0)

    const backCityId = cityId || localStorage.getItem(`trip-active-city-${id}`)

    const grouped = miscs.reduce((acc, m) => {
        const key = m.category || 'other'
        if (!acc[key]) acc[key] = []
        acc[key].push(m)
        return acc
    }, {})

    if (loading) return <div className="loading">Loading...</div>

    const renderMiscCard = (misc) => {
        const color = getMemberColor(misc.addedBy?._id || misc.addedBy)
        const pp = misc.cost && misc.splitWith?.length
            ? (misc.cost / misc.splitWith.length).toFixed(2)
            : null

        return (
            <div key={misc._id} className="stay-card">
                <div className="stay-card-content">
                    <div className="stay-card-top">
                        <div className="stay-card-main">
                            <div className="stay-card-header">
                                <span className="attraction-category-icon">
                                    {CATEGORY_ICONS[misc.category] || '📌'}
                                </span>
                                <span className="stay-name">{misc.name}</span>
                            </div>
                            {misc.description && <p className="stay-notes">{misc.description}</p>}
                            {misc.date && (
                                <span className="stay-dates">
                                    {new Date(misc.date).toLocaleDateString('en-GB')}
                                </span>
                            )}
                            {misc.splitWith?.length > 0 && (
                                <div className="stay-split">
                                    <span className="split-label">Split:</span>
                                    <div className="split-avatars">
                                        {misc.splitWith.map(member => {
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

                        {misc.cost > 0 && (
                            <div className="stay-cost-block">
                                <span className="stay-total">€{misc.cost.toFixed(2)}</span>
                                {pp && <span className="stay-per-person">€{pp}<span className="pp-label">/person</span></span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="stay-card-actions">
                    <div
                        className="member-avatar"
                        style={{ width: 42, height: 42, border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}60` }}
                        title={`Added by ${misc.addedBy?.name || misc.addedBy?.username}`}
                    >
                        {misc.addedBy?.avatar && misc.addedBy.avatar !== 'images/default-avatar.png' ? (
                            <img src={misc.addedBy.avatar} alt="" />
                        ) : (
                            <span style={{ backgroundColor: color }}>{misc.addedBy?.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: '5%' }}>
                        <button className="btn-icon" onClick={() => setMiscToEdit(misc)} title="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => setMiscToDelete(misc)} title="Delete">🗑</button>
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
                    <h1>Misc Expenses</h1>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {city?.name}{city?.country && `, ${city.country}`}
                    </span>
                </div>
                <button className="btn-primary" style={{ alignSelf: 'center' }} onClick={() => setShowAddModal(true)}>+ Add Expense</button>
            </header>

            <div className="stays-section-content">
                {/* SUMMARY */}
                {miscs.length > 0 && (
                    <div className="misc-summary">
                        <div className="misc-summary-item">
                            <span className="misc-summary-label">Total Spent</span>
                            <span className="misc-summary-amount">€{totalCost.toFixed(2)}</span>
                        </div>
                        <div className="misc-summary-item">
                            <span className="misc-summary-label">Your Share</span>
                            <span className="misc-summary-amount your-share-amount">€{myTotal.toFixed(2)}</span>
                        </div>
                        <div className="misc-summary-item">
                            <span className="misc-summary-label">Entries</span>
                            <span className="misc-summary-amount">{miscs.length}</span>
                        </div>
                    </div>
                )}

                {miscs.length === 0 ? (
                    <div className="empty-state">
                        <p>No expenses yet — start tracking!</p>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Expense</button>
                    </div>
                ) : (
                    Object.entries(grouped).map(([category, items]) => (
                        <div key={category} className="stays-group">
                            <h2 className="stays-group-label">
                                {CATEGORY_ICONS[category]} {category.charAt(0).toUpperCase() + category.slice(1)}
                                <span className="group-total">
                                    €{items.reduce((s, m) => s + (m.cost || 0), 0).toFixed(2)}
                                </span>
                            </h2>
                            {items.map(renderMiscCard)}
                        </div>
                    ))
                )}
            </div>

            {(showAddModal || miscToEdit) && trip && (
                <AddMiscModal
                    tripId={id}
                    cityId={cityId}
                    members={trip.members}
                    tripStartDate={trip.startDate}
                    tripEndDate={trip.endDate}
                    initialData={miscToEdit}
                    onClose={() => { setShowAddModal(false); setMiscToEdit(null) }}
                    onAdded={misc => {
                        if (miscToEdit) {
                            setMiscs(prev => prev.map(m => m._id === misc._id ? misc : m))
                        } else {
                            setMiscs(prev => [misc, ...prev])
                        }
                        setMiscToEdit(null)
                    }}
                    guests={trip.guests || []}
                />
            )}

            {miscToDelete && (
                <ConfirmDeleteModal
                    title="Delete Expense"
                    message={`Remove "${miscToDelete.name}"? Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => setMiscToDelete(null)}
                    onConfirm={handleDelete}
                    loading={deleting}
                />
            )}
        </div>
    )
}

export default MiscPage