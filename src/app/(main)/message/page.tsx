

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, MoreVertical, Trash, Archive, Inbox, Send, FileText, AlertOctagon, Reply, Paperclip, ChevronDown, Plus, Pencil, Edit, Trash2, Undo, ChevronLeft, Tag, Clock, User, Home, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMessagingApi, type MessageThread, type ConversationMessage, type QuickReply as ApiQuickReply, type Label as ApiLabel } from '@/hooks/useMessagingApi';
import { useRealtime } from '@/hooks/useRealtime';
import Link from 'next/link';


const folders = [
  { name: 'All', icon: Inbox, filter: {} },
  { name: 'Inbox', icon: Inbox, filter: { status: 'OPEN' } },
  { name: 'In Progress', icon: Clock, filter: { status: 'IN_PROGRESS' } },
  { name: 'Order help requests', icon: FileText, filter: { isOrderRelated: true } },
  { name: 'High Priority', icon: AlertOctagon, filter: { priority: 'HIGH,URGENT' } },
  { name: 'Unread', icon: Inbox, filter: { unread: true } },
  { name: 'Resolved', icon: Archive, filter: { status: 'RESOLVED' } },
  { name: 'Closed', icon: Trash, filter: { status: 'CLOSED' } },
];

const statusOptions = [
  { value: 'OPEN', label: 'Open', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-500' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-500' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-400' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-400' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-500' },
];

const PrivateNoteSection = ({ note, onSave }: { note: string, onSave: (newNote: string) => void }) => {
    const [noteContent, setNoteContent] = useState(note);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    useEffect(() => {
        setNoteContent(note);
    }, [note]);

    const handleSave = () => {
        onSave(noteContent);
        setIsAccordionOpen(false); 
    };

    const handleCancel = () => {
        setNoteContent(note);
        setIsAccordionOpen(false);
    };

    return (
        <Accordion type="single" collapsible className="w-full" value={isAccordionOpen ? "item-1" : ""} onValueChange={(value) => setIsAccordionOpen(!!value)}>
            <AccordionItem value="item-1">
                <AccordionTrigger className="flex justify-between items-center w-full">
                    <span className="font-semibold text-sm">Private note</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="mt-2 space-y-2">
                        <Textarea
                            placeholder="Write a private note about a contact only you can see."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

const StatusBadge = ({ status }: { status: MessageThread['status'] }) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return null;
    
    return (
        <Badge variant="outline" className={cn("text-white border-0", statusConfig.color)}>
            {statusConfig.label}
        </Badge>
    );
};

const PriorityBadge = ({ priority }: { priority: MessageThread['priority'] }) => {
    const priorityConfig = priorityOptions.find(p => p.value === priority);
    if (!priorityConfig) return null;
    
    return (
        <Badge variant="outline" className={cn("text-white border-0", priorityConfig.color)}>
            {priorityConfig.label}
        </Badge>
    );
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
        return '1 day ago';
    } else {
        return `${Math.floor(diffInHours / 24)} days ago`;
    }
};

const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};


export default function MessagePage() {
    const { toast } = useToast();
    const api = useMessagingApi();
    
    // Real-time connection (disabled since authentication removed)
    const socket = useRealtime({
        enabled: false, // Disabled - no authentication
        role: 'admin',
        onNewMessage: (event) => {
            console.log('📨 Real-time message received:', event);

            // Use ref to avoid stale closure issues
            const currentViewing = viewingThreadRef.current;
            // Add new message to current messages if viewing the thread
            if (currentViewing && event.threadId === parseInt(currentViewing.id)) {
                const newMessage: ConversationMessage = {
                    id: event.id?.toString() || `temp_${Date.now()}`,
                    threadId: event.threadId.toString(),
                    content: event.content || '',
                    senderType: event.authorRole === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN',
                    senderName: event.authorName || 'Unknown',
                    senderEmail: event.authorEmail,
                    isRead: false,
                    createdAt: event.timestamp || new Date().toISOString(),
                    attachments: event.attachments || []
                };

                // Check for duplicates before adding
                setMessages(prev => {
                    const messageExists = prev.some(msg => msg.id === newMessage.id);
                    if (messageExists) {
                        console.log('Message already exists, skipping duplicate:', newMessage.id);
                        return prev;
                    }
                    console.log('Adding new message to UI:', newMessage.id);
                    return [...prev, newMessage];
                });

                // Update thread's last message info
                setViewingThread(prev => prev ? {
                    ...prev,
                    lastMessageAt: new Date().toISOString(),
                    lastMessagePreview: event.content?.substring(0, 100) || 'New message',
                    unreadCount: prev.unreadCount + 1
                } : null);
            }

            // Reload thread list to show updated thread info
            api.loadThreads(currentFilters);

            toast({
                title: 'New message received',
                description: `From ${event.authorName || 'Unknown'}: ${event.content?.substring(0, 50) || 'New message'}${event.content?.length > 50 ? '...' : ''}`,
            });
        },
        onThreadUpdate: (event) => {
            console.log('📝 Thread updated:', event);
            // Reload thread list to reflect updates
            api.loadThreads(currentFilters);
        },
        onPresenceChanged: (event) => {
            console.log('👤 Presence changed:', event);
        },
        onMessagesRead: (event) => {
            console.log('👁️ Messages read:', event);
        },
        onConnectionChange: (connected) => {
            // Using polling instead of real-time sockets
            console.log('Using polling for real-time updates');
        }
    });
    
    // Local state
    const [selectedFolder, setSelectedFolder] = useState('All');
    const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
    const [viewingThread, setViewingThread] = useState<MessageThread | null>(null);
    const viewingThreadRef = useRef<MessageThread | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFilters, setCurrentFilters] = useState<any>({});
    const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Quick Reply State
    const [isManageRepliesOpen, setIsManageRepliesOpen] = useState(false);
    const [isEditReplyOpen, setIsEditReplyOpen] = useState(false);
    const [replyToEdit, setReplyToEdit] = useState<ApiQuickReply | null>(null);
    const [replyToDelete, setReplyToDelete] = useState<ApiQuickReply | null>(null);

    // Delete Confirmation
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Auto-scroll to bottom when new messages arrive (only if user is already near bottom)
    useEffect(() => {
        // For ScrollArea, we need to find the actual scrollable element
        const scrollAreaElement = messagesEndRef.current?.closest('[data-radix-scroll-area-viewport]');
        const scrollContainer = scrollAreaElement || messagesEndRef.current?.parentElement;

        if (scrollContainer && messages.length > 0) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // Within 100px of bottom

            if (isNearBottom) {
                // Use setTimeout to ensure DOM has updated
                setTimeout(() => {
                    scrollToBottom();
                }, 0);
            }
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSelectThread = (id: string) => {
        setSelectedThreads(prev => 
            prev.includes(id) ? prev.filter(threadId => threadId !== id) : [...prev, id]
        );
    };
    
    const handleSelectAll = () => {
        if (selectedThreads.length === api.threads.length) {
            setSelectedThreads([]);
        } else {
            setSelectedThreads(api.threads.map(t => t.id));
        }
    };
    
    const handleViewThread = async (thread: MessageThread) => {
        setViewingThread(thread);
        viewingThreadRef.current = thread;
        const loadedMessages = await api.loadMessages(thread.id);
        // The API hook will update its internal state, but we also set local state
        setMessages(api.messages);
        if (thread.unreadCount > 0) {
            await api.markAsRead(thread.id);
        }

        // Join thread room for real-time updates
        socket.joinThread(parseInt(thread.id));

        // Scroll to bottom when loading thread
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    };
    
    const handleSaveNote = async (newNote: string) => {
        if (viewingThread) {
            await api.updateThread(viewingThread.id, { privateNote: newNote });
            setViewingThread({ ...viewingThread, privateNote: newNote });
        }
    };

    const handleSendReply = async () => {
        if (!viewingThread) return;

        const messageContent = replyTextareaRef.current?.value?.trim() || '';
        if (!messageContent) return;

        // Clear the textarea
        if (replyTextareaRef.current) {
            replyTextareaRef.current.value = '';
        }
        setReplyAttachments([]);

        try {
            // Send message via socket (same as typing indicators)
            await socket.sendMessage(parseInt(viewingThread.id), messageContent, replyAttachments);

            // Mark messages as read
            const messageIds = messages.map(msg => parseInt(msg.id)).filter(id => !isNaN(id));
            if (messageIds.length > 0) {
                socket.markAsRead(parseInt(viewingThread.id), messageIds);
            }

            // Fallback: reload messages to ensure UI updates (since real-time may not work)
            await api.loadMessages(viewingThread.id);
            setMessages(api.messages);

            // The real-time broadcast should also update the UI automatically
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore the message content on error
            if (replyTextareaRef.current) {
                replyTextareaRef.current.value = messageContent;
            }
            toast({
                variant: 'destructive',
                title: 'Failed to send message',
                description: error instanceof Error ? error.message : 'An error occurred while sending the message.',
            });
        }
    };

    const handleQuickReply = (reply: ApiQuickReply) => {
        if (replyTextareaRef.current) {
            replyTextareaRef.current.value = reply.content;
            replyTextareaRef.current.focus();
        }
    };

    const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const handleOpenEditReplyDialog = (reply: ApiQuickReply | null) => {
        setReplyToEdit(reply);
        setIsEditReplyOpen(true);
    };

    const handleSaveQuickReply = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const replyData = {
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            category: formData.get('category') as string || 'general',
            isActive: true,
        };

        try {
            if (replyToEdit) {
                await api.updateQuickReply(replyToEdit.id, replyData);
            } else {
                await api.createQuickReply(replyData);
            }
            setIsEditReplyOpen(false);
            setReplyToEdit(null);
        } catch (error) {
            // Error handled by the hook
        }
    };
    
    const handleDeleteQuickReply = async () => {
        if (replyToDelete) {
            try {
                await api.deleteQuickReply(replyToDelete.id);
                setReplyToDelete(null);
            } catch (error) {
                // Error handled by the hook
            }
        }
    };

    const handleThreadAction = async (action: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' | 'OPEN' | 'DELETE') => {
        if (selectedThreads.length === 0) {
            toast({ variant: 'destructive', title: 'No threads selected.' });
            return;
        }

        try {
            if (action === 'DELETE') {
                await api.bulkDeleteThreads(selectedThreads);
                setIsDeleteDialogOpen(false);
            } else {
                await api.bulkUpdateThreads(selectedThreads, { status: action });
            }
            setSelectedThreads([]);
        } catch (error) {
            // Error handled by the hook
        }
    };

    const handleStatusChange = async (threadId: string, status: MessageThread['status']) => {
        await api.updateThreadStatus(threadId, status);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setReplyAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index: number) => {
        setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const isAllSelected = api.threads.length > 0 && selectedThreads.length === api.threads.length;
    const isSomeSelected = selectedThreads.length > 0 && selectedThreads.length < api.threads.length;

    const MessageListView = () => (
        <div className="col-span-1 flex flex-col h-full">
            <div className="p-2 px-4 border-b flex flex-col sm:flex-row items-center justify-between gap-2 flex-wrap">
                <div className='flex items-center gap-4 flex-wrap'>
                   <Checkbox 
                        id="select-all-threads" 
                        onCheckedChange={handleSelectAll}
                        checked={isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)}
                        aria-label="Select all threads"
                   />
                    <div className="flex items-center gap-2 flex-wrap">
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('RESOLVED')}>Resolve</Button>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('CLOSED')}>Close</Button>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('IN_PROGRESS')}>In Progress</Button>
                       <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>Delete</Button>
                       
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    More <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleThreadAction('OPEN')}>
                                    Reopen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Tag className="mr-2 h-4 w-4" />
                                    Add Label
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    Assign Admin
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                 <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search threads..." 
                        className="pl-9 h-9" 
                        value={searchQuery} 
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
             <div className="flex-1 overflow-y-auto">
                {api.loading && (
                    <div className="p-4 text-center text-muted-foreground">
                        Loading threads...
                    </div>
                )}
                
                {!api.loading && api.threads.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                        No threads found.
                    </div>
                )}

                <ul>
                    {api.threads.map(thread => (
                        <li key={thread.id} className={cn(
                            "flex items-center gap-4 px-4 py-3 border-b cursor-pointer hover:bg-muted/50",
                            thread.unreadCount > 0 && 'bg-blue-50/50 dark:bg-blue-900/10'
                        )} onClick={() => handleViewThread(thread)}>
                            <div className="px-4 hidden sm:block" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  id={`select-${thread.id}`} 
                                  checked={selectedThreads.includes(thread.id)} 
                                  onCheckedChange={() => handleSelectThread(thread.id)}
                                />
                            </div>
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(thread.customerName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] items-baseline gap-4 min-w-0">
                                <div className="space-y-1">
                                    <p className={cn("font-semibold truncate", thread.unreadCount > 0 && 'text-primary')}>
                                        {thread.customerName}
                                    </p>
                                    <div className="flex gap-1">
                                        <StatusBadge status={thread.status} />
                                        <PriorityBadge priority={thread.priority} />
                                        {thread.isOrderRelated && (
                                            <Badge variant="outline" className="text-xs">
                                                Order
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium truncate">{thread.subject}</p>
                                    <p className="text-xs text-muted-foreground truncate">{thread.lastMessagePreview}</p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right w-24 hidden sm:block space-y-1">
                                <div>{formatDate(thread.lastMessageAt)}</div>
                                {thread.unreadCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {thread.unreadCount}
                                    </Badge>
                                )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hidden sm:flex">
                                  <Reply className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reply</TooltipContent>
                            </Tooltip>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
    
    const MessageDetailView = ({ thread }: { thread: MessageThread }) => (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] h-full">
            <div className="col-span-1 flex flex-col h-full bg-background border-r">
                <header className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                     <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setViewingThread(null)}>
                            <ChevronLeft className="h-4 w-4"/>
                        </Button>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-lg truncate">{thread.customerName}</h2>
                            <p className="text-sm text-muted-foreground truncate">{thread.customerEmail}</p>
                        </div>
                     </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Connection Status Indicator */}
                        <div className="flex items-center gap-1 text-xs">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                "bg-green-500" // Always show as connected since we're using polling
                            )}></div>
                            <span className="text-muted-foreground hidden sm:inline">
                                Live Updates
                            </span>
                        </div>
                        
                       <Select value={thread.status} onValueChange={(value: MessageThread['status']) => handleStatusChange(thread.id, value)}>
                           <SelectTrigger className="w-32">
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                               {statusOptions.map(status => (
                                   <SelectItem key={status.value} value={status.value}>
                                       {status.label}
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                       <Button variant="ghost" size="sm" onClick={() => handleThreadAction('DELETE')}>Delete</Button>
                    </div>
                </header>
                <ScrollArea className="flex-1 p-4 space-y-6">
                    <div className="text-center text-sm text-muted-foreground py-2 mb-4 bg-muted/50 rounded-lg">
                        Thread started {formatDate(thread.createdAt)}
                    </div>
                    {api.loading && (
                        <div className="text-center text-muted-foreground py-8">
                            <div className="animate-pulse">Loading messages...</div>
                        </div>
                    )}
                    {!api.loading && messages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground">
                                <MessageSquare className="mx-auto mb-4 w-16 h-16 text-muted-foreground/50" />
                                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                                <p className="max-w-md">
                                    This conversation hasn't started yet. Send the first message to begin the chat.
                                </p>
                            </div>
                        </div>
                    )}
                    {messages.length > 0 && (
                        <div className="space-y-6">
                            {messages.map((message: ConversationMessage) => (
                                <div key={message.id} className={cn(
                                    "flex gap-3",
                                    message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'
                                )}>
                                    {message.senderType === 'CUSTOMER' && (
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className={cn(
                                                'bg-muted'
                                            )}>
                                                {getInitials(message.senderName)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className={cn(
                                        "flex flex-col max-w-[75%]",
                                        message.senderType === 'ADMIN' ? 'items-end' : 'items-start'
                                    )}>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <span className="font-medium">{message.senderName}</span>
                                            <span>{formatDate(message.createdAt)}</span>
                                            {message.senderType === 'ADMIN' && (
                                                <Badge variant="secondary" className="text-xs">Admin</Badge>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "p-4 rounded-lg border shadow-sm",
                                            message.senderType === 'ADMIN' 
                                                ? 'bg-primary/5 border-primary/20 ml-4' 
                                                : 'bg-background border-border'
                                        )}>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                                            {message.attachments.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {message.attachments.map(attachment => (
                                                        <div key={attachment.id} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                            <a 
                                                                href={attachment.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline flex-1 truncate"
                                                            >
                                                                {attachment.originalName}
                                                            </a>
                                                            <span className="text-muted-foreground text-xs">
                                                                ({Math.round(attachment.size / 1024)}KB)
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {message.senderType === 'ADMIN' && (
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className={cn(
                                                'bg-primary text-primary-foreground'
                                            )}>
                                                A
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
                
                <footer className="p-4 border-t bg-background">
                    <div className="text-xs text-muted-foreground mb-3 px-1">
                        We scan and review messages for fraud prevention, policy enforcement, security, to provide support, and for similar purposes. <a href="#" className="underline hover:text-foreground">Learn more.</a>
                    </div>
                     <div className="relative">
                        <Textarea 
                            ref={replyTextareaRef}
                            placeholder="Type your reply (Enter to send, Shift+Enter for new line)" 
                            className="pr-12 min-h-[80px] resize-none border-border focus:border-primary"
                            onKeyDown={handleReplyKeyDown}
                        />
                         <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            id="file-upload"
                            onChange={handleFileUpload}
                        />
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-2 bottom-2 h-8 w-8 hover:bg-muted"
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {replyAttachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {replyAttachments.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm bg-muted p-3 rounded-lg border">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => removeAttachment(index)}
                                        className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-4">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium">Quick replies</span>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setIsManageRepliesOpen(true)}>View all | Edit</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {api.quickReplies.slice(0,6).map(reply => (
                                <Button 
                                    key={reply.id} 
                                    variant="outline" 
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleQuickReply(reply)}
                                >
                                    {reply.title}
                                </Button>
                            ))}
                            <div className="flex-grow"></div>
                            <Button 
                                onClick={handleSendReply} 
                                disabled={!replyTextareaRef.current?.value?.trim() || api.loading}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Send
                            </Button>
                        </div>
                    </div>
                </footer>
            </div>
            <aside className="col-span-1 hidden md:flex flex-col h-full bg-muted/50 p-4 space-y-4">
                 <div className="flex items-center gap-3">
                     <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(thread.customerName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{thread.customerName}</p>
                        <p className="text-xs text-muted-foreground">{thread.customerEmail}</p>
                        {thread.totalPurchased && (
                            <p className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                                Customer: {thread.totalPurchased}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Thread Details</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <StatusBadge status={thread.status} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Priority:</span>
                            <PriorityBadge priority={thread.priority} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span>{formatDate(thread.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Updated:</span>
                            <span>{formatDate(thread.updatedAt)}</span>
                        </div>
                        {thread.orderId && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order:</span>
                                <span className="text-blue-600">#{thread.orderId}</span>
                            </div>
                        )}
                        {thread.assignedAdmin && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Assigned:</span>
                                <span>{thread.assignedAdmin}</span>
                            </div>
                        )}
                    </div>
                </div>

                {thread.labels.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Labels</h4>
                        <div className="flex flex-wrap gap-1">
                            {thread.labels.map(label => (
                                <Badge 
                                    key={label.id} 
                                    variant="outline" 
                                    style={{ backgroundColor: label.color, color: 'white', borderColor: label.color }}
                                >
                                    {label.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <PrivateNoteSection note={thread.privateNote || ''} onSave={handleSaveNote} />
            </aside>
        </div>
    );


    return (
        <>
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold">Messages</h1>
                    <Link href="/">
                        <Button variant="outline" className="gap-2">
                            <Home className="h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </Link>
                </div>
                <Card className={cn("flex-1 grid h-full overflow-hidden", viewingThread ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[240px_1fr]")}>
                    {/* Folders Sidebar */}
                    <div className={cn("col-span-1 border-r flex-col h-full bg-muted/50", viewingThread ? "hidden" : "hidden md:flex")}>
                        <nav className="flex-1 px-2 py-2 space-y-1">
                            {folders.map(folder => (
                                <Button 
                                    key={folder.name}
                                    variant={selectedFolder === folder.name ? 'secondary' : 'ghost'} 
                                    className="w-full justify-start gap-3"
                                    onClick={() => setSelectedFolder(folder.name)}
                                >
                                    <folder.icon className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">{folder.name}</span>
                                </Button>
                            ))}
                        </nav>
                    </div>
                    
                    {viewingThread ? <MessageDetailView thread={viewingThread} /> : <MessageListView />}

                </Card>
            </div>

            {/* Manage Quick Replies Dialog */}
            <Dialog open={isManageRepliesOpen} onOpenChange={setIsManageRepliesOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage quick replies</DialogTitle>
                        <div className="flex items-center justify-between">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        Add new <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleOpenEditReplyDialog(null)}>Add new reply</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </DialogHeader>
                    <div className="py-4 pr-2">
                        <ScrollArea className="h-96">
                            <div className="space-y-6 pr-4">
                                {api.quickReplies.map((reply) => (
                                    <div key={reply.id}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-baseline gap-2">
                                                <h4 className="font-semibold">{reply.title}</h4>
                                                <span className="text-xs text-muted-foreground">{reply.usageCount} uses</span>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleOpenEditReplyDialog(reply)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setReplyToDelete(reply)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="p-3 rounded-md border bg-muted/50 space-y-1">
                                            <p className="font-medium text-sm">{reply.category}</p>
                                            <p className="text-sm text-muted-foreground">{reply.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsManageRepliesOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit/Add Quick Reply Dialog */}
            <Dialog open={isEditReplyOpen} onOpenChange={setIsEditReplyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{replyToEdit ? 'Edit quick reply' : 'Add new quick reply'}</DialogTitle>
                    </DialogHeader>
                    <form id="quick-reply-form" onSubmit={handleSaveQuickReply}>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reply-title">Title</Label>
                                <Input id="reply-title" name="title" defaultValue={replyToEdit?.title} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reply-category">Category</Label>
                                <Input id="reply-category" name="category" defaultValue={replyToEdit?.category} placeholder="e.g. general, orders, support" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reply-content">Message</Label>
                                <Textarea id="reply-content" name="content" defaultValue={replyToEdit?.content} required />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditReplyOpen(false)}>Cancel</Button>
                        <Button type="submit" form="quick-reply-form">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Quick Reply Alert */}
            <AlertDialog open={!!replyToDelete} onOpenChange={() => setReplyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the quick reply titled "{replyToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteQuickReply}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Delete Threads Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the selected threads.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleThreadAction('DELETE')}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
