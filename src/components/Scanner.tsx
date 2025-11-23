import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
    onScan: (decodedText: string) => void;
}

export const Scanner = ({ onScan }: ScannerProps) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string>('');
    const [zoom, setZoom] = useState(1);
    const [zoomCap, setZoomCap] = useState<{ min: number, max: number, step: number } | null>(null);
    const initAttemptRef = useRef(0);

    useEffect(() => {
        const scannerId = 'reader';

        // Cleanup previous instance if exists
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }

        try {
            scannerRef.current = new Html5QrcodeScanner(
                scannerId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    useBarCodeDetectorIfSupported: true,
                    videoConstraints: {
                        facingMode: "environment",
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                        advanced: [{ focusMode: "continuous" } as any]
                    }
                },
                /* verbose= */ false
            );

            scannerRef.current.render(
                (decodedText) => {
                    onScan(decodedText);
                },
                (_) => {
                    // Ignore errors
                }
            );

            // Polling to detect camera and set zoom
            const checkCamera = setInterval(() => {
                initAttemptRef.current++;
                const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;

                if (video && video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    const track = stream.getVideoTracks()[0];

                    if (track) {
                        const capabilities = track.getCapabilities() as any;

                        // Check if zoom is supported
                        if (capabilities.zoom) {
                            clearInterval(checkCamera); // Stop polling

                            const min = capabilities.zoom.min;
                            const max = capabilities.zoom.max;
                            const step = capabilities.zoom.step;

                            setZoomCap({ min, max, step });

                            // Set default zoom to ~2.0x or 20% of range, whichever is safer
                            // Barcodes are hard to read at 1x on wide lenses
                            let defaultZoom = 2.0;
                            if (defaultZoom < min) defaultZoom = min;
                            if (defaultZoom > max) defaultZoom = min + (max - min) * 0.2; // Fallback to 20%

                            // Apply default zoom
                            track.applyConstraints({
                                advanced: [{ zoom: defaultZoom } as any]
                            }).then(() => {
                                setZoom(defaultZoom);
                                console.log(`Zoom set to ${defaultZoom}`);
                            }).catch(e => console.warn('Failed to set default zoom', e));
                        } else if (initAttemptRef.current > 20) {
                            // Stop checking after ~10 seconds (20 * 500ms) if no zoom found
                            clearInterval(checkCamera);
                        }
                    }
                }
            }, 500);

            return () => {
                clearInterval(checkCamera);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                }
            };

        } catch (e) {
            setError('Failed to initialize camera.');
            console.error(e);
        }
    }, [onScan]);

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);

        const scannerId = 'reader';
        const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            track.applyConstraints({
                advanced: [{ zoom: newZoom } as any]
            }).catch(console.error);
        }
    };

    return (
        <div className="card">
            <h3>Scan Barcode</h3>
            {error && <p style={{ color: 'var(--secondary-color)' }}>{error}</p>}

            <div style={{ position: 'relative' }}>
                <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>

                {zoomCap && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        zIndex: 100,
                        background: 'rgba(0,0,0,0.6)',
                        padding: '10px 15px',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>{zoomCap.min}x</span>
                        <input
                            type="range"
                            min={zoomCap.min}
                            max={zoomCap.max}
                            step={zoomCap.step}
                            value={zoom}
                            onChange={handleZoomChange}
                            style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>{zoomCap.max}x</span>
                    </div>
                )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px', textAlign: 'center' }}>
                Point camera at a JAN/EAN code.
            </p>
        </div>
    );
};
