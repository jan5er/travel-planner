import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const ProfilePage = () => {
    const { user, updateUser } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({ username: '', name: '', avatar: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pwdLoading, setPwdLoading] = useState(false)
    const [error, setError] = useState('')
    const [pwdError, setPwdError] = useState('')
    const [pwdSuccess, setPwdSuccess] = useState('')
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get('/users/me')
                setForm({ username: res.data.username || '', name: res.data.name || '', avatar: res.data.avatar || '' })
            } catch (err) {
                console.error('Failed to load profile', err)
                setError('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }
        fetchMe()
    }, [])

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await api.patch('/users/me', form);

            updateUser(res.data);
            setForm({
                username: res.data.username || form.username,
                name: res.data.name || '',
                avatar: res.data.avatar || ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setPwdError('')
        setPwdSuccess('')
        if (pwdForm.newPassword !== pwdForm.confirmNewPassword) {
            setPwdError('New passwords do not match')
            return
        }
        setPwdLoading(true)
        try {
            await api.post('/users/change-password', {
                currentPassword: pwdForm.currentPassword,
                newPassword: pwdForm.newPassword
            })
            setPwdSuccess('Password updated')
            setPwdForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
        } catch (err) {
            setPwdError(err.response?.data?.message || 'Failed to change password')
        } finally {
            setPwdLoading(false)
        }
    }

    if (loading) return <div className="loading">Loading...</div>

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2>Profile</h2>
                    <div>
                        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back</button>
                    </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Username <span className="optional">(not editable)</span></label>
                        <input value={form.username} disabled style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} />
                    </div>

                    <div className="form-group">
                        <label>Display name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your display name" />
                    </div>

                    <div className="form-group">
                        <label>Avatar <span className="optional">(upload or paste URL)</span></label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    const reader = new FileReader()
                                    reader.onload = () => {
                                        setForm(f => ({ ...f, avatar: reader.result }))
                                    }
                                    reader.readAsDataURL(file)
                                }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} placeholder="https://... or base64 image" />
                            </div>
                            {form.avatar && (
                                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <img src={form.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => { setForm({ username: user?.username || '', name: user?.name || '', avatar: user?.avatar || '' }); setError('') }}>Reset</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>

                <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />

                <h3>Change password</h3>
                {pwdError && <div className="auth-error">{pwdError}</div>}
                {pwdSuccess && <div style={{ background: 'rgba(79, 204, 142, 0.08)', border: '1px solid rgba(79, 204, 142, 0.2)', color: 'var(--success)', padding: '8px 12px', borderRadius: '8px', marginBottom: 12 }}>{pwdSuccess}</div>}
                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label>Current password</label>
                        <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>New password</label>
                            <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Confirm new</label>
                            <input type="password" value={pwdForm.confirmNewPassword} onChange={e => setPwdForm(p => ({ ...p, confirmNewPassword: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-danger" disabled={pwdLoading}>{pwdLoading ? 'Saving...' : 'Change password'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ProfilePage
