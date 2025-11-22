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

    useEffect(() => {
        // Initialize scanner
        // Note: html5-qrcode renders into a div with a specific ID
        const scannerId = 'reader';

        // Wait for element to be available
        const element = document.getElementById(scannerId);
        if (!element) return;

        if (!scannerRef.current) {
            try {
                scannerRef.current = new Html5QrcodeScanner(
                    scannerId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }, // Square to support vertical codes
                        aspectRatio: 1.0,
                        showTorchButtonIfSupported: true,
                        useBarCodeDetectorIfSupported: true, // Use native API (Chrome Android) for better performance/orientation
                        videoConstraints: {
                            facingMode: "environment",
                            width: { min: 640, ideal: 1280, max: 1920 }, // Higher res for better details
                            height: { min: 480, ideal: 720, max: 1080 },
                            advanced: [{ focusMode: "continuous" } as any] // Try to force continuous focus
                        }
                    },
                    /* verbose= */ false
                );

                scannerRef.current.render(
                    (decodedText) => {
                        // Success callback
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // Error callback (frequent, ignore mostly)
                        // console.log(errorMessage);
                    }
                );

                // Hook into the camera feed to get zoom capabilities after a short delay
                setTimeout(() => {
                    const html5QrCode = (scannerRef.current as any)?.html5Qrcode;
                    if (html5QrCode) {
                        const track = html5QrCode.getRunningTrackCameraCapabilities(); // This might not be exposed directly in Scanner wrapper
                        // Alternative: Try to find the video element and get the stream
                        const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
                        if (video && video.srcObject) {
                            const stream = video.srcObject as MediaStream;
                            const track = stream.getVideoTracks()[0];
                            const capabilities = track.getCapabilities() as any;
                            if (capabilities.zoom) {
                                setZoomCap({
                                    min: capabilities.zoom.min,
                                    max: capabilities.zoom.max,
                                    step: capabilities.zoom.step
                                });
                                const settings = track.getSettings() as any;
                                if (settings.zoom) setZoom(settings.zoom);
                            }
                        }
                    }
                }, 2000);

            } catch (e) {
                setError('Failed to initialize camera. Please ensure permission is granted.');
                console.error(e);
            }
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
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
                        background: 'rgba(0,0,0,0.5)',
                        padding: '10px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '0.8rem' }}>1x</span>
                        <input
                            type="range"
                            min={zoomCap.min}
                            max={zoomCap.max}
                            step={zoomCap.step}
                            value={zoom}
                            onChange={handleZoomChange}
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '0.8rem' }}>{zoomCap.max}x</span>
                    </div>
                )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                Point camera at a JAN/EAN code. Use zoom if focus is difficult.
            </p>
        </div>
    );
};
