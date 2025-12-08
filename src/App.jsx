import React, { useState, useEffect } from 'react';
import { participants } from './data/participants';
import { MapPin, Clock, X, Gift, ExternalLink, Image as ImageIcon, Plus, Trash2, ArrowUp, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

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

    if (!timeLeft) {
        const now = new Date();
        const isChristmasDay = now.getMonth() === 11 && now.getDate() === 25;
        const message = isChristmasDay 
            ? '🎄 Feliz Natal! 🎄' 
            : '🎄 Preparação para o Natal! 🎄';
        const subMessage = isChristmasDay
            ? 'Que este Natal seja cheio de alegria e presentes!'
            : 'Os efeitos especiais começaram! Faltam poucos dias para o grande dia!';
        
        return (
            <div className="countdown-finished">
                <h2>{message}</h2>
                <p>{subMessage}</p>
            </div>
        );
    }

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

// --- Food Wall Component ---
function FoodWall() {
    const [foodItems, setFoodItems] = useState({
        salgados: [],
        doces: [],
        bebidas: []
    });

    const [newFood, setNewFood] = useState({ category: 'salgados', name: '', person: '' });
    const [activeInput, setActiveInput] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Carregar dados do Supabase ao montar o componente
    useEffect(() => {
        loadFoodItems();
        
        // Subscribe para atualizações em tempo real
        const subscription = supabase
            .channel('food_items_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'food_items' },
                () => {
                    loadFoodItems();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadFoodItems = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { data, error: fetchError } = await supabase
                .from('food_items')
                .select('*')
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Organizar por categoria
            const organized = {
                salgados: [],
                doces: [],
                bebidas: []
            };

            data?.forEach(item => {
                if (organized[item.category]) {
                    organized[item.category].push({
                        id: item.id,
                        name: item.name,
                        person: item.person
                    });
                }
            });

            setFoodItems(organized);
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            setError('Erro ao conectar ao banco de dados');
        } finally {
            setLoading(false);
        }
    };

    const addFood = async (category) => {
        if (!newFood.name.trim() || !newFood.person.trim()) {
            setError('Preencha todos os campos!');
            return;
        }

        try {
            setError(null);
            const { error: insertError } = await supabase
                .from('food_items')
                .insert([
                    {
                        category: category,
                        name: newFood.name,
                        person: newFood.person
                    }
                ]);

            if (insertError) throw insertError;

            setNewFood({ category: 'salgados', name: '', person: '' });
            setActiveInput(null);
            await loadFoodItems();
        } catch (err) {
            console.error('Erro ao adicionar:', err);
            setError('Erro ao salvar item');
        }
    };

    const removeFood = async (category, id) => {
        try {
            setError(null);
            const { error: deleteError } = await supabase
                .from('food_items')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            await loadFoodItems();
        } catch (err) {
            console.error('Erro ao remover:', err);
            setError('Erro ao remover item');
        }
    };

    const renderCategory = (title, categoryKey) => (
        <div className="food-category">
            <h3 className="food-cat-title">{title}</h3>
            <ul className="food-list">
                {foodItems[categoryKey]?.map(item => (
                    <li key={item.id} className="food-item">
                        <div className="food-item-content">
                            <span className="food-item-name">• {item.name}</span>
                            <span className="food-item-person">({item.person})</span>
                        </div>
                        <button
                            onClick={() => removeFood(categoryKey, item.id)}
                            className="food-item-delete"
                            title="Remover"
                            disabled={loading}
                        >
                            <Trash2 size={14} />
                        </button>
                    </li>
                ))}
                <li className="food-item-add">
                    {activeInput === categoryKey ? (
                        <div className="food-input-group">
                            <input
                                type="text"
                                placeholder="Item"
                                value={newFood.name}
                                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                                className="food-input"
                                disabled={loading}
                            />
                            <input
                                type="text"
                                placeholder="Quem vai trazer?"
                                value={newFood.person}
                                onChange={(e) => setNewFood({ ...newFood, person: e.target.value })}
                                className="food-input"
                                disabled={loading}
                            />
                            <button
                                onClick={() => addFood(categoryKey)}
                                className="food-add-btn"
                                disabled={loading}
                            >
                                ✓
                            </button>
                            <button
                                onClick={() => setActiveInput(null)}
                                className="food-cancel-btn"
                                disabled={loading}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setActiveInput(categoryKey);
                                setNewFood({ ...newFood, category: categoryKey });
                            }}
                            className="food-add-link"
                            disabled={loading}
                        >
                            <Plus size={14} /> Adicionar
                        </button>
                    )}
                </li>
            </ul>
        </div>
    );

    return (
        <div className="food-wall">
            <h2 className="food-title">✦ Mural da Ceia ✦</h2>
            
            {error && (
                <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {!error && (
                <>
                    {loading ? (
                        <div className="loading-state">
                            <p>⏳ Carregando itens...</p>
                        </div>
                    ) : (
                        <div className="food-grid">
                            {renderCategory('Salgados', 'salgados')}
                            {renderCategory('Doces', 'doces')}
                            {renderCategory('Bebidas', 'bebidas')}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// --- Back to Top Component ---
function BackToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShow(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!show) return null;

    return (
        <button className="back-to-top" onClick={scrollTop} title="Voltar ao topo">
            <ArrowUp size={20} />
        </button>
    );
}

// --- Christmas Special Effects Component ---
function ChristmasEffects() {
    const [isChristmas, setIsChristmas] = useState(false);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);

    useEffect(() => {
        const now = new Date();
        const isChristmasSeasonStart = now.getMonth() === 11 && now.getDate() >= 15;
        setIsChristmas(isChristmasSeasonStart);

        if (isChristmasSeasonStart && !hasPlayedSound) {
            // Play bell sound
            playBellSound();
            setHasPlayedSound(true);
        }
    }, [hasPlayedSound]);

    const playBellSound = () => {
        // Create bell sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;

        for (let i = 0; i < 3; i++) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(800 - i * 100, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            
            osc.start(now + i * 0.2);
            osc.stop(now + 0.5 + i * 0.2);
        }
    };

    if (!isChristmas) return null;

    return (
        <>
            {/* Snowflakes */}
            <div className="snowflakes-container">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={`snow-${i}`}
                        className="snowflake"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 10}s`,
                            animationDuration: `${10 + Math.random() * 5}s`,
                            fontSize: `${10 + Math.random() * 20}px`,
                        }}
                    >
                        ❄️
                    </div>
                ))}
            </div>

            {/* Confetti */}
            <div className="confetti-container">
                {Array.from({ length: 100 }).map((_, i) => (
                    <div
                        key={`confetti-${i}`}
                        className="confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            backgroundColor: ['#ffd700', '#ff69b4', '#00bfff', '#98fb98', '#ff6347'][
                                Math.floor(Math.random() * 5)
                            ],
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Christmas Background Overlay */}
            <style>{`
                @keyframes fall {
                    0% {
                        top: -10vh;
                        opacity: 1;
                    }
                    100% {
                        top: 100vh;
                        opacity: 0;
                    }
                }

                @keyframes confetti-fall {
                    0% {
                        top: -10px;
                        opacity: 1;
                        transform: rotate(0deg) translateX(0);
                    }
                    100% {
                        top: 100vh;
                        opacity: 0;
                        transform: rotate(720deg) translateX(100px);
                    }
                }

                .snowflakes-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 10;
                }

                .snowflake {
                    position: absolute;
                    top: -10vh;
                    opacity: 0.7;
                    animation: fall linear infinite;
                }

                .confetti-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 10;
                }

                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    top: -10px;
                    border-radius: 50%;
                    animation: confetti-fall ease-in infinite;
                }
            `}</style>
        </>
    );
}

export default function App() {
    const [selectedId, setSelectedId] = useState(null);
    const [showLinksInfo, setShowLinksInfo] = useState(null);
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
                <h1 className="title">Amigo Secreto - Natal 2025</h1>

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
            <FoodWall />

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
                                style={{ width: '180px', height: '180px', marginBottom: '15px', border: '4px solid #ffd700' }}
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
                                            <div style={{ color: '#ffd700', flexShrink: 0 }}>
                                                {gift.type === 'link' && <ExternalLink size={20} />}
                                                {gift.type === 'image' && <ImageIcon size={20} />}
                                                {gift.type === 'text' && <Gift size={20} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                {gift.type === 'link' ? (
                                                    <a 
                                                        href={gift.content} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="gift-link"
                                                    >
                                                        {gift.description}
                                                    </a>
                                                ) : (
                                                    <p style={{ color: '#fff', fontSize: '0.95rem' }}>{gift.content}</p>
                                                )}
                                                {gift.description && gift.type !== 'link' && <p style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '4px' }}>{gift.description}</p>}
                                                {gift.type === 'image' && (
                                                    <img src={gift.content} alt={gift.description} style={{ width: '100%', borderRadius: '8px', marginTop: '10px', maxHeight: '150px', objectFit: 'cover' }} />
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

            <BackToTop />
            <ChristmasEffects />
        </div>
    );
}
