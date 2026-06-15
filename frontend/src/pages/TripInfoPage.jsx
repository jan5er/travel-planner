import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line,
} from 'recharts'


const CATEGORY_COLORS = {
    stays: '#4f8ef7',
    transport: '#f5a524',
    attractions: '#4fcc8e',
    misc: '#f74f7a'
}

const CATEGORY_LABELS = {
    stays: 'Stays',
    transport: 'Transport',
    attractions: 'Attractions',
    misc: 'Misc'
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="chart-tooltip">
            {label && <p className="chart-tooltip-label">{label}</p>}
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color || entry.fill }}>
                    {entry.name}: €{parseFloat(entry.value).toFixed(2)}
                </p>
            ))}
        </div>
    )
}

const TripInfoPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [trip, setTrip] = useState(null)
    const [expenses, setExpenses] = useState(null)
    const [miscByDate, setMiscByDate] = useState(null)
    const [loading, setLoading] = useState(true)
    const [addingNote, setAddingNote] = useState(false)
    const [newNoteTitle, setNewNoteTitle] = useState('')
    const [editingNote, setEditingNote] = useState(null)
    const [editContent, setEditContent] = useState('')
    const [editTitle, setEditTitle] = useState('')
    const [cityFilter, setCityFilter] = useState('all')
    const [activeCategory, setActiveCategory] = useState(null)
    const [pieView, setPieView] = useState('total')
    const [barView, setBarView] = useState('stacked')
    const [selectedPerson, setSelectedPerson] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tripRes, expensesRes, miscDateRes] = await Promise.all([
                    api.get(`/trips/${id}`),
                    api.get(`/trips/${id}/expenses`),
                    api.get(`/trips/${id}/misc-by-date`)
                ])
                setTrip(tripRes.data)
                setExpenses(expensesRes.data)
                setMiscByDate(miscDateRes.data)
            } catch (err) {
                console.error('Error fetching trip info:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
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
            await api.patch(`/trips/${id}/notes/${noteId}`, { title: editTitle, content: editContent })
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

    // PREPARE CHART DATA
    const pieData = expenses ? Object.entries(CATEGORY_LABELS).map(([key, label]) => {
        const cityExp = cityFilter === 'all' ? expenses.total : expenses.perCity[cityFilter]
        const totalVal = cityExp?.[key] || 0
        const myVal = cityFilter === 'all'
            ? expenses.perCategoryPerPerson?.[key]?.[user?._id] || 0
            : expenses.perCity[cityFilter]?.perPersonByCategory?.[key]?.[user?._id] || 0
        return {
            name: label,
            key,
            value: pieView === 'mine' ? myVal : totalVal,
            color: CATEGORY_COLORS[key]
        }
    }).filter(d => d.value > 0) : []

    const barData = expenses ? Object.entries(expenses.perCity).map(([cityId, cityExp]) => {
        if (selectedPerson) {
            return {
                name: cityExp.name,
                Stays: cityExp.perPersonByCategory?.stays?.[selectedPerson] || 0,
                Transport: cityExp.perPersonByCategory?.transport?.[selectedPerson] || 0,
                Attractions: cityExp.perPersonByCategory?.attractions?.[selectedPerson] || 0,
                Misc: cityExp.perPersonByCategory?.misc?.[selectedPerson] || 0,
            }
        }
        return {
            name: cityExp.name,
            Stays: cityExp.stays || 0,
            Transport: cityExp.transport || 0,
            Attractions: cityExp.attractions || 0,
            Misc: cityExp.misc || 0,
        }
    }) : []

    const lineData = miscByDate ? Object.entries(miscByDate).map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        amount
    })) : []

    const peopleData = expenses ? [
        ...(expenses.members || []),
        ...(expenses.guests || [])
    ].map(person => {
        const amount = cityFilter === 'all'
            ? Object.values(expenses.perCity).reduce((sum, city) =>
                sum + (city.perPerson?.[person._id?.toString()] || 0), 0)
            : expenses.perCity[cityFilter]?.perPerson?.[person._id?.toString()] || 0
        return { ...person, amount }
    }).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount) : []

    const backCityId = localStorage.getItem(`trip-active-city-${id}`)

    if (loading) return <div className="loading">Loading...</div>
    if (!trip) return <div className="loading">Trip not found</div>

    return (
        <div className="info-page">
            <header className="trip-header">
                <button className="btn-back" style={{ height: "-webkit-fill-available" }} onClick={() => navigate(backCityId ? `/trips/${id}/${backCityId}` : `/trips/${id}`)}>
                Back
                </button>
                <div className="trip-header-info">
                    <h1>{trip.title}</h1>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Trip Info</span>
                </div>
            </header>

            <div className="info-content">

                {/* EXPENSE GRAPHS */}
                {expenses && expenses.total.grand > 0 ? (
                    <section className="info-section">
                        <div className="info-section-header">
                            <h2>Expenses</h2>
                            <div className="chart-filters">
                                <select
                                    className="select-input"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                                    value={cityFilter}
                                    onChange={e => setCityFilter(e.target.value)}
                                >
                                    <option value="all">All Cities</option>
                                    {Object.entries(expenses.perCity).map(([cid, city]) => (
                                        <option key={cid} value={cid}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* SUMMARY CARDS */}
                        <div className="expense-summary-cards">
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                                const amount = cityFilter === 'all'
                                    ? expenses.total[key] || 0
                                    : expenses.perCity[cityFilter]?.[key] || 0
                                const myShare = cityFilter === 'all'
                                    ? expenses.perCategoryPerPerson?.[key]?.[user?._id] || 0
                                    : expenses.perCity[cityFilter]?.perPersonByCategory?.[key]?.[user?._id] || 0
                                return (
                                    <div
                                        key={key}
                                        className={`expense-summary-card ${activeCategory === key ? 'active' : ''}`}
                                        style={activeCategory === key ? { borderColor: CATEGORY_COLORS[key], boxShadow: `0 0 16px ${CATEGORY_COLORS[key]}30` } : {}}
                                        onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                                    >
                                        <div className="expense-summary-icon" style={{ backgroundColor: `${CATEGORY_COLORS[key]}20`, color: CATEGORY_COLORS[key] }}>
                                            {key === 'stays' ? '🏨' : key === 'transport' ? '✈️' : key === 'attractions' ? '🗺️' : '🍜'}
                                        </div>
                                        <div className="expense-summary-info">
                                            <span className="expense-summary-label">{label}</span>
                                            <span className="expense-summary-total">€{amount.toFixed(2)}</span>
                                            {myShare > 0 && <span className="expense-summary-share">Your share: €{myShare.toFixed(2)}</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="charts-grid">
                            {/* PIE CHART */}
                            <div className="chart-card">
                                <div className="chart-card-header">
                                    <h3 className="chart-title">Breakdown</h3>
                                    <div className="chart-toggle">
                                        <button
                                            className={`chart-toggle-btn ${pieView === 'total' ? 'active' : ''}`}
                                            onClick={() => setPieView('total')}
                                        >Total</button>
                                        <button
                                            className={`chart-toggle-btn ${pieView === 'mine' ? 'active' : ''}`}
                                            onClick={() => setPieView('mine')}
                                        >Mine</button>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.color}
                                                    opacity={activeCategory && activeCategory !== entry.key ? 0.3 : 1}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <p className="chart-total">
                                    Total: €{pieView === 'total'
                                        ? (cityFilter === 'all' ? expenses.total.grand : expenses.perCity[cityFilter]?.total || 0).toFixed(2)
                                        : pieData.reduce((s, d) => s + d.value, 0).toFixed(2)
                                    }
                                </p>
                            </div>

                            {/* PER PERSON */}
                            <div className="chart-card">
                                <h3 className="chart-title">Per Person</h3>
                                <div className="people-bars">
                                    {peopleData.map(person => (
                                        <div key={person.name} className="people-bar-row">
                                            <div className="people-bar-label">
                                                <div className="people-bar-avatar">
                                                    {person.avatar && person.avatar !== 'images/default-avatar.png' ? (
                                                        <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                    ) : (
                                                        <span style={{ backgroundColor: person.color, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white', fontWeight: 700 }}>
                                                            {person.name?.[0]?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</span>
                                            </div>
                                            <div className="people-bar-track">
                                                <div
                                                    className="people-bar-fill"
                                                    style={{
                                                        width: `${peopleData[0].amount > 0 ? (person.amount / peopleData[0].amount) * 100 : 0}%`,
                                                        backgroundColor: person.color
                                                    }}
                                                />
                                            </div>
                                            <span className="people-bar-amount">€{person.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* BAR CHART */}
                        {cityFilter === 'all' && barData.length > 1 && (
                            <div className="chart-card" style={{ marginTop: 16 }}>
                                <div className="chart-card-header">
                                    <h3 className="chart-title">By City</h3>
                                    <div className="barchart-toggle">
                                            <button className={`chart-toggle-btn ${barView === 'stacked' ? 'active' : ''}`} onClick={() => setBarView('stacked')}>Stacked</button>
                                            <button className={`chart-toggle-btn ${barView === 'grouped' ? 'active' : ''}`} onClick={() => setBarView('grouped')}>Grouped</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                            className="select-input"
                                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                            value={selectedPerson || ''}
                                            onChange={e => setSelectedPerson(e.target.value || null)}
                                        >
                                            <option value="">Everyone</option>
                                            {[...(expenses.members || []), ...(expenses.guests || [])].map(p => (
                                                <option key={p._id} value={p._id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={v => `€${v}`} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent-glow)' }} />
                                        <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>} />
                                        {Object.entries(CATEGORY_LABELS).map(([key, label], i, arr) => (
                                            <Bar
                                                key={key}
                                                dataKey={label}
                                                stackId={barView === 'stacked' ? 'a' : undefined}
                                                fill={CATEGORY_COLORS[key]}
                                                opacity={activeCategory && activeCategory !== key ? 0.3 : 1}
                                                radius={barView === 'stacked' && i === arr.length - 1 ? [4, 4, 0, 0] : barView === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* LINE CHART */}
                        {lineData.length > 1 && (
                            <div className="chart-card" style={{ marginTop: 16 }}>
                                <h3 className="chart-title">Daily Spending</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            name="Spent"
                                            stroke="var(--accent)"
                                            strokeWidth={2}
                                            dot={{ fill: 'var(--accent)', r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="info-section">
                        <h2>Expenses</h2>
                        <div className="expenses-placeholder">
                            <p>Expense tracking will appear here once you start adding stays, transport and activities.</p>
                        </div>
                    </section>
                )}

                {/* NOTES */}
                <section className="info-section">
                    <div className="info-section-header">
                        <h2>Notes</h2>
                        <button className="btn-primary" onClick={() => setAddingNote(true)}>
                            + Add Section
                        </button>
                    </div>

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
                            <button className="btn-primary" type="submit">Create</button>
                            <button className="btn-secondary" type="button" onClick={() => { setAddingNote(false); setNewNoteTitle('') }}>
                                Cancel
                            </button>
                        </form>
                    )}

                    {(!trip.notes || trip.notes.length === 0) && !addingNote ? (
                        <div className="empty-state" style={{ padding: '40px 20px' }}>
                            <p>No notes yet — add sections like "Lingo", "Emergency Contacts", "App Downloads"...</p>
                            <button className="btn-primary" onClick={() => setAddingNote(true)}>+ Add Section</button>
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
                                                <button className="btn-secondary" onClick={() => setEditingNote(null)}>Cancel</button>
                                                <button className="btn-primary" onClick={() => handleSaveNote(note._id)}>Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="note-display">
                                            <div className="note-header">
                                                <h3>{note.title}</h3>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn-icon" onClick={() => startEditing(note)} title="Edit">✎</button>
                                                    <button className="btn-icon danger" onClick={() => handleDeleteNote(note._id)} title="Delete">🗑</button>
                                                </div>
                                            </div>
                                            {note.content ? (
                                                <p className="note-content">{note.content}</p>
                                            ) : (
                                                <p className="note-empty" onClick={() => startEditing(note)}>Click to add content...</p>
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