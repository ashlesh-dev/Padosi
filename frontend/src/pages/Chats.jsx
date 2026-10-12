import { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Chats = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(
    conversationIdParam ? Number(conversationIdParam) : null
  );
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const activeConversationRef = useRef(activeConversationId);
  activeConversationRef.current = activeConversationId;

  // Auto-scroll messages to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Keep query param in sync with active conversation
  useEffect(() => {
    if (conversationIdParam) {
      const parsedId = Number(conversationIdParam);
      if (parsedId !== activeConversationId) {
        setActiveConversationId(parsedId);
      }
    }
  }, [conversationIdParam]);

  // Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
      setError('');
      
      // If none selected on desktop, select the first one if available
      if (!activeConversationRef.current && res.data.length > 0 && window.innerWidth > 768) {
        selectConversation(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
      if (!silent) setError('Could not load conversations. Please try again.');
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  // Initial load + periodic polling for conversations
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // When active conversation changes, load messages and start polling
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    fetchMessages(activeConversationId);

    const interval = setInterval(() => {
      if (activeConversationRef.current === activeConversationId) {
        fetchMessages(activeConversationId, true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeConversationId]);

  const selectConversation = (id) => {
    setActiveConversationId(id);
    setSearchParams({ conversationId: id });
    // Optimistically clear unread on the selected conversation
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConversationId || sending) return;

    setInputText('');
    setSending(true);

    // Optimistic message
    const tempId = Date.now();
    const optimisticMessage = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: user?.id,
      senderName: user?.fullName || 'Me',
      senderAvatarUrl: user?.avatarUrl,
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      isMine: true
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Update conversation list preview optimistically
    setConversations(prev =>
      prev.map(c => c.id === activeConversationId ? {
        ...c,
        lastMessageText: text,
        lastMessageAt: new Date().toISOString()
      } : c)
    );

    try {
      const res = await api.post(`/chat/conversations/${activeConversationId}/messages`, {
        content: text
      });
      // Replace optimistic message with server response
      setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Please try again.');
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredConversations = conversations.filter(c => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const nameMatch = c.otherParticipant?.fullName?.toLowerCase().includes(q);
    const listingMatch = c.listing?.title?.toLowerCase().includes(q);
    const textMatch = c.lastMessageText?.toLowerCase().includes(q);
    return nameMatch || listingMatch || textMatch;
  });

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 4.5rem)',
      backgroundColor: '#fff',
      borderRadius: '1rem',
      border: '1px solid var(--line)',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(16, 41, 70, 0.04)'
    }} className="chats-container">
      <style>{`
        .chats-sidebar {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--line);
          background-color: #fff;
        }
        .chats-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background-color: #fff;
        }
        .chat-list-item:hover {
          background-color: var(--cream);
        }
        .chat-quick-reply:hover {
          background-color: var(--mint) !important;
          color: var(--teal) !important;
          border-color: var(--teal) !important;
        }
        @media (max-width: 768px) {
          .chats-sidebar {
            width: 100% !important;
            display: ${activeConversationId ? 'none' : 'flex'} !important;
            border-right: none !important;
          }
          .chats-main {
            display: ${activeConversationId ? 'flex' : 'none'} !important;
          }
        }
      `}</style>

      {/* ── Left Pane: Conversation List ── */}
      <aside className="chats-sidebar">
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--serif)',
              fontSize: '1.5rem',
              color: 'var(--ink)'
            }}>
              Chats
            </h1>
            <span style={{
              fontSize: '0.8rem',
              color: 'var(--muted)',
              backgroundColor: 'var(--cream)',
              padding: '0.2rem 0.6rem',
              borderRadius: '99px',
              fontWeight: '600'
            }}>
              {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.5,
              fontSize: '0.9rem'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.25rem',
                borderRadius: '99px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--cream)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{
              padding: '1rem',
              margin: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#fce4ec',
              color: '#c62828',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          {loadingConversations ? (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--cream)' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ height: '0.9rem', width: '60%', backgroundColor: 'var(--cream)', borderRadius: '4px' }} />
                    <div style={{ height: '0.75rem', width: '85%', backgroundColor: 'var(--cream)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              color: 'var(--muted)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>💬</span>
              <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: 'var(--ink)' }}>
                {searchFilter ? 'No conversations match your search' : 'No conversations yet'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {searchFilter ? 'Try a different name or keyword.' : 'Message a seller on the Marketplace to start chatting!'}
              </p>
              {!searchFilter && (
                <button
                  onClick={() => navigate('/app/marketplace')}
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: 'var(--teal)',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Browse Marketplace
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              const other = conv.otherParticipant;
              const listing = conv.listing;

              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className="chat-list-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1.25rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f5f3ed',
                    backgroundColor: isActive ? 'var(--mint)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--teal)' : '4px solid transparent',
                    transition: 'background-color 0.15s, border-left 0.15s'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--orange)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1rem',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt={other.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      other?.fullName?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {other?.fullName || 'Neighbor'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {formatTime(conv.lastMessageAt || conv.createdAt)}
                      </span>
                    </div>

                    {/* Listing pill if any */}
                    {listing && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        backgroundColor: isActive ? '#fff' : 'var(--cream)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.72rem',
                        color: 'var(--ink)',
                        maxWidth: '100%',
                        marginBottom: '0.25rem',
                        overflow: 'hidden'
                      }}>
                        <span style={{ fontSize: '0.7rem' }}>🏷️</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {listing.title} • ₹{Number(listing.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Last message text */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: conv.unreadCount > 0 ? 'var(--ink)' : 'var(--muted)',
                        fontWeight: conv.unreadCount > 0 ? '600' : '400',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {conv.lastMessageText || 'Conversation started'}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span style={{
                          backgroundColor: 'var(--orange)',
                          color: '#fff',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.1rem 0.45rem',
                          marginLeft: '0.5rem',
                          flexShrink: 0
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right Pane: Active Chat Conversation ── */}
      <main className="chats-main">
        {activeConversation ? (
          <>
            {/* Header */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fff',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Mobile back button */}
                <button
                  onClick={() => {
                    setActiveConversationId(null);
                    setSearchParams({});
                  }}
                  style={{
                    display: 'none',
                    border: 'none',
                    background: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: 'var(--ink)',
                    padding: '0.25rem'
                  }}
                  className="mobile-back-btn"
                >
                  ←
                </button>
                <style>{`
                  @media (max-width: 768px) {
                    .mobile-back-btn { display: inline-block !important; }
                  }
                `}</style>

                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--orange)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1rem',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {activeConversation.otherParticipant?.avatarUrl ? (
                    <img
                      src={activeConversation.otherParticipant.avatarUrl}
                      alt={activeConversation.otherParticipant.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    activeConversation.otherParticipant?.fullName?.charAt(0).toUpperCase() || '?'
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <Link
                    to={`/app/users/${activeConversation.otherParticipant?.id}`}
                    style={{
                      margin: 0,
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {activeConversation.otherParticipant?.fullName}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    📍 {activeConversation.otherParticipant?.localityName || 'Neighborhood'}
                  </span>
                </div>
              </div>

              {/* View profile button */}
              <Link
                to={`/app/users/${activeConversation.otherParticipant?.id}`}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--cream)',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                View Profile
              </Link>
            </div>

            {/* Marketplace Listing Banner (if attached) */}
            {activeConversation.listing && (
              <div style={{
                backgroundColor: 'var(--cream)',
                borderBottom: '1px solid var(--line)',
                padding: '0.6rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '0.35rem',
                    backgroundColor: '#fff',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {activeConversation.listing.imageUrl ? (
                      <img
                        src={activeConversation.listing.imageUrl}
                        alt={activeConversation.listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.2rem' }}>📦</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {activeConversation.listing.title}
                    </p>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--teal)' }}>
                      {Number(activeConversation.listing.price) === 0
                        ? 'Free'
                        : `₹${Number(activeConversation.listing.price).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/app/marketplace')}
                  style={{
                    border: '1px solid var(--line)',
                    backgroundColor: '#fff',
                    color: 'var(--ink)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Marketplace
                </button>
              </div>
            )}

            {/* Messages Thread */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              backgroundColor: '#fbf9f4',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div style={{
                  margin: 'auto',
                  textAlign: 'center',
                  maxWidth: '380px',
                  padding: '2rem 1rem'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--mint)',
                    color: 'var(--teal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    margin: '0 auto 1rem'
                  }}>
                    ✉️
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--ink)', fontSize: '1.1rem' }}>
                    Say hello to {activeConversation.otherParticipant?.fullName}!
                  </h3>
                  <p style={{ margin: '0 0 1.25rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {activeConversation.listing
                      ? `Inquire about "${activeConversation.listing.title}" or pick a question below:`
                      : 'Send a message to start communicating with your neighbor.'}
                  </p>

                  {/* Quick starter chips */}
                  {activeConversation.listing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        'Hi, is this still available?',
                        'Can we negotiate on the price?',
                        'Where in the neighborhood can we meet for pick-up?',
                        'Can you share a little more detail about this item?'
                      ].map((starter, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(starter)}
                          className="chat-quick-reply"
                          style={{
                            padding: '0.5rem 0.85rem',
                            borderRadius: '99px',
                            border: '1px solid var(--line)',
                            backgroundColor: '#fff',
                            color: 'var(--ink)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s'
                          }}
                        >
                          💬 "{starter}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.isMine;
                  const prevMsg = messages[index - 1];
                  const showDate = !prevMsg ||
                    new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                  return (
                    <div key={msg.id || index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {showDate && (
                        <div style={{
                          alignSelf: 'center',
                          backgroundColor: 'var(--cream)',
                          border: '1px solid var(--line)',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '99px',
                          fontSize: '0.7rem',
                          color: 'var(--muted)',
                          margin: '0.5rem 0'
                        }}>
                          {new Date(msg.createdAt).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          maxWidth: '75%',
                          backgroundColor: isMine ? 'var(--teal)' : '#fff',
                          color: isMine ? '#fff' : 'var(--ink)',
                          padding: '0.65rem 0.95rem',
                          borderRadius: isMine ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                          border: isMine ? 'none' : '1px solid var(--line)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          wordBreak: 'break-word',
                          lineHeight: '1.45'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.25rem',
                            marginTop: '0.25rem'
                          }}>
                            <span style={{
                              fontSize: '0.65rem',
                              opacity: isMine ? 0.8 : 0.6,
                              color: isMine ? '#fff' : 'var(--muted)'
                            }}>
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                {msg.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--line)',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <input
                type="text"
                placeholder="Write a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '99px',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--cream)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: 'var(--ink)'
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || sending}
                style={{
                  backgroundColor: 'var(--teal)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: (!inputText.trim() || sending) ? 'not-allowed' : 'pointer',
                  opacity: (!inputText.trim() || sending) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'opacity 0.15s, transform 0.1s'
                }}
              >
                <span>Send</span>
                <span style={{ fontSize: '1rem' }}>➔</span>
              </button>
            </div>
          </>
        ) : (
          /* Empty selection on desktop */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#faf8f5'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--mint)',
              color: 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1rem'
            }}>
              💬
            </div>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: '1.4rem',
              color: 'var(--ink)',
              margin: '0 0 0.5rem'
            }}>
              Your Neighborhood Chats
            </h2>
            <p style={{
              maxWidth: '360px',
              color: 'var(--muted)',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              margin: '0 0 1.5rem'
            }}>
              Select a conversation from the list, or message a seller on the Marketplace to start chatting.
            </p>
            <button
              onClick={() => navigate('/app/marketplace')}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: 'var(--teal)',
                color: '#fff',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Explore Marketplace
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Chats;
