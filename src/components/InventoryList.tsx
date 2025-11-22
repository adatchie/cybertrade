import type { InventoryItem } from '../types';
import { Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
}

export const InventoryList = ({ items, onUpdate }: InventoryListProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, quantity: string }>({ price: '', quantity: '' });
    const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditForm({ price: item.purchasePrice.toString(), quantity: item.quantity.toString() });
    };

    const saveEdit = (id: string) => {
        const price = parseInt(editForm.price) || 0;
        const quantity = parseInt(editForm.quantity) || 1;
        InventoryService.update(id, { purchasePrice: price, quantity });
        setEditingId(null);
        onUpdate();
    };

    const handleSell = (id: string) => {
        const priceStr = prompt('Enter sold price (optional):', '0');
        if (priceStr !== null) {
            const price = parseInt(priceStr) || 0;
            InventoryService.markAsSold(id, price);
            onUpdate();
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Permanently delete this record?')) {
            InventoryService.remove(id);
            onUpdate();
        }
    };

    const filteredItems = items.filter(item => {
        const status = item.status || 'active'; // Default to active for old data
        return status === activeTab;
    });

    return (
        <div className="inventory-list">
            <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'active' ? 'var(--primary-color)' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    Active Stock
                </button>
                <button
                    className={`tab-btn ${activeTab === 'sold' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sold')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'sold' ? 'var(--primary-color)' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    Sold History
                </button>
            </div>

            {filteredItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No items in {activeTab} list.</p>
            ) : (
                filteredItems.map((item) => (
                    <div key={item.id} className="inventory-item" style={{
                        background: '#1a1a1a',
                        padding: '15px',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{item.janCode}</span>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                        </div>

                        {editingId === item.id ? (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <input
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                    style={{ width: '80px', padding: '5px' }}
                                />
                                <input
                                    type="number"
                                    value={editForm.quantity}
                                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                    style={{ width: '50px', padding: '5px' }}
                                />
                                <button onClick={() => saveEdit(item.id)} style={{ background: 'green', color: 'white', border: 'none', borderRadius: '4px' }}>Save</button>
                                <button onClick={() => setEditingId(null)} style={{ background: '#666', color: 'white', border: 'none', borderRadius: '4px' }}>Cancel</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: '#aaa' }}>Buy: ¥{item.purchasePrice.toLocaleString()}</div>
                                    <div style={{ color: '#aaa' }}>Qty: {item.quantity}</div>
                                    {item.status === 'sold' && (
                                        <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                                            Sold: ¥{(item.soldPrice || 0).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {item.status !== 'sold' && (
                                        <>
                                            <Edit2 size={20} color="#4a90e2" onClick={() => startEdit(item)} style={{ cursor: 'pointer' }} />
                                            <button
                                                onClick={() => handleSell(item.id)}
                                                style={{
                                                    background: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '5px 10px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Sell
                                            </button>
                                        </>
                                    )}
                                    <Trash2 size={20} color="#ff4444" onClick={() => handleDelete(item.id)} style={{ cursor: 'pointer' }} />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};
