import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import './AIChat.css';

const AIChatbot = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm your AI assistant for SkillConnect. How can I help you today?", 
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Get AI response
      const response = await api.post('/ai/chat', {
        message: inputMessage,
        context: {
          userType: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).role : 'guest',
          currentPath: window.location.pathname
        }
      });
      
      const aiMessage = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I'm having trouble connecting to the AI service right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  if (!isOpen) {
    return (
      <div className="ai-chatbot-float minimized">
        <button className="ai-chatbot-toggle" onClick={toggleChat}>
          🤖
        </button>
      </div>
    );
  }

  return (
    <div className="ai-chatbot-container">
      <div className="ai-chatbot-header">
        <div className="ai-chatbot-title">
          <span>🤖 AI Assistant</span>
        </div>
        <div className="ai-chatbot-controls">
          <button className="ai-minimize-btn" onClick={toggleChat}>−</button>
          <button className="ai-close-btn" onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className="ai-chatbot-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`ai-message ${message.sender}`}
          >
            <div className="ai-message-bubble">
              <p>{message.text}</p>
              <small className="ai-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </small>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="ai-message ai">
            <div className="ai-message-bubble">
              <div className="ai-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="ai-chatbot-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask me anything about jobs, workers, or the platform..."
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputMessage.trim()}
          className="ai-send-btn"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default AIChatbot;