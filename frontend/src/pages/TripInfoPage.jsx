import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const TripInfoPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [trip, setTrip] = useState(null)
    const [loading, setLoading] = useState(true)
    const [addingNote, setAddingNote] = useState(false)
    const [newNoteTitle, setNewNoteTitle] = useState('')
    const [editingNote, setEditingNote] = useState(null)
    const [editContent, setEditContent] = useState('')
    const [editTitle, setEditTitle] = useState('')

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const res = await api.get(`/trips/${id}`)
                setTrip(res.data)
            } catch (err) {
                console.error('Error fetching trip:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTrip()
    }, [id])

    const handleAddNote = async (e) => {
        e.preventDefault()
        if (!newNoteTitle.trim()) return
        try {
            const res = await api.post(`/trips/${id}/notes`, { title: newNoteTitle, content: '' })
            setTrip(prev => ({ ...prev, notes: [...(prev.notes || []), res.data] }))
            setNewNoteTitle('')
            setAddingNote(false)
            setEditingNote(res.data._id)
            setEditContent('')
            setEditTitle(res.data.title)
        } catch (err) {
            console.error('Error adding note:', err)
        }
    }

    const handleSaveNote = async (noteId) => {
        try {
            const res = await api.patch(`/trips/${id}/notes/${noteId}`, {
                title: editTitle,
                content: editContent
            })
            setTrip(prev => ({
                ...prev,
                notes: prev.notes.map(n => n._id === noteId ? { ...n, title: editTitle, content: editContent } : n)
            }))
            setEditingNote(null)
        } catch (err) {
            console.error('Error saving note:', err)
        }
    }

    const handleDeleteNote = async (noteId) => {
        try {
            await api.delete(`/trips/${id}/notes/${noteId}`)
            setTrip(prev => ({ ...prev, notes: prev.notes.filter(n => n._id !== noteId) }))
        } catch (err) {
            console.error('Error deleting note:', err)
        }
    }

    const startEditing = (note) => {
        setEditingNote(note._id)
        setEditTitle(note.title)
        setEditContent(note.content || '')
    }

    if (loading) return <div className="loading">Loading...</div>
    if (!trip) return <div className="loading">Trip not found</div>

    return (
        <div className="info-page">
            <header className="trip-header">
                <button className="btn-back" onClick={() => navigate(`/trips/${id}`)}>
                Back
                </button>
                <div className="trip-header-info" style={{ "justify-items": "end" }}>
                    <h1>{trip.title} Info</h1>
                </div>
            </header>

            <div className="info-content">

                {/* EXPENSE SUMMARY PLACEHOLDER */}
                <section className="info-section">
                    <h2>Expenses</h2>
                    <div className="expenses-placeholder">
                        <p>Expense tracking will appear here once you start adding stays, transport and activities.</p>
                    </div>
                </section>

                {/* NOTES */}
                <section className="info-section">
                    <div className="info-section-header">
                        <h2>Notes</h2>
                        <button className="btn-primary" onClick={() => setAddingNote(true)}>
                            + Add Section
                        </button>
                    </div>

                    {/* ADD NOTE FORM */}
                    {addingNote && (
                        <form className="add-note-form" onSubmit={handleAddNote}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <input
                                    type="text"
                                    value={newNoteTitle}
                                    onChange={e => setNewNoteTitle(e.target.value)}
                                    placeholder="Section title (e.g. Lingo, Emergency Contacts...)"
                                    autoFocus
                                />
                            </div>
                            <button className="btn-confirm">Create</button>
                            <button className="btn-secondary" type="button" onClick={() => { setAddingNote(false); setNewNoteTitle('') }}>
                                Cancel
                            </button>
                        </form>
                    )}

                    {/* NOTES LIST */}
                    {(!trip.notes || trip.notes.length === 0) && !addingNote ? (
                        <div className="empty-state" style={{ padding: '40px 20px' }}>
                            <p>No notes yet — add sections like "Lingo", "Emergency Contacts", "App Downloads"...</p>
                            <button className="btn-primary" onClick={() => setAddingNote(true)}>
                                + Add Section
                            </button>
                        </div>
                    ) : (
                        <div className="notes-list">
                            {(trip.notes || []).map(note => (
                                <div key={note._id} className="note-card">
                                    {editingNote === note._id ? (
                                        <div className="note-editing">
                                            <input
                                                className="note-title-input"
                                                value={editTitle}
                                                onChange={e => setEditTitle(e.target.value)}
                                                placeholder="Section title"
                                            />
                                            <textarea
                                                value={editContent}
                                                onChange={e => setEditContent(e.target.value)}
                                                placeholder="Write anything — tips, contacts, phrases, links..."
                                                rows={6}
                                            />
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn-secondary" onClick={() => setEditingNote(null)}>
                                                    Cancel
                                                </button>
                                                <button className="btn-confirm" onClick={() => handleSaveNote(note._id)}>
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="note-display">
                                            <div className="note-header">
                                                <h3>{note.title}</h3>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn-icon" onClick={() => startEditing(note)} title="Edit">
                                                        ✎
                                                    </button>
                                                    <button className="btn-icon danger" onClick={() => handleDeleteNote(note._id)} title="Delete">
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                            {note.content ? (
                                                <p className="note-content">{note.content}</p>
                                            ) : (
                                                <p className="note-empty" onClick={() => startEditing(note)}>
                                                    Click to add content...
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default TripInfoPage