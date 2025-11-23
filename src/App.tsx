import { useState, useEffect } from 'react';
import { Scan, List, TrendingUp, Settings, Cloud } from 'lucide-react';
import './index.css';
import { Scanner } from './components/Scanner';
import { InventoryList } from './components/InventoryList';
import { InventoryService } from './services/inventory';
import { PriceService } from './services/prices';
import { SettingsModal } from './components/SettingsModal';
import { GitHubService } from './services/github';
import type { GitHubConfig } from './services/github';
import type { InventoryItem, ShopPrice } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'inventory' | 'analysis'>('scan');
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Scan State
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [prices, setPrices] = useState<ShopPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [fetchedMeta, setFetchedMeta] = useState<{ name: string, imageUrl: string } | null>(null);
  const [manualJan, setManualJan] = useState('');

  // GitHub Sync State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setLastSha] = useState<string>('');

  useEffect(() => {
    loadItems();

    // Load GitHub config
    const savedConfig = localStorage.getItem('gh_config');
    if (savedConfig) {
      setGhConfig(JSON.parse(savedConfig));
    }
  }, []);

  const loadItems = () => {
    setItems(InventoryService.getAll());
  };

  const handleSync = async () => {
    if (!ghConfig) {
      setIsSettingsOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Pull latest from GitHub
      const result = await GitHubService.fetchInventory(ghConfig);

      if (result) {
        // Simple strategy: GitHub wins if exists, otherwise push local
        // Ideally we merge, but user said "local data reload is fine"
        if (result.items.length > 0) {
          if (confirm(`Found ${result.items.length} items on GitHub. Overwrite local data?`)) {
            InventoryService.setAll(result.items);
            setItems(result.items);
            setLastSha(result.sha);
            alert('Synced from GitHub!');
          }
        } else {
          // File empty or new, push local
          if (confirm('GitHub file is empty. Upload local data?')) {
            const newSha = await GitHubService.saveInventory(ghConfig, items, result.sha);
            setLastSha(newSha);
            alert('Uploaded to GitHub!');
          }
        }
      }
    } catch (e) {
      alert('Sync failed. Check console.');
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = (config: GitHubConfig) => {
    setGhConfig(config);
    localStorage.setItem('gh_config', JSON.stringify(config));
    setIsSettingsOpen(false);
    // Auto sync after save?
    if (confirm('Settings saved. Sync now?')) {
      // Trigger sync in next tick
      setTimeout(() => handleSync(), 100);
    }
  };

  const handleScan = async (decodedText: string) => {
    // Avoid duplicate scans
    if (scannedCode === decodedText) return;

    setScannedCode(decodedText);
    setLoadingPrices(true);
    setFetchedMeta(null); // Reset meta
    try {
      const results = await PriceService.fetchPrices(decodedText);
      setPrices(results);

      // Try to find name/image from results (Rakuten > Yahoo > GoogleBooks)
      const meta = results.find(r =>
        (r.shopName === 'Rakuten' || r.shopName === 'Yahoo' || r.shopName === 'GoogleBooks') &&
        (r as any).productName
      );

      if (meta) {
        setFetchedMeta({
          name: (meta as any).productName,
          imageUrl: (meta as any).imageUrl
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualJan.trim().length > 0) {
      handleScan(manualJan.trim());
      setManualJan('');
    }
  };

  const handleAddToInventory = () => {
    if (!scannedCode) return;
    const price = parseInt(purchasePrice) || 0;

    InventoryService.add({
      janCode: scannedCode,
      name: fetchedMeta?.name || `Item ${scannedCode}`,
      imageUrl: fetchedMeta?.imageUrl,
      purchasePrice: price,
      quantity: addQuantity,
      status: 'active'
    });

    loadItems();

    // Reset
    setScannedCode(null);
    setPrices([]);
    setPurchasePrice('');
    setAddQuantity(1);
    setFetchedMeta(null);
    alert(`Added ${addQuantity} items to inventory!`);

    // Auto-push to GitHub if configured
    if (ghConfig) {
      // We need the latest SHA to push. If we haven't synced yet, we might fail.
      // For now, let's just notify user or try silent push if we have SHA
      // Implementing a robust auto-sync is complex, let's stick to manual for now or simple push
    }
  };

  const bestPrice = PriceService.getBestPrice(prices);

  // Filter out metadata-only sources from the link list
  const displayPrices = prices.filter(p => !['Rakuten', 'Yahoo', 'GoogleBooks'].includes(p.shopName));

  return (
    <div className="app-container">
      <header style={{
        padding: '16px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          <span className="text-neon">CYBER</span> TRADER
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px'
            }}
            title="Sync with GitHub"
          >
            <Cloud size={20} className={isSyncing ? 'spin' : ''} />
            {ghConfig ? 'Sync' : 'Setup Sync'}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentConfig={ghConfig}
      />

      <main className="container" style={{ paddingTop: '20px' }}>
        {activeTab === 'scan' && (
          <>
            {!scannedCode ? (
              <div className="scanner-section">
                <Scanner onScan={handleScan} />

                <div style={{ marginTop: '20px', padding: '0 10px' }}>
                  <p style={{ textAlign: 'center', color: '#888', marginBottom: '10px', fontSize: '0.9rem' }}>Or enter code manually:</p>
                  <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={manualJan}
                      onChange={(e) => setManualJan(e.target.value)}
                      placeholder="JAN / EAN Code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface-color-light)',
                        color: '#fff',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 20px',
                        background: 'var(--primary-color)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      GO
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <p style={{ margin: 0 }}>JAN: <strong>{scannedCode}</strong></p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scannedCode);
                      alert('JAN code copied!');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      background: '#eee',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </div>
                <h2 className="text-neon">Scanned: {scannedCode}</h2>

                {loadingPrices ? (
                  <p>Fetching prices...</p>
                ) : (
                  <div style={{ margin: '20px 0' }}>
                    <h3>Price Check</h3>

                    {bestPrice && (
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--primary-color)',
                        border: '1px solid var(--primary-color)',
                        padding: '10px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        marginBottom: '20px'
                      }}>
                        ¥{bestPrice.price.toLocaleString()}
                        <div style={{ fontSize: '0.8rem', color: 'white' }}>Best: {bestPrice.shopName}</div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                      {displayPrices.map((shop) => (
                        <a
                          key={shop.shopName}
                          href={shop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--surface-color-light)',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: 'white',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <span>{shop.shopName}</span>
                          {shop.price > 0 ? (
                            <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>¥{shop.price.toLocaleString()}</span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Check Site &rarr;</span>
                          )}
                        </a>
                      ))}
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                      <div className="add-stock-form" style={{ marginTop: '20px', padding: '15px', background: '#222', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>Add to Stock</h3>

                        {fetchedMeta && fetchedMeta.name && (
                          <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {fetchedMeta.imageUrl && <img src={fetchedMeta.imageUrl} alt="Product" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />}
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{fetchedMeta.name}</p>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Cost (Optional)</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={purchasePrice}
                              onChange={(e) => setPurchasePrice(e.target.value)}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Quantity</label>
                            <input
                              type="number"
                              placeholder="1"
                              value={addQuantity}
                              onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleAddToInventory}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          Add to Inventory
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                      <button className="btn" style={{ background: '#333' }} onClick={() => setScannedCode(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'inventory' && (
          <InventoryList items={items} onUpdate={() => setItems(InventoryService.getAll())} />
        )}

        {activeTab === 'analysis' && (
          <div className="card">
            <h2>Profit Analysis</h2>
            <p>Total Items: {items.length}</p>
            {/* Future implementation */}
          </div>
        )}
      </main>

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px',
        zIndex: 100
      }}>
        <NavButton
          icon={<Scan />}
          label="Scan"
          active={activeTab === 'scan'}
          onClick={() => setActiveTab('scan')}
        />
        <NavButton
          icon={<List />}
          label="Stock"
          active={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
        />
        <NavButton
          icon={<TrendingUp />}
          label="Profit"
          active={activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
        />
      </nav>
    </div>
  );
}

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      color: active ? 'var(--primary-color)' : 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer'
    }}
  >
    {icon}
    <span style={{ fontSize: '0.75rem' }}>{label}</span>
  </button>
);

export default App;
