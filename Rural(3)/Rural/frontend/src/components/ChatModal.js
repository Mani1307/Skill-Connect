import React, { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ChatInterface from './ChatInterface';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose }) => {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'chat'
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  
  // Check if there's a pending chat request
  useEffect(() => {
    if (isOpen) {
      const pendingChat = sessionStorage.getItem('pendingChat');
      if (pendingChat) {
        const { conversationId, receiver } = JSON.parse(pendingChat);
        setSelectedConversation({ _id: conversationId });
        setSelectedReceiver(receiver);
        setCurrentView('chat');
        sessionStorage.removeItem('pendingChat');
      }
    } else {
      // Reset state when modal closes
      setCurrentView('list');
      setSelectedConversation(null);
      setSelectedReceiver(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectConversation = (conversation, receiver) => {
    setSelectedConversation(conversation);
    setSelectedReceiver(receiver);
    setCurrentView('chat');
  };

  const handleCreateNewChat = () => {
    // For now, we'll just go to the chat interface
    // In a real implementation, you would search for users to chat with
    setCurrentView('chat');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedConversation(null);
    setSelectedReceiver(null);
  };

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">
        <div className="chat-modal-content">
          {currentView === 'list' ? (
            <ChatList
              onSelectConversation={handleSelectConversation}
              onCreateNewChat={handleCreateNewChat}
            />
          ) : (
            <ChatInterface
              conversationId={selectedConversation?._id}
              receiver={selectedReceiver}
              onClose={onClose}
              onBack={handleBackToList}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatModal;