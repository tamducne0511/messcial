import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceCallModal({ 
    isOpen, 
    callStatus, 
    remoteUser, 
    onAccept, 
    onReject, 
    onEnd, 
    onToggleMute,
    isMuted,
    localAudioRef,
    remoteAudioRef
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                            {remoteUser?.displayName?.[0] || 'U'}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {remoteUser?.displayName || 'Người dùng'}
                    </h3>
                    <p className="text-gray-500 mt-2">
                        {callStatus === 'calling' && 'Đang gọi...'}
                        {callStatus === 'ringing' && 'Đang rung chuông...'}
                        {callStatus === 'connected' && 'Đang kết nối'}
                        {callStatus === 'ended' && 'Cuộc gọi đã kết thúc'}
                    </p>
                </div>

                {/* Audio elements (ẩn) */}
                <audio ref={localAudioRef} autoPlay muted />
                <audio ref={remoteAudioRef} autoPlay />

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-4">
                    {callStatus === 'ringing' ? (
                        <>
                            <Button
                                onClick={onAccept}
                                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                            >
                                <Phone className="w-6 h-6 text-white" />
                            </Button>
                            <Button
                                onClick={onReject}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                            >
                                <PhoneOff className="w-6 h-6 text-white" />
                            </Button>
                        </>
                    ) : callStatus === 'connected' ? (
                        <>
                            <Button
                                onClick={onToggleMute}
                                className={`w-16 h-16 rounded-full ${
                                    isMuted ? 'bg-gray-500' : 'bg-blue-500'
                                } hover:opacity-80`}
                            >
                                {isMuted ? (
                                    <MicOff className="w-6 h-6 text-white" />
                                ) : (
                                    <Mic className="w-6 h-6 text-white" />
                                )}
                            </Button>
                            <Button
                                onClick={onEnd}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                            >
                                <PhoneOff className="w-6 h-6 text-white" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onEnd}
                            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                        >
                            <X className="w-6 h-6 text-white" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}