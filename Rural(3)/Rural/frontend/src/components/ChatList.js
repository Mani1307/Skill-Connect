import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import socket from '../utils/socket';
import './ChatList.css';

const ChatList = ({ onSelectConversation, onCreateNewChat }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConversations();
    setupSocketListeners();

    return () => {
      socket.off('newMessage');
    };
  }, []); // Empty dependency array - only run once on mount

  const setupSocketListeners = () => {
    socket.on('newMessage', (data) => {
      // Refresh conversations to update last message and timestamps
      loadConversations();
    });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat/conversations');
      if (response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getOtherParticipant = (conversation) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || !user.id || !conversation.participants) return null;
    return conversation.participants.find(p => p && p._id && p._id !== user.id);
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    return otherParticipant && otherParticipant.name && otherParticipant.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h3>Messages</h3>
        <button className="new-chat-btn" onClick={onCreateNewChat}>
          + New Chat
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-conversations">
          Loading conversations...
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="no-conversations">
          {searchTerm ? 'No conversations found' : 'No conversations yet'}
        </div>
      ) : (
        <div className="conversations-list">
          {filteredConversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            if (!otherParticipant) return null; // Skip if no other participant
            
            const unreadCount = conversation.unreadCount?.[JSON.parse(localStorage.getItem('user')).id] || 0;

            return (
              <div
                key={conversation._id}
                className="conversation-item"
                onClick={() => onSelectConversation(conversation, otherParticipant)}
              >
                <div className="avatar">
                  {otherParticipant.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="conversation-info">
                  <div className="top-row">
                    <h4>{otherParticipant.name}</h4>
                    <span className="timestamp">{formatTime(conversation.lastMessageTime)}</span>
                  </div>
                  <div className="bottom-row">
                    <p className="last-message">{conversation.lastMessage || 'No messages yet'}</p>
                    {unreadCount > 0 && (
                      <span className="unread-count">{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;