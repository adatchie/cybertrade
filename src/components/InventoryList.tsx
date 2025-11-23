import type { InventoryItem } from '../types';
import { Trash2, Edit2, RefreshCw, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';
import { PriceService } from '../services/prices';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
}

export const InventoryList = ({ items, onUpdate }: InventoryListProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, quantity: string }>({ price: '', quantity: '' });
    const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const handleSell = (item: InventoryItem) => {
        const sellQtyStr = item.quantity > 1 ? prompt(`How many to sell? (Max: ${item.quantity})`, item.quantity.toString()) : '1';
        if (sellQtyStr === null) return;

        const sellQty = parseInt(sellQtyStr);
        if (isNaN(sellQty) || sellQty <= 0 || sellQty > item.quantity) {
            alert('Invalid quantity');
            return;
        }

        const priceStr = prompt('Enter sold price per unit (optional):', '0');
        if (priceStr !== null) {
            const price = parseInt(priceStr) || 0;
            if (sellQty < item.quantity) {
                // Reduce current item quantity
                InventoryService.update(item.id, { quantity: item.quantity - sellQty });
                // Add sold item
                InventoryService.add({
                    janCode: item.janCode,
                    name: item.name,
                    imageUrl: item.imageUrl,
                    purchasePrice: item.purchasePrice,
                    quantity: sellQty,
                    status: 'sold',
                    soldDate: Date.now(),
                    soldPrice: price
                } as any);
            } else {
                InventoryService.markAsSold(item.id, price);
            }
            onUpdate();
        }
    };

    const handleDelete = (item: InventoryItem) => {
        if (item.quantity > 1) {
            const delQtyStr = prompt(`How many to delete? (Max: ${item.quantity}) \nEnter "all" to delete everything.`, '1');
            if (delQtyStr === null) return;

            if (delQtyStr.toLowerCase() === 'all') {
                if (confirm('Permanently delete all units?')) {
                    InventoryService.remove(item.id);
                    onUpdate();
                }
                return;
            }

            const delQty = parseInt(delQtyStr);
            if (isNaN(delQty) || delQty <= 0 || delQty > item.quantity) {
                alert('Invalid quantity');
                return;
            }

            if (delQty === item.quantity) {
                if (confirm('Permanently delete all units?')) {
                    InventoryService.remove(item.id);
                    onUpdate();
                }
            } else {
                InventoryService.update(item.id, { quantity: item.quantity - delQty });
                onUpdate();
            }
        } else {
            if (confirm('Permanently delete this record?')) {
                InventoryService.remove(item.id);
                onUpdate();
            }
        }
    };

    const handleRefreshMetadata = async () => {
        if (!confirm('Update product info? This will try to fix broken titles.')) return;

        setIsRefreshing(true);
        let updatedCount = 0;
        let errorCount = 0;

        try {
            const uniqueJans = Array.from(new Set(items.map(i => i.janCode)));

            // First, aggressively clean known garbage titles locally
            const garbage = ['買取Wiki', '買取wiki', 'ゲーム機の買取専門店', '検索結果'];

            // Also detect mojibake or broken encoding if possible (e.g. very short weird names)
            // But mainly we just want to force refresh everything that looks suspicious or user requested

            items.forEach(item => {
                // Reset if it looks like garbage (e.g. site titles)
                // Fix: Removed accidental always-true check that caused valid names to be reset
                if (garbage.some(g => item.name.toLowerCase().includes(g.toLowerCase()))) {
                    InventoryService.update(item.id, {
                        name: `Item ${item.janCode}`, // Reset to generic
                    });
                    updatedCount++;
                }
            });

            // Then try to fetch new data
            for (const jan of uniqueJans) {
                try {
                    const results = await PriceService.fetchPrices(jan);
                    // Prioritize Rakuten or Yahoo for metadata, but accept GoogleBooks
                    const metaResult = results.find(r =>
                        (r.shopName === 'Yahoo' || r.shopName === 'Rakuten' || r.shopName === 'GoogleBooks') &&
                        (r as any).productName
                    );

                    if (metaResult) {
                        const name = (metaResult as any).productName;
                        const imageUrl = (metaResult as any).imageUrl;

                        const itemsToUpdate = items.filter(i => i.janCode === jan);
                        itemsToUpdate.forEach(item => {
                            // Update if name is generic, garbage, or just force update to fix mojibake
                            // We'll update if the new name is different and looks valid
                            // Update if we found a valid name
                            if (name) {
                                InventoryService.update(item.id, {
                                    name: name,
                                    imageUrl: imageUrl
                                });
                                updatedCount++;
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Failed to refresh ${jan}`, e);
                    errorCount++;
                }
            }
            onUpdate();
            alert(`Metadata updated!\nUpdated/Fixed: ${updatedCount} items\nErrors: ${errorCount}`);
        } catch (error) {
            console.error(error);
            alert('Error updating metadata');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    if (Array.isArray(json)) {
                        if (confirm(`Import ${json.length} items? This will merge with current inventory.`)) {
                            const currentIds = new Set(items.map(i => i.id));
                            let added = 0;
                            json.forEach((item: InventoryItem) => {
                                if (!currentIds.has(item.id)) {
                                    InventoryService.importItem(item);
                                    added++;
                                }
                            });
                            onUpdate();
                            alert(`Imported ${added} new items.`);
                        }
                    } else {
                        alert('Invalid JSON format');
                    }
                } catch (err) {
                    alert('Failed to parse JSON');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const filteredItems = items.filter(item => {
        const status = item.status || 'active'; // Default to active for old data
        return status === activeTab;
    });

    return (
        <div className="inventory-list">
            <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                    style={{
                        flex: 1,
                        minWidth: '100px',
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
                        minWidth: '100px',
                        padding: '10px',
                        background: activeTab === 'sold' ? 'var(--primary-color)' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    Sold History
                </button>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        onClick={handleRefreshMetadata}
                        disabled={isRefreshing}
                        style={{
                            padding: '10px',
                            background: '#444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isRefreshing ? 'wait' : 'pointer'
                        }}
                        title="Force Refresh Metadata (Fix Broken Titles)"
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'spin' : ''} />
                    </button>
                    <button onClick={handleExport} style={{ padding: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }} title="Export JSON">
                        <Download size={20} />
                    </button>
                    <button onClick={handleImport} style={{ padding: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }} title="Import JSON">
                        <Upload size={20} />
                    </button>
                </div>
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
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : (
                                <div style={{ width: '60px', height: '60px', background: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.7rem' }}>No Img</div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{item.name || item.janCode}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{item.janCode}</div>
                            </div>
                        </div>

                        {editingId === item.id ? (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <input
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                    style={{ width: '80px', padding: '5px' }}
                                    placeholder="Price"
                                />
                                <input
                                    type="number"
                                    value={editForm.quantity}
                                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                    style={{ width: '50px', padding: '5px' }}
                                    placeholder="Qty"
                                />
                                <button onClick={() => saveEdit(item.id)} style={{ background: 'green', color: 'white', border: 'none', borderRadius: '4px' }}>Save</button>
                                <button onClick={() => setEditingId(null)} style={{ background: '#666', color: 'white', border: 'none', borderRadius: '4px' }}>Cancel</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: '#aaa' }}>Buy: ¥{item.purchasePrice.toLocaleString()}</div>
                                    <div style={{ color: '#aaa', fontWeight: 'bold' }}>Qty: {item.quantity}</div>
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
                                                onClick={() => handleSell(item)}
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
                                    <Trash2 size={20} color="#ff4444" onClick={() => handleDelete(item)} style={{ cursor: 'pointer' }} />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};
