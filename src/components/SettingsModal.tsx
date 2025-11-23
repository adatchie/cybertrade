import { useState, useEffect } from 'react';
import { GitHubConfig, GitHubService } from '../services/github';
import { Save, Github, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: GitHubConfig) => void;
    currentConfig: GitHubConfig | null;
}

export const SettingsModal = ({ isOpen, onClose, onSave, currentConfig }: SettingsModalProps) => {
    const [token, setToken] = useState('');
    const [owner, setOwner] = useState('');
    const [repo, setRepo] = useState('');
    const [path, setPath] = useState('inventory.json');
    const [status, setStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (currentConfig) {
            setToken(currentConfig.token);
            setOwner(currentConfig.owner);
            setRepo(currentConfig.repo);
            setPath(currentConfig.path);
        }
    }, [currentConfig]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setStatus('validating');
        const config: GitHubConfig = { token, owner, repo, path };

        const isValid = await GitHubService.validateConfig(config);

        if (isValid) {
            setStatus('success');
            onSave(config);
            setTimeout(onClose, 1000);
        } else {
            setStatus('error');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#222', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px',
                border: '1px solid #444', color: '#fff'
            }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    <Github size={24} /> GitHub Sync Settings
                </h2>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#aaa' }}>Personal Access Token (Repo Scope)</label>
                    <input
                        type="password"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                        placeholder="ghp_xxxxxxxxxxxx"
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#aaa' }}>Username / Owner</label>
                        <input
                            type="text"
                            value={owner}
                            onChange={e => setOwner(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                            placeholder="username"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#aaa' }}>Repository Name</label>
                        <input
                            type="text"
                            value={repo}
                            onChange={e => setRepo(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                            placeholder="my-repo"
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#aaa' }}>File Path</label>
                    <input
                        type="text"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                        placeholder="inventory.json"
                    />
                </div>

                {status === 'error' && (
                    <div style={{ color: '#ff4444', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                        <AlertCircle size={16} /> Connection failed. Check token/permissions.
                    </div>
                )}

                {status === 'success' && (
                    <div style={{ color: '#4caf50', marginBottom: '15px', fontSize: '0.9rem' }}>
                        Connection successful! Saving...
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={status === 'validating'}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--primary-color)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        {status === 'validating' ? 'Checking...' : <><Save size={16} /> Save & Connect</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
