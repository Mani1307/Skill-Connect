import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import './AIChat.css';

const AIChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: inputValue,
        context: {
          userType: 'employer',
          timestamp: new Date().toISOString()
        }
      });

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.reply,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble responding right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "How do I post a job?",
    "How can I find reliable workers?",
    "What should I include in a job description?",
    "How does the payment system work?",
    "How do I rate a worker?"
  ];

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-chat-overlay">
      <div className="ai-chat-modal">
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <span className="ai-icon">🤖</span>
            <h3>AI Assistant</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-chat-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.sender}`}
            >
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai typing-indicator">
              <div className="message-content">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="ai-chat-quick-questions">
          <p className="quick-questions-title">Quick Questions:</p>
          <div className="quick-questions-grid">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-question-btn"
                onClick={() => handleQuickQuestion(question)}
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        
        <div className="ai-chat-input">
          <div className="input-container">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about SkillConnect..."
              disabled={isLoading}
              rows="2"
            />
            <button 
              className="send-btn" 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;