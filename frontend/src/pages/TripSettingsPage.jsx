import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const MEMBER_COLORS = [
    '#4f8ef7',
    '#f7774f', 
    '#4fcc8e',
    '#cc4fcc',
    '#f7d14f',
    '#4fccc4',
    '#f74f7a',
    '#a0f74f',
    '#4f7af7',
    '#ee3838ff',
]

const TripInfoPage = () => {
    const { id, cityId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [trip, setTrip] = useState(null)
    const [loading, setLoading] = useState(true)
    const [description, setDescription] = useState('')
    const [coverImage, setCoverImage] = useState('')
    const [savingDetails, setSavingDetails] = useState(false)
    const [addMemberInput, setAddMemberInput] = useState('')
    const [addMemberError, setAddMemberError] = useState('')
    const [addingMember, setAddingMember] = useState(false)
    const [inviteCode, setInviteCode] = useState('')
    const [generatingInvite, setGeneratingInvite] = useState(false)
    const [showDeleteTrip, setShowDeleteTrip] = useState(false)
    const [showLeaveTrip, setShowLeaveTrip] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)
    const [guestInput, setGuestInput] = useState('')
    const [addingGuest, setAddingGuest] = useState(false)

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const res = await api.get(`/trips/${id}`)
                setTrip(res.data)
                setDescription(res.data.description || '')
                setCoverImage(res.data.coverImage || '')
            } catch (err) {
                console.error('Error fetching trip:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTrip()
    }, [id])

    const handleSaveDetails = async () => {
        setSavingDetails(true)
        try {
            const res = await api.patch(`/trips/${id}`, { description, coverImage })
            setTrip(res.data)
        } catch (err) {
            console.error('Error saving details:', err)
        } finally {
            setSavingDetails(false)
        }
    }

    const handleAddMember = async (e) => {
        e.preventDefault()
        setAddMemberError('')
        setAddingMember(true)
        try {
            const res = await api.post(`/trips/${id}/members`, { usernameOrEmail: addMemberInput })
            setTrip(res.data)
            setAddMemberInput('')
        } catch (err) {
            setAddMemberError(err.response?.data?.message || 'Failed to add member')
        } finally {
            setAddingMember(false)
        }
    }

    const handleRemoveMember = async (userId) => {
        try {
            const res = await api.delete(`/trips/${id}/members/${userId}`)
            setTrip(res.data)
        } catch (err) {
            console.error('Error removing member:', err)
        }
    }

    const handleGenerateInvite = async () => {
        setGeneratingInvite(true)
        try {
            const res = await api.post(`/trips/${id}/invite`)
            setInviteCode(res.data.inviteCode)
        } catch (err) {
            console.error('Error generating invite:', err)
        } finally {
            setGeneratingInvite(false)
        }
    }

    const handleColorChange = async (userId, color) => {
        try {
            const res = await api.patch(`/trips/${id}/members/${userId}/color`, { color })
            setTrip(res.data)
        } catch (err) {
            console.error('Error updating color:', err)
        }
    }

    const handleAddGuest = async (e) => {
        e.preventDefault()
        setAddingGuest(true)
        try {
            const res = await api.post(`/trips/${id}/guests`, { name: guestInput })
            setTrip(res.data)
            setGuestInput('')
        } catch (err) {
            console.error('Error adding guest:', err)
        } finally {
            setAddingGuest(false)
        }
    }

    const handleRemoveGuest = async (guestId) => {
        try {
            const res = await api.delete(`/trips/${id}/guests/${guestId}`)
            setTrip(res.data)
        } catch (err) {
            console.error('Error removing guest:', err)
        }
    }

    if (loading) return <div className="loading">Loading...</div>
    if (!trip) return <div className="loading">Trip not found</div>

    const isMe = (userId) => userId === user?._id
    const backCityId = cityId || localStorage.getItem(`trip-active-city-${id}`)

    return (
        <div className="info-page">
            <header className="trip-header">
                <button className="btn-back" onClick={() => navigate(backCityId ? `/trips/${id}/${backCityId}` : `/trips/${id}`)}>
                Back
                </button>
                <div className="trip-header-info" style={{"justify-items": "end"}}>
                    <h1>{trip.title} Settings</h1>
                </div>
            </header>

            <div className="info-content">

                {/* MEMBERS */}
                <section className="info-section">
                    <h2>Members</h2>
                    <div className="members-list">
                        {trip.members.map(m => (
                            <div key={m.user._id} className="member-row">
                                <div
                                    className="member-avatar"
                                    style={{ border: `2px solid ${m.color}`, boxShadow: `0 0 8px ${m.color}60` }}
                                >
                                    {m.user.avatar && m.user.avatar !== 'images/default-avatar.png' ? (
                                        <img src={m.user.avatar} alt={m.user.username} />
                                    ) : (
                                        <span style={{ backgroundColor: m.color }}>
                                            {m.user.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="member-info">
                                    <span className="member-name">
                                        {m.user.name || m.user.username}
                                        {isMe(m.user._id) && <span className="you-badge">you</span>}
                                    </span>
                                    <span className="member-username">@{m.user.username}</span>
                                </div>

                                {/* COLOR PICKER - only for own row */}
                                {isMe(m.user._id) && (
                                    <div className="color-picker">
                                        {MEMBER_COLORS.map(color => (
                                            <button
                                                key={color}
                                                className={`color-dot ${m.color === color ? 'selected' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => handleColorChange(m.user._id, color)}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* REMOVE - not for yourself */}
                                {!isMe(m.user._id) && (
                                    <button
                                        className="btn-icon danger"
                                        title="Remove member"
                                        onClick={() => handleRemoveMember(m.user._id)}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ADD MEMBER */}
                    <form className="add-member-form" onSubmit={handleAddMember}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                type="text"
                                value={addMemberInput}
                                onChange={e => setAddMemberInput(e.target.value)}
                                placeholder="Add by username or email"
                            />
                        </div>
                        <button className="btn-primary" type="submit" disabled={addingMember || !addMemberInput}>
                            {addingMember ? 'Adding...' : 'Add'}
                        </button>
                    </form>
                    {addMemberError && <div className="auth-error" style={{ marginTop: 8 }}>{addMemberError}</div>}

                    {/* INVITE LINK */}
                    <div className="invite-section">
                        <button className="btn-secondary" onClick={handleGenerateInvite} disabled={generatingInvite}>
                            {generatingInvite ? 'Generating...' : 'Generate Invite Link'}
                        </button>
                        {inviteCode && (
                            <div className="invite-link-box">
                                <code>{`${window.location.origin}/join/${inviteCode}`}</code>
                                <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${inviteCode}`)}>
                                    Copy
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* GUESTS */}
                <section className="info-section">
                    <h2>Guests</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                        Add people who don't have an account so you can still split expenses with them.
                    </p>
                    {trip.guests?.length > 0 && (
                        <div className="members-list" style={{ marginBottom: 16 }}>
                            {trip.guests.map(g => (
                                <div key={g._id} className="member-row">
                                    <div
                                        className="member-avatar"
                                        style={{ border: `2px solid ${g.color}`, boxShadow: `0 0 8px ${g.color}60` }}
                                    >
                                        <span style={{ backgroundColor: g.color }}>
                                            {g.name?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">
                                            {g.name}
                                            <span className="you-badge" style={{ background: 'rgba(247,215,79,0.15)', color: '#f7d14f', borderColor: 'rgba(247,215,79,0.3)' }}>guest</span>
                                        </span>
                                    </div>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleRemoveGuest(g._id)}
                                        title="Remove guest"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form className="add-member-form" onSubmit={handleAddGuest}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                type="text"
                                value={guestInput}
                                onChange={e => setGuestInput(e.target.value)}
                                placeholder="Guest name (e.g. John)"
                            />
                        </div>
                        <button className="btn-primary" type="submit" disabled={addingGuest || !guestInput}>
                            {addingGuest ? 'Adding...' : 'Add Guest'}
                        </button>
                    </form>
                </section>

                {/* TRIP DETAILS */}
                <section className="info-section">
                    <h2>Trip Details</h2>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="A short description about the trip"
                            rows={3}
                        />
                    </div>
                    <div className="form-group">
                        <label>Cover Image URL <span className="optional">(optional)</span></label>
                        <input
                            type="text"
                            value={coverImage}
                            onChange={e => setCoverImage(e.target.value)}
                            placeholder="https://..."
                        />
                        {coverImage && (
                            <img
                                src={coverImage}
                                alt="cover preview"
                                className="cover-preview"
                            />
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={handleSaveDetails} disabled={savingDetails}>
                            {savingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                    </div>
                </section>

                {/* DANGER ZONE */}
                <section className="info-section danger-zone">
                    <div className="danger-actions">
                        <div className="danger-action">
                            <div>
                                <h4>Leave Trip</h4>
                                <p>You will lose access to this trip</p>
                            </div>
                            <button className="btn-danger" onClick={() => setShowLeaveTrip(true)}>
                                Leave Trip
                            </button>
                        </div>
                        <div className="danger-action">
                            <div>
                                <h4>Delete Trip</h4>
                                <p>Permanently delete this trip and all data</p>
                            </div>
                            <button className="btn-danger" onClick={() => setShowDeleteTrip(true)}>
                                Delete Trip
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {showDeleteTrip && (
                <ConfirmDeleteModal
                    title="Delete Trip"
                    message={`Permanently delete "${trip.title}" and all its data. Type DELETE to confirm.`}
                    confirmPhrase="DELETE"
                    onCancel={() => { setShowDeleteTrip(false); setDeleteError(null) }}
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

            {showLeaveTrip && (
                <ConfirmDeleteModal
                    title="Leave Trip"
                    message={`You will lose access to "${trip.title}". Type LEAVE to confirm.`}
                    confirmPhrase="LEAVE"
                    onCancel={() => { setShowLeaveTrip(false); setDeleteError(null) }}
                    onConfirm={async () => {
                        try {
                            setDeleting(true)
                            setDeleteError(null)
                            await api.delete(`/trips/${id}/members/${user._id}`)
                            navigate('/dashboard')
                        } catch (err) {
                            setDeleteError(err.response?.data?.message || 'Failed to leave trip')
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

export default TripInfoPage