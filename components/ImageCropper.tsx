
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from './Layout';
import { X, Check, RotateCw } from 'lucide-react';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: string) => void;
    onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const onCropChange = (crop: any) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: any,
        rotation = 0
    ): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return '';

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        canvas.width = safeArea;
        canvas.height = safeArea;

        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-safeArea / 2, -safeArea / 2);

        ctx.drawImage(
            image,
            safeArea / 2 - image.width * 0.5,
            safeArea / 2 - image.height * 0.5
        );
        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(
            data,
            Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
            Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
        );

        const resizedCanvas = document.createElement('canvas');
        const resizedCtx = resizedCanvas.getContext('2d');
        const TARGET_SIZE = 512;
        resizedCanvas.width = TARGET_SIZE;
        resizedCanvas.height = TARGET_SIZE;

        if (resizedCtx) {
            resizedCtx.drawImage(canvas, 0, 0, TARGET_SIZE, TARGET_SIZE);
            return new Promise((resolve) => {
                resizedCanvas.toBlob((file) => {
                    if (!file) return;
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                }, 'image/jpeg', 0.85);
            });
        }

        return new Promise((resolve) => {
            canvas.toBlob((file) => {
                if (!file) return;
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
            }, 'image/jpeg', 0.9);
        });
    };

    const handleDone = async () => {
        if (!croppedAreaPixels) return;
        try {
            setIsSaving(true);
            const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-white font-serif text-xl font-black">Refine Profile Photo</h3>
                <button onClick={onCancel} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 relative bg-black rounded-3xl overflow-hidden mb-6">
                <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteInternal}
                    onZoomChange={onZoomChange}
                />
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest min-w-[60px]">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e: any) => onZoomChange(Number(e.target.value))}
                            className="flex-1 accent-green-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest min-w-[60px]">Rotate</span>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e: any) => setRotation(Number(e.target.value))}
                            className="flex-1 accent-green-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                        <button
                            onClick={() => setRotation((prev) => (prev + 90) % 360)}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={onCancel} className="flex-1 !bg-transparent !text-white !border-white/20 hover:!bg-white/5 !h-14">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDone}
                        disabled={isSaving}
                        className="flex-1 !h-14 shadow-xl shadow-green-500/20"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Check className="w-5 h-5 mr-2" /> Save Photo</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
