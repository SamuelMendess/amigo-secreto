import React, { useState, useEffect } from 'react';
import { participants } from './data/participants';
import { MapPin, Clock, X, Gift, ExternalLink, Image as ImageIcon } from 'lucide-react';

// --- Countdown Component ---
function Countdown() {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const target = new Date('2025-12-25T00:01:00');
        const now = new Date();
        const difference = target - now;

        if (difference <= 0) return null;

        return {
            d: Math.floor(difference / (1000 * 60 * 60 * 24)),
            h: Math.floor((difference / (1000 * 60 * 60)) % 24),
            m: Math.floor((difference / 1000 / 60) % 60),
            s: Math.floor((difference / 1000) % 60)
        };
    }

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) return <div className="countdown-val">Feliz Natal!</div>;

    return (
        <div className="countdown-box">
            <div className="countdown-item">
                <div className="countdown-val">{timeLeft.d}</div>
                <div className="countdown-label">Dias</div>
            </div>
            <div className="countdown-item">
                <div className="countdown-val">{timeLeft.h}</div>
                <div className="countdown-label">Hrs</div>
            </div>
            <div className="countdown-item">
                <div className="countdown-val">{timeLeft.m}</div>
                <div className="countdown-label">Min</div>
            </div>
            <div className="countdown-item">
                <div className="countdown-val">{timeLeft.s}</div>
                <div className="countdown-label">Seg</div>
            </div>
        </div>
    );
}

export default function App() {
    const [selectedId, setSelectedId] = useState(null);
    const selectedParticipant = participants.find(p => p.id === selectedId);

    // Prevent scroll when modal is open
    useEffect(() => {
        if (selectedId) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [selectedId]);

    return (
        <div className="container">
            {/* 1. Header Section */}
            <header>
                <h1 className="title">Amigo Secreto</h1>

                <div className="event-details">
                    <Clock size={14} className="text-[#ffd700]" />
                    <span>Tom & Lica • 24 Dez • 20h</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', opacity: 0.7 }}>
                    <MapPin size={14} /> Rua Fuy Faleiro 46, 4 Dto
                </div>

                <Countdown />
            </header>

            {/* 2. Main Participant Grid */}
            <div className="grid">
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="card"
                        onClick={() => setSelectedId(participant.id)}
                    >
                        <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="avatar"
                        />
                        <h2 className="name">{participant.name}</h2>
                        <span className="action-btn">Ver Lista</span>
                    </div>
                ))}
            </div>

            {/* 3. Food Wall */}
            <div className="food-wall">
                <h2 className="food-title">✦ Mural da Ceia ✦</h2>
                <div className="food-grid">
                    <div className="food-category">
                        <h3 className="food-cat-title">Salgados</h3>
                        <ul className="food-list">
                            <li>• Torta de Frango (Ana)</li>
                            <li>• Empadinhas (Bruno)</li>
                            <li style={{ fontStyle: 'italic', opacity: 0.5, marginTop: '8px' }}>+ Sugerir</li>
                        </ul>
                    </div>
                    <div className="food-category">
                        <h3 className="food-cat-title">Doces</h3>
                        <ul className="food-list">
                            <li>• Pudim (Carla)</li>
                            <li>• Mousse (Daniel)</li>
                            <li style={{ fontStyle: 'italic', opacity: 0.5, marginTop: '8px' }}>+ Sugerir</li>
                        </ul>
                    </div>
                    <div className="food-category">
                        <h3 className="food-cat-title">Bebidas</h3>
                        <ul className="food-list">
                            <li>• Refrigerante (Elena)</li>
                            <li>• Vinho (Felipe)</li>
                            <li style={{ fontStyle: 'italic', opacity: 0.5, marginTop: '8px' }}>+ Sugerir</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 4. Details Modal */}
            {selectedId && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button onClick={() => setSelectedId(null)} className="close-btn"><X size={18} /></button>
                            <img
                                src={selectedParticipant.avatar}
                                alt={selectedParticipant.name}
                                className="avatar"
                                style={{ width: '90px', height: '90px', marginBottom: '15px' }}
                            />
                            <h2 className="name" style={{ fontSize: '1.5rem', marginBottom: '0' }}>{selectedParticipant.name}</h2>
                        </div>

                        <div className="modal-body custom-scrollbar">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#ffd700' }}>
                                    Lista de Desejos
                                </span>
                            </div>

                            {selectedParticipant.gifts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {selectedParticipant.gifts.map(gift => (
                                        <div key={gift.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', display: 'flex', gap: '15px', textAlign: 'left' }}>
                                            <div style={{ color: '#ffd700' }}>
                                                {gift.type === 'link' && <ExternalLink size={20} />}
                                                {gift.type === 'image' && <ImageIcon size={20} />}
                                                {gift.type === 'text' && <Gift size={20} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: '#fff', fontSize: '0.95rem' }}>{gift.content}</p>
                                                {gift.description && <p style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '4px' }}>{gift.description}</p>}
                                                {gift.type === 'image' && (
                                                    <img src={gift.content} style={{ width: '100%', borderRadius: '8px', marginTop: '10px', maxHeight: '150px', objectFit: 'cover' }} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                                    <Gift size={40} style={{ marginBottom: '10px' }} />
                                    <p>Nenhuma sugestão cadastrada.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
