
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayCircle, Upload, MoreVertical, Eye, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MediaItem } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// no initial mock media; media will be loaded from backend


export default function ContentPage() {
    const { toast } = useToast();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [activeTab, setActiveTab] = useState('images');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const ITEMS_PER_PAGE = 24;
    
    // Dialog states
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [itemToView, setItemToView] = useState<MediaItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
    
    // State for editing within the view dialog
    const [editTitle, setEditTitle] = useState('');
    const [editAlt, setEditAlt] = useState('');

    // State for page-wide drag-and-drop upload
    const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
    // upload organization fields (owner/batch)
    const [uploadOwnerType, setUploadOwnerType] = useState('')
    const [uploadOwnerId, setUploadOwnerId] = useState('')
    const [uploadBatch, setUploadBatch] = useState('')
    
    useEffect(() => {
        if (itemToView) {
            setEditTitle(itemToView.title);
            if (itemToView.type === 'image') {
                setEditAlt(itemToView.alt || '');
            }
        }
    }, [itemToView]);

    // Define fetchMedia function for pagination
    const fetchMedia = async (page = 1, type?: string) => {
        try {
            setLoading(true);
            
            const params = new URLSearchParams();
            if (type) params.append('type', type);
            
            // Add pagination parameters
            const offset = (page - 1) * ITEMS_PER_PAGE;
            params.append('limit', ITEMS_PER_PAGE.toString());
            params.append('offset', offset.toString());
            
            // avoid cached 304 responses which cause empty bodies; force a fresh network request
            const res = await fetch(`/api/media/list?${params}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to fetch media')
            const result = await res.json()
            
            let items: any[];
            let total: number;
            
            // Handle both old format (array) and new format (object with data/total)
            if (Array.isArray(result)) {
                items = result;
                total = result.length;
            } else {
                items = result.data || [];
                total = result.total || 0;
            }
            
            // map backend media shape to MediaItem
            const mapped: MediaItem[] = items.map((m: any) => ({
                id: m.id,
                type: m.fileType === 'IMAGE' ? 'image' : 'video',
                src: m.filePath,
                title: m.title || m.fileName,
                // for videos, do not use the video file as the thumbnail image
                thumbnail: m.fileType === 'IMAGE' ? m.filePath : (m.thumbnail || undefined),
                'data-ai-hint': (m.metadata && m.metadata['data-ai-hint']) || undefined,
                // map batch and ownerType from metadata so the UI can show folder/batch info
                batch: (m.metadata && m.metadata.batch) || undefined,
                ownerType: (m.metadata && m.metadata.ownerType) || undefined,
                alt: m.altText || m.alt || undefined,
            }))
            
            if (page === 1) {
                // For first page, keep any in-memory newly added items and set mapped items
                setMedia(prev => {
                    const inMemory = prev.filter(p => p.id.startsWith('media-'))
                    return [...inMemory, ...mapped]
                })
            } else {
                // For subsequent pages, replace all items (no in-memory items on pagination)
                setMedia(mapped)
            }
            
            setTotalItems(total);

            // generate thumbnails for videos that don't have one
            mapped.filter(m => m.type === 'video' && !m.thumbnail).forEach(async (m) => {
                try {
                    const thumb = await generateVideoThumbnail(m.src)
                    if (thumb) {
                        setMedia(prev => prev.map(it => it.id === m.id ? { ...it, thumbnail: thumb } : it))
                    }
                    } catch (e) {
                        // ignore
                    }
                })
            } catch (e) {
                console.error(e)
                toast({
                    title: 'Error',
                    description: 'Failed to fetch media',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const type = activeTab === 'images' ? 'image' : activeTab === 'videos' ? 'video' : undefined;
        fetchMedia(page, type);
    };

    // fetch media from backend on mount and when tab changes
    useEffect(() => {
        const type = activeTab === 'images' ? 'image' : activeTab === 'videos' ? 'video' : undefined;
        setCurrentPage(1); // Reset to first page when changing tabs
        fetchMedia(1, type);
    }, [activeTab]);

    // generate a thumbnail image object URL for a video URL by capturing a frame
    const generateVideoThumbnail = (url: string, seekTime = 0.5): Promise<string | undefined> => {
        return new Promise((resolve) => {
            try {
                const video = document.createElement('video')
                video.crossOrigin = 'anonymous'
                video.muted = true
                video.playsInline = true
                video.src = url

                const cleanup = () => {
                    video.pause()
                    video.removeAttribute('src')
                    try { video.load() } catch (e) {}
                }

                const onError = () => {
                    cleanup()
                    resolve(undefined)
                }

                const doCapture = () => {
                    try {
                        const canvas = document.createElement('canvas')
                        canvas.width = video.videoWidth || 320
                        canvas.height = video.videoHeight || 180
                        const ctx = canvas.getContext('2d')
                        if (!ctx) { onError(); return }
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        canvas.toBlob((blob) => {
                            if (!blob) { onError(); return }
                            const obj = URL.createObjectURL(blob)
                            cleanup()
                            resolve(obj)
                        }, 'image/jpeg', 0.8)
                    } catch (e) { onError() }
                }

                const onLoaded = () => {
                    try {
                        const duration = isFinite(video.duration) ? video.duration : 0
                        const t = Math.min(seekTime, Math.max(0, duration / 2))
                        const seekHandler = () => {
                            video.removeEventListener('seeked', seekHandler)
                            doCapture()
                        }
                        video.addEventListener('seeked', seekHandler)
                        // some browsers disallow setting currentTime before metadata; ensure it's set after loadeddata
                        try { video.currentTime = t } catch (e) { /* ignore */ }
                    } catch (e) { onError() }
                }

                video.addEventListener('loadeddata', onLoaded, { once: true })
                video.addEventListener('error', onError, { once: true })
                // safety timeout
                const to = window.setTimeout(() => { onError() }, 6000)
                // when we resolve/cleanup, clear timeout
                const origResolve: (value: string | PromiseLike<string | undefined> | undefined) => void = resolve;
                resolve = (v?: string | PromiseLike<string | undefined>) => { window.clearTimeout(to); try { origResolve(v) } catch (e) {} }
                // start loading
                try { video.load() } catch (e) { /* ignore */ }
            } catch (e) {
                resolve(undefined)
            }
        })
    }

    // Pagination helpers
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisible - 1);

            if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages) {
                if (end < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    // Pagination Component
    const PaginationControls = () => {
        if (totalPages <= 1 || loading) return null;

        return (
            <div className="flex items-center justify-between mt-6 px-1">
                <div className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalItems} media items
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {generatePageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                            ) : (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page as number)}
                                    className="w-8 h-8 p-0"
                                >
                                    {page}
                                </Button>
                            )
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        const form = new FormData()
        // send files one by one to reuse existing upload endpoint behavior
        const uploaded: any[] = []
        for (const file of Array.from(files)) {
            // create a fresh FormData per file to avoid stale fields
            const fileForm = new FormData()
            fileForm.append('file', file)
            if (uploadOwnerType) fileForm.append('ownerType', uploadOwnerType)
            if (uploadOwnerId) fileForm.append('ownerId', uploadOwnerId)
            if (uploadBatch) fileForm.append('batch', uploadBatch)
            try {
                const res = await fetch('/api/media/upload', { method: 'POST', body: fileForm })
                if (!res.ok) throw new Error('upload failed')
                const json = await res.json()
                // server returns an array [media] for compatibility (batch). Normalize to push items.
                let items: any[] = []
                if (Array.isArray(json)) items = json
                else if (Array.isArray(json?.data)) items = json.data
                else if (json?.data) items = [json.data]
                else items = [json]
                for (const it of items) uploaded.push(it)
            } catch (e) {
                console.error('upload error', e)
            }
        }

        if (uploaded.length > 0) {
            const mapped: MediaItem[] = uploaded.map((m: any) => ({
                id: m.id,
                type: m.fileType === 'IMAGE' ? 'image' : 'video',
                src: m.filePath,
                title: m.title || m.fileName,
                thumbnail: m.fileType === 'IMAGE' ? m.filePath : (m.thumbnail || undefined),
                'data-ai-hint': (m.metadata && m.metadata['data-ai-hint']) || undefined,
                batch: (m.metadata && m.metadata.batch) || undefined,
                ownerType: (m.metadata && m.metadata.ownerType) || undefined,
                alt: m.altText || undefined,
            }))

            setMedia(prev => [...mapped, ...prev])
            // for any uploaded videos without thumbnail, generate one client-side
            mapped.filter(m => m.type === 'video' && !m.thumbnail).forEach(async (m) => {
                try {
                    const thumb = await generateVideoThumbnail(m.src)
                    if (thumb) setMedia(prev => prev.map(it => it.id === m.id ? { ...it, thumbnail: thumb } : it))
                } catch (e) {}
            })
            toast({ title: 'Upload successful', description: `${mapped.length} file(s) added.` })
            setIsUploadDialogOpen(false)
        }
    }
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
    };

    const handlePageDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverPage(true);
    };

    const handlePageDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverPage(false);
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFiles(event.dataTransfer.files);
            event.dataTransfer.clearData();
        }
    };
    
    const handleSaveMediaDetails = async () => {
        if (!itemToView) return

        try {
            const body: any = { title: editTitle }
            if (itemToView.type === 'image') body.altText = editAlt

            // optimistic update locally
            const updatedItemLocal: MediaItem = { ...itemToView, title: editTitle, alt: itemToView.type === 'image' ? editAlt : itemToView.alt }
            setMedia(media.map(item => (item.id === itemToView.id ? updatedItemLocal : item)))
            setItemToView(updatedItemLocal)

            // if id looks like a persisted id, call API
            if (!itemToView.id.startsWith('media-')) {
                const res = await fetch(`/api/media/${itemToView.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                if (!res.ok) throw new Error('save failed')
            }

            toast({ title: 'Media details saved successfully.' })
        } catch (e) {
            console.error('save media details', e)
            toast({ title: 'Save failed', description: String(e) })
        }
    }

    const handleDelete = async () => {
        if (!itemToDelete) return
        const id = itemToDelete.id
        // optimistic
        setMedia(media.filter(item => item.id !== id))
        setItemToDelete(null)
        try {
            if (!id.startsWith('media-')) {
                const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
                if (!res.ok && res.status !== 204) throw new Error('delete failed')
            }
            toast({ title: 'Delete successful', description: `"${itemToDelete.title}" has been deleted.` })
        } catch (e) {
            console.error('delete media', e)
            toast({ title: 'Delete failed' })
        }
    }
    
    const handleCopyUrl = () => {
        if (itemToView?.src) {
            navigator.clipboard.writeText(itemToView.src);
            toast({ title: "URL copied to clipboard." });
        }
    };

    const MediaGrid = ({ items }: { items: MediaItem[] }) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                    <div className="aspect-square relative cursor-pointer" onClick={() => setItemToView(item)}>
                        {/* batch/owner badge */}
                        {(item as any).batch || (item as any).ownerType ? (
                            <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
                                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded">{(item as any).ownerType ? (item as any).ownerType : ''}{(item as any).ownerType && (item as any).batch ? ' / ' : ''}{(item as any).batch ? (item as any).batch : ''}</span>
                            </div>
                        ) : null}
                        {item.type === 'image' && (item.thumbnail || item.src) ? (
                                (typeof (item.thumbnail || item.src) === 'string' && (item.thumbnail || item.src).length > 0) ? (
                                <Image src={item.thumbnail || item.src} alt={item.alt || item.title} fill className="object-cover transition-transform group-hover:scale-105" data-ai-hint={item['data-ai-hint']} />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <p className="text-sm text-muted-foreground">No preview</p>
                                </div>
                            )
                        ) : item.type === 'video' ? (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                {/* show poster thumbnail if available, otherwise use native video element but muted/paused */}
                                {item.thumbnail ? (
                                        (typeof item.thumbnail === 'string' && item.thumbnail.length > 0) ? (
                                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <p className="text-sm text-muted-foreground">No preview</p>
                                        </div>
                                    )
                                ) : (
                                        (typeof item.src === 'string' && item.src.length > 0) ? (
                                        <video src={item.src} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <p className="text-sm text-muted-foreground">No preview</p>
                                        </div>
                                    )
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlayCircle className="h-12 w-12 text-white/80" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <p className="text-sm text-muted-foreground">No preview</p>
                            </div>
                        )}
                    </div>
                    <div className="p-3 flex justify-between items-start">
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate" title={item.title}>{item.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setItemToView(item)}><Eye className="mr-2 h-4 w-4" />View/Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Card>
            ))}
        </div>
    );
    
    const filteredMedia = (type: 'image' | 'video') => media.filter(item => item.type === type);

    return (
        <>
            <div className="space-y-6 relative" onDragOver={handlePageDragOver}>
                {isDraggingOverPage && (
                     <div
                        className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center"
                        onDragLeave={() => setIsDraggingOverPage(false)}
                        onDrop={handlePageDrop}
                    >
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-primary">
                            <Upload className="w-16 h-16 mb-4 text-primary" />
                            <p className="text-2xl font-semibold text-primary">Drop files to upload</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Content & Media</h1>
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Upload Media
                    </Button>
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="images">
                    <TabsList>
                        <TabsTrigger value="images">Images</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="images">
                        <Card>
                            <CardContent className="pt-6">
                                {filteredMedia('image').length > 0 ? (
                                    <>
                                        <MediaGrid items={filteredMedia('image')} />
                                        <PaginationControls />
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No images found. Drag and drop to upload!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="videos">
                        <Card>
                            <CardContent className="pt-6">
                                {filteredMedia('video').length > 0 ? (
                                    <>
                                        <MediaGrid items={filteredMedia('video')} />
                                        <PaginationControls />
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No videos found. Drag and drop to upload!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Upload Dialog */}
             <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Media</DialogTitle>
                        <DialogDescription>Click the area below to select files from your device.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-4">
                            <label
                                htmlFor="media-upload"
                                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-input hover:bg-muted/50"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground">
                                        <span className="font-semibold">Click to upload</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">Images or Videos</p>
                                </div>
                                <Input id="media-upload" type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                            </label>

                            <div className="grid sm:grid-cols-3 gap-2">
                                <div>
                                    <Label htmlFor="upload-owner-type">Owner Type</Label>
                                    <Input id="upload-owner-type" value={uploadOwnerType} onChange={(e) => setUploadOwnerType(e.target.value)} placeholder="product | category | collection" />
                                </div>
                                <div>
                                    <Label htmlFor="upload-owner-id">Owner ID</Label>
                                    <Input id="upload-owner-id" value={uploadOwnerId} onChange={(e) => setUploadOwnerId(e.target.value)} placeholder="optional owner id" />
                                </div>
                                <div>
                                    <Label htmlFor="upload-batch">Batch / Folder</Label>
                                    <Input id="upload-batch" value={uploadBatch} onChange={(e) => setUploadBatch(e.target.value)} placeholder="e.g. listings, hero, campaign-01" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">When provided, uploads will be saved to subfolders under /uploads in the form /uploads/{`{ownerType}/{ownerId}/{batch}`}. Leave empty to save at top-level /uploads.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View/Edit Dialog */}
            <Dialog open={!!itemToView} onOpenChange={(open: boolean) => { if (!open) setItemToView(null) }}>
                {itemToView?.type === 'image' ? (
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>Edit Image Details</DialogTitle>
                        </DialogHeader>
                        <div className="grid md:grid-cols-2 gap-8 py-4">
                            <div className="relative aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                {typeof itemToView.src === 'string' && itemToView.src.length > 0 ? (
                                    <Image src={itemToView.src} alt={editAlt || editTitle} fill className="object-contain" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground">No preview</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-title">Title</Label>
                                    <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-alt">Alt Text (for accessibility)</Label>
                                    <Input id="edit-alt" value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
                                </div>
                                <Separator />
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button onClick={handleSaveMediaDetails}>Save Changes</Button>
                                    <Button variant="outline" onClick={handleCopyUrl}><Copy className="mr-2 h-4 w-4" />Copy URL</Button>
                                    <Button variant="destructive" onClick={() => { setItemToDelete(itemToView); setItemToView(null); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                ) : itemToView?.type === 'video' ? (
                     <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>Edit Video Details</DialogTitle>
                        </DialogHeader>
                        <div className="grid md:grid-cols-2 gap-8 py-4">
                            <div className="flex items-center justify-center bg-muted rounded-md aspect-video">
                                <video src={itemToView.src} controls autoPlay className="w-full h-full rounded-md" />
                            </div>
                            <div className="flex flex-col space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-video-title">Title</Label>
                                    <Input id="edit-video-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                </div>
                                <Separator />
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button onClick={handleSaveMediaDetails}>Save Changes</Button>
                                    <Button variant="outline" onClick={handleCopyUrl}><Copy className="mr-2 h-4 w-4" />Copy URL</Button>
                                    <Button variant="destructive" onClick={() => { setItemToDelete(itemToView); setItemToView(null); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                ) : null}
            </Dialog>
            
             {/* Delete Alert Dialog */}
             <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete "{itemToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
