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

// --- Expense Calculator Component ---
function ExpenseCalculator() {
    const [expenses, setExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ selectedPerson: '', foodItem: '', amount: '', image: null, imagePreview: null });
    const [totalPeople] = useState(10);
    const [foodItemsByPerson, setFoodItemsByPerson] = useState({});
    const [isAfterEvent, setIsAfterEvent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Verificar se é após 25 de dezembro às 18h
    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const eventTime = new Date('2025-12-25T18:00:00');
            setIsAfterEvent(now >= eventTime);
        };
        
        checkTime();
        const interval = setInterval(checkTime, 60000); // Verificar a cada minuto
        return () => clearInterval(interval);
    }, []);

    // Carregar itens de comida e gastos do Supabase
    useEffect(() => {
        const loadFoodItemsForCalculator = async () => {
            const { data, error } = await supabase
                .from('food_items')
                .select('*')
                .order('created_at', { ascending: true });

            if (!error && data) {
                const itemsByPerson = {};
                data.forEach(item => {
                    if (item.person) {
                        itemsByPerson[item.person] = item.name;
                    }
                });
                setFoodItemsByPerson(itemsByPerson);
            }
        };

        const loadExpenses = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setExpenses(data);
            }
            setIsLoading(false);
        };

        loadFoodItemsForCalculator();
        loadExpenses();

        // Subscribe para atualizações em tempo real de comida
        const foodSubscription = supabase
            .channel('food_items_calculator')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'food_items' },
                () => {
                    loadFoodItemsForCalculator();
                }
            )
            .subscribe();

        // Subscribe para atualizações em tempo real de gastos
        const expenseSubscription = supabase
            .channel('expenses_calculator')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'expenses' },
                () => {
                    loadExpenses();
                }
            )
            .subscribe();

        return () => {
            foodSubscription.unsubscribe();
            expenseSubscription.unsubscribe();
        };
    }, []);

    const selectedPerson = newExpense.selectedPerson ? participants.find(p => p.name === newExpense.selectedPerson) : null;
    
    // Quando seleciona uma pessoa, preencha automaticamente com o item do Mural
    const handlePersonSelect = (personName) => {
        setNewExpense({
            ...newExpense,
            selectedPerson: personName,
            foodItem: foodItemsByPerson[personName] || ''
        });
    };

    const addExpense = async () => {
        if (newExpense.selectedPerson && newExpense.foodItem && newExpense.amount) {
            try {
                let imagePath = null;

                // Se tiver imagem, fazer upload para Supabase Storage
                if (newExpense.image) {
                    const fileExt = newExpense.image.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('expense-receipts')
                        .upload(`public/${fileName}`, newExpense.image);

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('expense-receipts')
                            .getPublicUrl(`public/${fileName}`);
                        imagePath = publicUrl;
                    }
                }

                // Inserir gasto no Supabase
                const { data, error } = await supabase
                    .from('expenses')
                    .insert([
                        {
                            name: newExpense.selectedPerson,
                            amount: parseFloat(newExpense.amount),
                            food_item: newExpense.foodItem,
                            image_url: imagePath,
                            created_at: new Date().toISOString()
                        }
                    ])
                    .select();

                if (!error && data) {
                    setNewExpense({ selectedPerson: '', foodItem: '', amount: '', image: null, imagePreview: null });
                }
            } catch (err) {
                console.error('Erro ao adicionar gasto:', err);
            }
        }
    };

    const deleteExpense = async (id) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (!error) {
                setExpenses(expenses.filter(e => e.id !== id));
            }
        } catch (err) {
            console.error('Erro ao deletar gasto:', err);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setNewExpense({ ...newExpense, image: file, imagePreview: event.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Calcular totais e divisão
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const averagePerPerson = totalSpent / totalPeople;
    
    // Calcular saldos (quanto acima ou abaixo da média)
    const balances = {};
    
    // Inicializar todas as 10 pessoas com saldo 0
    participants.forEach(person => {
        balances[person.name] = 0;
    });
    
    expenses.forEach(exp => {
        if (!balances[exp.name]) balances[exp.name] = 0;
        balances[exp.name] += exp.amount;
    });

    // Calcular saldos (quanto acima ou abaixo da média)
    const settlements = Object.entries(balances).map(([name, spent]) => ({
        name,
        spent,
        balance: spent - averagePerPerson
    }));

    // Função para calcular quem paga para quem (algoritmo de acerto de contas)
    const calculateTransfers = () => {
        // Criar cópias dos saldos para trabalhar
        const debtors = settlements.filter(s => s.balance < -0.01).map(s => ({ ...s })).sort((a, b) => a.balance - b.balance);
        const creditors = settlements.filter(s => s.balance > 0.01).map(s => ({ ...s })).sort((a, b) => b.balance - a.balance);
        
        const transfers = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

            transfers.push({
                from: debtor.name,
                to: creditor.name,
                amount: parseFloat(amount.toFixed(2))
            });

            debtor.balance = parseFloat((debtor.balance + amount).toFixed(2));
            creditor.balance = parseFloat((creditor.balance - amount).toFixed(2));

            if (Math.abs(debtor.balance) < 0.01) i++;
            if (creditor.balance < 0.01) j++;
        }

        return transfers;
    };

    const transfers = expenses.length > 0 ? calculateTransfers() : [];

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '20px', fontSize: '1.8rem' }}>💰 Calculadora de Gastos</h2>

            {!isAfterEvent && (
                <div style={{ background: 'rgba(255,215,0,0.15)', border: '2px solid #ffd700', borderRadius: '12px', padding: '20px', marginBottom: '30px', textAlign: 'center' }}>
                    <p style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>📝 Alimentando os dados...</p>
                    <p style={{ color: '#fff', margin: '0 0 15px 0' }}>Os cálculos de quem deve pagar/receber serão mostrados a partir de 25 de dezembro às 18h.</p>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0' }}>Todos os gastos registrados aqui serão considerados no acerto de contas! 💰</p>
                </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '2px solid rgba(255,215,0,0.2)' }}>
                <h3 style={{ color: '#fff', marginBottom: '15px' }}>Adicionar Gasto</h3>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <select
                        value={newExpense.selectedPerson}
                        onChange={(e) => handlePersonSelect(e.target.value)}
                        style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                        <option value="" style={{ background: '#2a0a10', color: '#fff' }}>Selecione uma pessoa...</option>
                        {participants.map(person => (
                            <option key={person.id} value={person.name} style={{ background: '#2a0a10', color: '#fff' }}>
                                {person.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="O que vai levar? (ex: Pudim, Mousse)"
                        value={newExpense.foodItem}
                        onChange={(e) => setNewExpense({ ...newExpense, foodItem: e.target.value })}
                        style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        placeholder="Valor (€)"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        step="0.01"
                        style={{ flex: 1, minWidth: '120px', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                        📸 Fatura (Opcional)
                    </label>
                    {newExpense.imagePreview && (
                        <span style={{ color: '#90EE90', fontSize: '0.9rem' }}>✓ Imagem selecionada</span>
                    )}
                </div>

                {newExpense.imagePreview && (
                    <img 
                        src={newExpense.imagePreview} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', marginBottom: '15px', objectFit: 'cover' }}
                    />
                )}

                <button
                    onClick={addExpense}
                    disabled={!newExpense.selectedPerson || !newExpense.foodItem || !newExpense.amount}
                    style={{
                        background: newExpense.selectedPerson && newExpense.foodItem && newExpense.amount ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : 'rgba(255,215,0,0.3)',
                        color: newExpense.selectedPerson && newExpense.foodItem && newExpense.amount ? '#000' : '#666',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: newExpense.selectedPerson && newExpense.foodItem && newExpense.amount ? 'pointer' : 'not-allowed',
                        width: '100%'
                    }}
                    onMouseOver={(e) => {
                        if (newExpense.selectedPerson && newExpense.foodItem && newExpense.amount) {
                            e.target.style.transform = 'scale(1.02)';
                        }
                    }}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                    + Adicionar Gasto
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div style={{ background: 'rgba(255,215,0,0.1)', padding: '20px', borderRadius: '12px', border: '2px solid #ffd700', textAlign: 'center' }}>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '8px' }}>Total Gasto</p>
                    <h3 style={{ color: '#ffd700', fontSize: '1.8rem' }}>€ {totalSpent.toFixed(2)}</h3>
                </div>
                <div style={{ background: 'rgba(144,238,144,0.1)', padding: '20px', borderRadius: '12px', border: '2px solid #90EE90', textAlign: 'center' }}>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '8px' }}>Por Pessoa</p>
                    <h3 style={{ color: '#90EE90', fontSize: '1.8rem' }}>€ {averagePerPerson.toFixed(2)}</h3>
                </div>
            </div>

            {expenses.length > 0 && (
                <>
                    <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '1.2rem' }}>📋 Gastos Registrados</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                        {expenses.map(exp => (
                            <div 
                                key={exp.id}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,215,0,0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                                        {exp.name} {exp.food_item && `• ${exp.food_item}`}
                                    </p>
                                    <p style={{ color: '#ccc', fontSize: '0.85rem' }}>€ {exp.amount.toFixed(2)} • {new Date(exp.created_at).toLocaleDateString('pt-BR')}</p>
                                    {exp.image_url && (
                                        <img 
                                            src={exp.image_url} 
                                            alt="Fatura" 
                                            style={{ maxWidth: '100px', maxHeight: '80px', borderRadius: '6px', marginTop: '8px', cursor: 'pointer', objectFit: 'cover' }}
                                            onClick={() => window.open(exp.image_url)}
                                        />
                                    )}
                                </div>
                                <button
                                    onClick={() => deleteExpense(exp.id)}
                                    style={{
                                        background: 'rgba(255,69,0,0.2)',
                                        border: 'none',
                                        color: '#ff6347',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {isAfterEvent && expenses.length > 0 && (
                <>
                    <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '1.2rem' }}>💸 Quem Deve Pagar/Receber</h3>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '2px solid rgba(144,238,144,0.2)', marginBottom: '30px' }}>
                        {settlements.map(settlement => {
                            const shouldPay = settlement.balance < -0.01;
                            const isBalanced = Math.abs(settlement.balance) < 0.01;
                            const absBalance = Math.abs(settlement.balance);
                            
                            return (
                                <div key={settlement.name} style={{ marginBottom: '12px', padding: '12px', background: shouldPay ? 'rgba(255,69,0,0.1)' : isBalanced ? 'rgba(100,200,100,0.1)' : 'rgba(144,238,144,0.1)', borderRadius: '8px', border: `1px solid ${shouldPay ? '#ff6347' : isBalanced ? '#90EE90' : '#90EE90'}` }}>
                                    <p style={{ color: '#fff', marginBottom: '4px' }}>
                                        <strong>{settlement.name}</strong> - Gastou: € {settlement.spent.toFixed(2)}
                                    </p>
                                    {isBalanced ? (
                                        <p style={{ color: '#90EE90', fontSize: '0.95rem' }}>✅ Equilibrado!</p>
                                    ) : shouldPay ? (
                                        <p style={{ color: '#ff6347', fontSize: '0.95rem' }}>💵 Deve pagar: <strong>€ {absBalance.toFixed(2)}</strong></p>
                                    ) : (
                                        <p style={{ color: '#90EE90', fontSize: '0.95rem' }}>💰 Deve receber: <strong>€ {absBalance.toFixed(2)}</strong></p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '1.2rem' }}>💳 Acertos de Contas</h3>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '2px solid rgba(100,149,237,0.3)' }}>
                        {transfers.length > 0 ? (
                            transfers.map((transfer, idx) => (
                                <div 
                                    key={idx}
                                    style={{
                                        marginBottom: '12px',
                                        padding: '15px',
                                        background: 'rgba(100,149,237,0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(100,149,237,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p style={{ color: '#fff', fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.95rem' }}>
                                            {transfer.from} → {transfer.to}
                                        </p>
                                        <p style={{ color: '#6495ed', margin: '0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            € {transfer.amount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div style={{ fontSize: '2rem' }}>💶</div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#ccc', textAlign: 'center', margin: '0', fontSize: '0.95rem' }}>
                                Nenhuma transferência necessária (tudo equilibrado!)
                            </p>
                        )}
                    </div>
                </>
            )}

            {!isAfterEvent && expenses.length > 0 && (
                <div style={{ background: 'rgba(255,215,0,0.15)', border: '2px solid #ffd700', borderRadius: '12px', padding: '20px', marginBottom: '30px', textAlign: 'center' }}>
                    <p style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>⏰ Em breve...</p>
                    <p style={{ color: '#fff', margin: '0 0 15px 0' }}>Os painéis "Quem Deve Pagar/Receber" e "Acertos de Contas" aparecerão após o evento, no dia 25 de dezembro às 18h.</p>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0' }}>Continue alimentando os dados! 📝</p>
                </div>
            )}
        </div>
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
    const [activeTab, setActiveTab] = useState('amigo-secreto'); // 'amigo-secreto' ou 'calculadora'
    const selectedParticipant = participants.find(p => p.id === selectedId);

    // Prevent scroll when modal is open
    useEffect(() => {
        if (selectedId) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [selectedId]);

    return (
        <div className="container">
            {/* Tab Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', paddingTop: '20px' }}>
                <button
                    onClick={() => setActiveTab('amigo-secreto')}
                    style={{
                        padding: '10px 25px',
                        background: activeTab === 'amigo-secreto' ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : 'rgba(255,255,255,0.1)',
                        color: activeTab === 'amigo-secreto' ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    🎁 Amigo Secreto
                </button>
                <button
                    onClick={() => setActiveTab('calculadora')}
                    style={{
                        padding: '10px 25px',
                        background: activeTab === 'calculadora' ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : 'rgba(255,255,255,0.1)',
                        color: activeTab === 'calculadora' ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    💰 Calculadora
                </button>
            </div>

            {/* Conditional Rendering based on Tab */}
            {activeTab === 'amigo-secreto' ? (
            <div>
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
            </div>
            ) : (
            <ExpenseCalculator />
            )}

            <BackToTop />
            <ChristmasEffects />
        </div>
    );
}
